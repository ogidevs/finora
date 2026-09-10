from typing import Optional
from fastapi import APIRouter, Body, HTTPException, Request, Response, status
from sqlalchemy import or_, select

from app.api.deps import CurrentUserDep, SessionDep
from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_password_hash,
    verify_password,
)
from app.models.user import User
from app.schemas.user import RefreshTokenRequest, Token, UserCreate, UserLogin, UserOut
from app.services.seeder import seed_user_defaults

router = APIRouter()

ACCESS_COOKIE_NAME = "access_token"
REFRESH_COOKIE_NAME = "refresh_token"


def _set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    is_prod = settings.ENVIRONMENT.lower() == "production"
    response.set_cookie(
        key=ACCESS_COOKIE_NAME,
        value=access_token,
        httponly=True,
        secure=is_prod,
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=refresh_token,
        httponly=True,
        secure=is_prod,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path="/",
    )


def _clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(key=ACCESS_COOKIE_NAME, path="/")
    response.delete_cookie(key=REFRESH_COOKIE_NAME, path="/")


@router.post(
    "/register",
    response_model=Token,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
    description="Creates a new user account, seeds default accounts and categories, sets httpOnly JWT cookies, and returns tokens.",
)
async def register(
    user_in: UserCreate,
    response: Response,
    db: SessionDep,
) -> Token:
    result = await db.execute(
        select(User).where(
            or_(User.email == user_in.email, User.username == user_in.username)
        )
    )
    existing_user = result.scalar_one_or_none()
    if existing_user:
        if existing_user.username == user_in.username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username is already taken.",
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already registered.",
        )

    new_user = User(
        username=user_in.username,
        email=user_in.email,
        password_hash=get_password_hash(user_in.password),
        is_active=True,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    await seed_user_defaults(db, new_user.id)

    access_token = create_access_token(subject=new_user.id)
    refresh_token = create_refresh_token(subject=new_user.id)
    _set_auth_cookies(response, access_token, refresh_token)

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=UserOut.model_validate(new_user),
    )


@router.post(
    "/login",
    response_model=Token,
    summary="Authenticate user and issue JWT tokens",
    description="Authenticates user via username or email and password, sets httpOnly cookies, and returns access/refresh tokens.",
)
async def login(
    user_in: UserLogin,
    response: Response,
    db: SessionDep,
) -> Token:
    result = await db.execute(
        select(User).where(
            or_(User.username == user_in.username, User.email == user_in.username)
        )
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(user_in.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive.",
        )

    await seed_user_defaults(db, user.id)

    access_token = create_access_token(subject=user.id)
    refresh_token = create_refresh_token(subject=user.id)
    _set_auth_cookies(response, access_token, refresh_token)

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=UserOut.model_validate(user),
    )


@router.post(
    "/refresh",
    response_model=Token,
    summary="Refresh access token",
    description="Validates the refresh token from httpOnly cookie or request body and issues a new access/refresh token pair.",
)
async def refresh_access_token(
    request: Request,
    response: Response,
    db: SessionDep,
    body: Optional[RefreshTokenRequest] = Body(default=None),
) -> Token:
    token = request.cookies.get(REFRESH_COOKIE_NAME)
    if not token and body and body.refresh_token:
        token = body.refresh_token

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing.",
        )

    payload = decode_token(token, expected_type="refresh")
    if not payload or "sub" not in payload:
        _clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token.",
        )

    try:
        user_id = int(payload["sub"])
    except (ValueError, TypeError):
        _clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload.",
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        _clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive.",
        )

    new_access_token = create_access_token(subject=user.id)
    new_refresh_token = create_refresh_token(subject=user.id)
    _set_auth_cookies(response, new_access_token, new_refresh_token)

    return Token(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        user=UserOut.model_validate(user),
    )


@router.post(
    "/logout",
    status_code=status.HTTP_200_OK,
    summary="Logout user",
    description="Clears the httpOnly authentication cookies.",
)
async def logout(response: Response):
    _clear_auth_cookies(response)
    return {"message": "Successfully logged out."}


@router.get(
    "/me",
    response_model=UserOut,
    summary="Get current authenticated user",
    description="Returns the profile of the currently logged-in user.",
)
async def get_me(current_user: CurrentUserDep) -> UserOut:
    return UserOut.model_validate(current_user)

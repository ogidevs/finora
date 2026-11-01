from typing import List
from fastapi import APIRouter

from app.api.deps import CurrentUserDep, SessionDep
from app.schemas.settings import CurrencyInfo, UserSettingsOut, UserSettingsUpdate
from app.services.currency_service import get_default_rate, get_supported_currencies

router = APIRouter()


@router.get(
    "/currencies",
    response_model=List[CurrencyInfo],
    summary="Get supported currencies",
    description="Returns the list of supported currencies with their default exchange rates relative to EUR.",
)
async def list_currencies() -> List[CurrencyInfo]:
    currencies = get_supported_currencies()
    return [CurrencyInfo(**c) for c in currencies]


@router.get(
    "/",
    response_model=UserSettingsOut,
    summary="Get user currency settings",
    description="Returns the current user's primary currency and exchange rate settings.",
)
async def get_settings(current_user: CurrentUserDep) -> UserSettingsOut:
    return UserSettingsOut.model_validate(current_user)


@router.put(
    "/",
    response_model=UserSettingsOut,
    summary="Update user currency settings",
    description="Updates the current user's primary currency and/or custom exchange rate.",
)
async def update_settings(
    settings_in: UserSettingsUpdate,
    current_user: CurrentUserDep,
    db: SessionDep,
) -> UserSettingsOut:
    if settings_in.primary_currency is not None:
        code = settings_in.primary_currency.upper().strip()
        current_user.primary_currency = code
        if code == "EUR":
            current_user.exchange_rate = Decimal("1.0000")
        elif settings_in.exchange_rate is None:
            current_user.exchange_rate = get_default_rate(code)

    if settings_in.exchange_rate is not None:
        if current_user.primary_currency == "EUR":
            current_user.exchange_rate = Decimal("1.0000")
        else:
            current_user.exchange_rate = settings_in.exchange_rate

    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)

    return UserSettingsOut.model_validate(current_user)

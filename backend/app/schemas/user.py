from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, examples=["johndoe"])
    email: EmailStr = Field(..., examples=["john@example.com"])


class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=100, examples=["strongpassword123"])


class UserLogin(BaseModel):
    username: str = Field(..., description="Username or email", examples=["johndoe"])
    password: str = Field(..., examples=["strongpassword123"])


class UserOut(UserBase):
    id: int
    is_active: bool
    primary_currency: str = "EUR"
    exchange_rate: Decimal = Decimal("1.0000")
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    refresh_token: Optional[str] = None
    user: UserOut


class RefreshTokenRequest(BaseModel):
    refresh_token: Optional[str] = None

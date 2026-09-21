from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class UserSettingsOut(BaseModel):
    id: int
    username: str
    email: str
    primary_currency: str = "EUR"
    exchange_rate: Decimal = Decimal("1.0000")

    model_config = ConfigDict(from_attributes=True)


class UserSettingsUpdate(BaseModel):
    primary_currency: Optional[str] = Field(None, min_length=3, max_length=3)
    exchange_rate: Optional[Decimal] = Field(None, gt=0, decimal_places=4)


class CurrencyInfo(BaseModel):
    code: str
    name: str
    symbol: str
    default_rate: Decimal
    symbol_position: str = "prefix"
    decimals: int = 2


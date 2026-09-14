from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from app.models.enums import AccountType


class AccountBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, examples=["Main Checking"])
    type: AccountType = Field(AccountType.SPENDING, examples=[AccountType.SPENDING])
    initial_balance: Decimal = Field(Decimal("0.00"), decimal_places=2, examples=[500.00])
    color: Optional[str] = Field(None, examples=["#3B82F6"])
    icon: Optional[str] = Field(None, examples=["CreditCard"])


class AccountCreate(AccountBase):
    pass


class AccountUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    type: Optional[AccountType] = None
    initial_balance: Optional[Decimal] = Field(None, decimal_places=2)
    current_balance: Optional[Decimal] = Field(None, decimal_places=2)
    create_correction_transaction: Optional[bool] = False
    color: Optional[str] = None
    icon: Optional[str] = None


class AccountOut(BaseModel):
    id: int
    user_id: int
    name: str
    type: AccountType = AccountType.SPENDING
    initial_balance: Decimal
    current_balance: Decimal = Decimal("0.00")
    currency: str = "EUR"
    color: Optional[str] = None
    icon: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

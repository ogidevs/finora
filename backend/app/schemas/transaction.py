import datetime as dt
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, model_validator
from app.models.enums import (
    AccountType,
    TransactionType,
    CurrencyType,
    SavingsTransferDirection,
    PeriodType,
)


class TransactionBase(BaseModel):
    type: TransactionType = Field(..., examples=[TransactionType.EXPENSE])
    amount: Decimal = Field(..., gt=0, decimal_places=2, examples=[24.50])
    currency: CurrencyType = Field(CurrencyType.EUR, examples=[CurrencyType.EUR])
    exchange_rate: Optional[Decimal] = Field(None, gt=0, decimal_places=4, examples=[117.2000])

    account_id: int = Field(..., description="Source / primary account ID")
    to_account_id: Optional[int] = Field(None, description="Destination account ID for transfers")

    category_id: Optional[int] = Field(None, description="Category or subcategory ID (optional)")

    date: dt.date = Field(..., description="Date of transaction (YYYY-MM-DD)", examples=["2026-09-28"])
    note: Optional[str] = Field(None, max_length=500, description="Optional transaction note", examples=["Maxi supermarket"])
    tag: Optional[str] = Field(None, max_length=50, description="Optional tag", examples=["groceries"])


class TransactionCreate(TransactionBase):
    @model_validator(mode="after")
    def validate_transfer(self):
        if self.type == TransactionType.TRANSFER:
            if not self.to_account_id:
                raise ValueError("Destination account (to_account_id) is required for transfers.")
            if self.account_id == self.to_account_id:
                raise ValueError("Source and destination accounts must be different.")
        return self


class TransactionUpdate(BaseModel):
    type: Optional[TransactionType] = None
    amount: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    currency: Optional[CurrencyType] = None
    exchange_rate: Optional[Decimal] = Field(None, gt=0, decimal_places=4)
    account_id: Optional[int] = None
    to_account_id: Optional[int] = None
    category_id: Optional[int] = None
    date: Optional[dt.date] = None
    note: Optional[str] = Field(None, max_length=500)
    tag: Optional[str] = None


class TransactionBatchUpdate(BaseModel):
    transaction_ids: List[int] = Field(..., min_length=1)
    account_id: Optional[int] = None
    category_id: Optional[int] = None
    clear_category: Optional[bool] = False
    date: Optional[dt.date] = None
    note: Optional[str] = None
    clear_note: Optional[bool] = False
    tag: Optional[str] = None
    clear_tag: Optional[bool] = False


class TransactionBatchUpdateResponse(BaseModel):
    updated_count: int
    message: str


class TransactionBatchDelete(BaseModel):
    transaction_ids: List[int] = Field(..., min_length=1)


class TransactionBatchDeleteResponse(BaseModel):
    deleted_count: int
    message: str


class TransactionOut(TransactionBase):
    id: int
    user_id: int
    amount_base: Decimal
    amount_primary: Decimal
    primary_currency: CurrencyType
    exchange_rate: Decimal
    account_name: str
    account_type: Optional[AccountType] = AccountType.SPENDING
    to_account_name: Optional[str] = None
    to_account_type: Optional[AccountType] = None
    is_savings_transfer: bool = False
    savings_transfer_direction: Optional[SavingsTransferDirection] = None
    category_name: Optional[str] = None
    parent_category_name: Optional[str] = None
    created_at: dt.datetime

    model_config = ConfigDict(from_attributes=True)


class DailyTransactionsGroup(BaseModel):
    date: dt.date
    day_name: str
    formatted_date: str
    primary_currency: CurrencyType
    total_income_primary: Decimal
    total_expense_primary: Decimal
    net_primary: Decimal
    transactions: List[TransactionOut]


class MonthlyTransactionsResponse(BaseModel):
    period: PeriodType = PeriodType.MONTH
    day: Optional[int] = None
    month: int
    year: int
    month_name: str
    period_label: Optional[str] = None
    primary_currency: CurrencyType
    total_income_primary: Decimal
    total_expense_primary: Decimal
    net_primary: Decimal
    transaction_count: int
    days: List[DailyTransactionsGroup]


class TransactionImportResponse(BaseModel):
    message: str
    imported_count: int
    skipped_count: int
    errors: List[str] = []


from enum import Enum


class AccountType(str, Enum):
    SPENDING = "SPENDING"
    SAVINGS = "SAVINGS"


class TransactionType(str, Enum):
    INCOME = "INCOME"
    EXPENSE = "EXPENSE"
    TRANSFER = "TRANSFER"


class CategoryType(str, Enum):
    INCOME = "INCOME"
    EXPENSE = "EXPENSE"


class CurrencyType(str, Enum):
    EUR = "EUR"
    USD = "USD"
    RSD = "RSD"
    GBP = "GBP"
    CHF = "CHF"
    CAD = "CAD"
    AUD = "AUD"
    JPY = "JPY"


class SavingsTransferDirection(str, Enum):
    TO_SAVINGS = "TO_SAVINGS"
    FROM_SAVINGS = "FROM_SAVINGS"


class PeriodType(str, Enum):
    DAY = "day"
    MONTH = "month"
    YEAR = "year"

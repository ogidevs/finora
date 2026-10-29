from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel


class CategoryMoMItem(BaseModel):
    category_name: str
    current_amount: Decimal
    previous_amount: Decimal
    change_pct: float
    share_pct: float


class FinancialFacts(BaseModel):
    period: str
    previous_period: str
    primary_currency: str
    income: Decimal
    expenses: Decimal
    difference: Decimal
    prev_income: Decimal
    prev_expenses: Decimal
    prev_difference: Decimal
    mom_expense_change_pct: float
    mom_income_change_pct: float
    savings_account_balance: Decimal
    savings_net_transfers: Decimal
    top_categories: List[CategoryMoMItem] = []
    category_spikes: List[CategoryMoMItem] = []
    forecast_next_month: Optional[Decimal] = None


class AssistantInsightResponse(BaseModel):
    facts: FinancialFacts
    summary: str
    provider: str
    model: str
    recommendations: List[str] = []


class AssistantChatRequest(BaseModel):
    message: str
    month: Optional[int] = None
    year: Optional[int] = None


class AssistantChatResponse(BaseModel):
    reply: str
    provider: str
    model: str

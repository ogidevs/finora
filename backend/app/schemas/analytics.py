from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel


class SubcategoryStatItem(BaseModel):
    id: int
    name: str
    total_amount_primary: Decimal
    percentage: float
    transaction_count: int


class CategoryStatItem(BaseModel):
    category_id: int
    category_name: str
    type: str
    color: Optional[str] = None
    icon: Optional[str] = None
    total_amount_primary: Decimal
    percentage: float
    transaction_count: int
    subcategories: List[SubcategoryStatItem] = []


class CategoryAnalyticsResponse(BaseModel):
    period: str
    day: Optional[int] = None
    month: Optional[int] = None
    year: int
    period_label: Optional[str] = None
    primary_currency: str
    total_expense_primary: Decimal
    total_income_primary: Decimal
    net_difference_primary: Decimal
    total_savings_primary: Decimal = Decimal("0.00")
    net_savings_primary: Optional[Decimal] = None
    savings_rate: Optional[float] = None
    categories: List[CategoryStatItem]


class MonthlyTrendItem(BaseModel):
    year: int
    month: int
    month_label: str
    income_primary: Decimal
    expense_primary: Decimal
    difference_primary: Decimal
    net_primary: Optional[Decimal] = None
    savings_rate: Optional[float] = None


class AnalyticsTrendsResponse(BaseModel):
    primary_currency: str
    trends: List[MonthlyTrendItem]
    average_monthly_expense: Decimal
    average_monthly_income: Decimal
    highest_expense_month: Optional[str] = None
    lowest_expense_month: Optional[str] = None


class ForecastModelResult(BaseModel):
    model_name: str
    next_month_projected: Decimal
    lower_bound: Decimal
    upper_bound: Decimal
    methodology: str


class ForecastPoint(BaseModel):
    date: str
    month_label: str
    actual: Optional[Decimal] = None
    prophet_projected: Optional[Decimal] = None
    prophet_lower: Optional[Decimal] = None
    prophet_upper: Optional[Decimal] = None
    arima_projected: Optional[Decimal] = None
    arima_lower: Optional[Decimal] = None
    arima_upper: Optional[Decimal] = None


class ForecastResponse(BaseModel):
    eligible: bool
    historical_months_count: int
    min_required_months: int = 6
    message: str
    primary_currency: str
    next_month_label: Optional[str] = None
    recommended_projection: Optional[Decimal] = None
    recommended_lower: Optional[Decimal] = None
    recommended_upper: Optional[Decimal] = None
    prophet: Optional[ForecastModelResult] = None
    arima: Optional[ForecastModelResult] = None
    points: List[ForecastPoint] = []

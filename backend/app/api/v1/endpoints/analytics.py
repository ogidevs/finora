import calendar
from collections import defaultdict
from datetime import date
from decimal import Decimal
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Query
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUserDep, SessionDep
from app.models.account import Account
from app.models.category import Category
from app.models.enums import AccountType, TransactionType, PeriodType
from app.models.transaction import Transaction
from app.schemas.analytics import (
    CategoryAnalyticsResponse,
    CategoryStatItem,
    SubcategoryStatItem,
    AnalyticsTrendsResponse,
    MonthlyTrendItem,
    ForecastResponse,
)
from app.services.forecasting import calculate_time_series_forecast

from app.services.currency_service import (
    base_to_primary,
    to_primary_currency,
)

router = APIRouter()


@router.get(
    "/summary",
    response_model=CategoryAnalyticsResponse,
    summary="Get spending and income statistics per category",
)
async def get_analytics_summary(
    current_user: CurrentUserDep,
    db: SessionDep,
    period: PeriodType = Query(PeriodType.MONTH),
    day: Optional[int] = Query(None, ge=1, le=31),
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2000, le=2100),
) -> CategoryAnalyticsResponse:
    today = date.today()
    target_year = year or today.year
    primary_cur = current_user.primary_currency
    rate = current_user.exchange_rate

    if period == "day":
        target_month = month or today.month
        target_day = day or today.day
        start_date = date(target_year, target_month, target_day)
        end_date = date(target_year, target_month, target_day)
        period_label = f"{target_day}. {calendar.month_name[target_month]} {target_year}"
    elif period == "year":
        target_day = None
        target_month = None
        start_date = date(target_year, 1, 1)
        end_date = date(target_year, 12, 31)
        period_label = f"{target_year}"
    else:
        target_day = None
        target_month = month or today.month
        start_date = date(target_year, target_month, 1)
        last_day = calendar.monthrange(target_year, target_month)[1]
        end_date = date(target_year, target_month, last_day)
        period_label = f"{calendar.month_name[target_month]} {target_year}"

    query = (
        select(Transaction)
        .options(
            selectinload(Transaction.account),
            selectinload(Transaction.to_account),
            selectinload(Transaction.category).selectinload(Category.parent)
        )
        .where(
            Transaction.user_id == current_user.id,
            Transaction.date >= start_date,
            Transaction.date <= end_date,
        )
    )
    transactions = (await db.execute(query)).scalars().all()

    total_expense_primary = Decimal("0.00")
    total_income_primary = Decimal("0.00")

    cat_buckets = defaultdict(lambda: {
        "id": 0,
        "name": "Uncategorized",
        "type": "EXPENSE",
        "color": "#64748B",
        "icon": "Folder",
        "primary": Decimal("0.00"),
        "count": 0,
        "subs": defaultdict(lambda: {"id": 0, "name": "", "primary": Decimal("0.00"), "count": 0}),
    })

    for tx in transactions:
        acc_type = tx.account.type if tx.account else AccountType.SPENDING
        to_acc_type = tx.to_account.type if tx.to_account else None

        eff_type = None
        is_savings_transfer = False

        if tx.type == TransactionType.TRANSFER:
            if acc_type != AccountType.SAVINGS and to_acc_type == AccountType.SAVINGS:
                eff_type = TransactionType.EXPENSE
                is_savings_transfer = True
            elif acc_type == AccountType.SAVINGS and to_acc_type != AccountType.SAVINGS:
                eff_type = TransactionType.INCOME
                is_savings_transfer = True
            else:
                continue
        elif tx.type == TransactionType.INCOME:
            if acc_type == AccountType.SAVINGS:
                continue
            eff_type = TransactionType.INCOME
        elif tx.type == TransactionType.EXPENSE:
            if acc_type == AccountType.SAVINGS:
                continue
            eff_type = TransactionType.EXPENSE
        else:
            continue

        tx_primary = to_primary_currency(tx.amount, tx.currency, primary_cur, tx.exchange_rate or rate)
        if eff_type == "EXPENSE":
            total_expense_primary += tx_primary
        else:
            total_income_primary += tx_primary

        if is_savings_transfer:
            if eff_type == "EXPENSE":
                parent_id = -100
                parent_name = "Savings & Investments"
                parent_type = "EXPENSE"
                parent_color = "#8B5CF6"
                parent_icon = "PiggyBank"
                sub_id = -1000 - (tx.to_account_id or 0)
                sub_name = tx.to_account.name if tx.to_account else "Savings Account"
            else:
                parent_id = -101
                parent_name = "Savings Withdrawal"
                parent_type = "INCOME"
                parent_color = "#8B5CF6"
                parent_icon = "PiggyBank"
                sub_id = -2000 - (tx.account_id or 0)
                sub_name = tx.account.name if tx.account else "Savings Account"
        else:
            cat = tx.category
            if cat:
                if cat.parent:
                    parent_id = cat.parent.id
                    parent_name = cat.parent.name
                    parent_type = cat.parent.type
                    parent_color = cat.parent.color
                    parent_icon = cat.parent.icon
                    sub_id = cat.id
                    sub_name = cat.name
                else:
                    parent_id = cat.id
                    parent_name = cat.name
                    parent_type = cat.type
                    parent_color = cat.color
                    parent_icon = cat.icon
                    sub_id = None
                    sub_name = None
            else:
                parent_id = -1
                parent_name = "Uncategorized"
                parent_type = eff_type
                parent_color = "#64748B"
                parent_icon = "Folder"
                sub_id = None
                sub_name = None

        bucket = cat_buckets[parent_id]
        bucket["id"] = parent_id
        bucket["name"] = parent_name
        bucket["type"] = parent_type
        if parent_color:
            bucket["color"] = parent_color
        if parent_icon:
            bucket["icon"] = parent_icon
        bucket["primary"] += tx_primary
        bucket["count"] += 1

        if sub_id:
            s_bucket = bucket["subs"][sub_id]
            s_bucket["id"] = sub_id
            s_bucket["name"] = sub_name
            s_bucket["primary"] += tx_primary
            s_bucket["count"] += 1

    net_difference_primary = total_income_primary - total_expense_primary

    acc_q = select(Account).where(Account.user_id == current_user.id, Account.type == AccountType.SAVINGS)
    savings_accs = (await db.execute(acc_q)).scalars().all()
    total_savings_primary = Decimal("0.00")

    for s_acc in savings_accs:
        inc_q = select(func.coalesce(func.sum(Transaction.amount_base), Decimal("0.00"))).where(
            Transaction.user_id == current_user.id,
            Transaction.account_id == s_acc.id,
            Transaction.type == "INCOME",
        )
        inc_b = (await db.execute(inc_q)).scalar() or Decimal("0.00")

        exp_q = select(func.coalesce(func.sum(Transaction.amount_base), Decimal("0.00"))).where(
            Transaction.user_id == current_user.id,
            Transaction.account_id == s_acc.id,
            Transaction.type == "EXPENSE",
        )
        exp_b = (await db.execute(exp_q)).scalar() or Decimal("0.00")

        out_q = select(func.coalesce(func.sum(Transaction.amount_base), Decimal("0.00"))).where(
            Transaction.user_id == current_user.id,
            Transaction.account_id == s_acc.id,
            Transaction.type == "TRANSFER",
        )
        out_b = (await db.execute(out_q)).scalar() or Decimal("0.00")

        in_q = select(func.coalesce(func.sum(Transaction.amount_base), Decimal("0.00"))).where(
            Transaction.user_id == current_user.id,
            Transaction.to_account_id == s_acc.id,
            Transaction.type == "TRANSFER",
        )
        in_b = (await db.execute(in_q)).scalar() or Decimal("0.00")

        bal_base = s_acc.initial_balance + inc_b - exp_b - out_b + in_b
        total_savings_primary += base_to_primary(bal_base, primary_cur, rate)

    stat_items = []
    for p_id, b in cat_buckets.items():
        base_cat_total = total_expense_primary if b["type"] == "EXPENSE" else total_income_primary
        pct = float((b["primary"] / base_cat_total) * 100) if base_cat_total > 0 else 0.0

        cat_prim = b["primary"]

        sub_list = []
        for s in b["subs"].values():
            s_prim = s["primary"]
            s_pct = float((s["primary"] / b["primary"]) * 100) if b["primary"] > 0 else 0.0
            sub_list.append(
                SubcategoryStatItem(
                    id=s["id"],
                    name=s["name"],
                    total_amount_primary=s_prim,
                    percentage=round(s_pct, 1),
                    transaction_count=s["count"]
                )
            )
        sub_list.sort(key=lambda x: x.total_amount_primary, reverse=True)

        stat_items.append(
            CategoryStatItem(
                category_id=b["id"],
                category_name=b["name"],
                type=b["type"],
                color=b.get("color"),
                icon=b.get("icon"),
                total_amount_primary=cat_prim,
                percentage=round(pct, 1),
                transaction_count=b["count"],
                subcategories=sub_list
            )
        )

    stat_items.sort(key=lambda x: x.total_amount_primary, reverse=True)

    return CategoryAnalyticsResponse(
        period=period,
        day=target_day,
        month=target_month,
        year=target_year,
        period_label=period_label,
        primary_currency=primary_cur,
        total_expense_primary=total_expense_primary,
        total_income_primary=total_income_primary,
        net_difference_primary=net_difference_primary,
        total_savings_primary=total_savings_primary,
        net_savings_primary=net_difference_primary,
        savings_rate=0.0,
        categories=stat_items,
    )


@router.get(
    "/trends",
    response_model=AnalyticsTrendsResponse,
    summary="Get multi-month spending and income trends",
)
async def get_analytics_trends(
    current_user: CurrentUserDep,
    db: SessionDep,
    months_limit: int = Query(12, ge=3, le=24),
) -> AnalyticsTrendsResponse:
    primary_cur = current_user.primary_currency
    rate = current_user.exchange_rate

    query = (
        select(Transaction)
        .options(
            selectinload(Transaction.account),
            selectinload(Transaction.to_account),
        )
        .where(Transaction.user_id == current_user.id)
        .order_by(Transaction.date.asc())
    )
    transactions = (await db.execute(query)).scalars().all()

    monthly_map = defaultdict(lambda: {"income": Decimal("0.00"), "expense": Decimal("0.00")})

    for tx in transactions:
        acc_type = tx.account.type if tx.account else AccountType.SPENDING
        to_acc_type = tx.to_account.type if tx.to_account else None

        eff_type = None

        if tx.type == TransactionType.TRANSFER:
            if acc_type != AccountType.SAVINGS and to_acc_type == AccountType.SAVINGS:
                eff_type = TransactionType.EXPENSE
            elif acc_type == AccountType.SAVINGS and to_acc_type != AccountType.SAVINGS:
                eff_type = TransactionType.INCOME
            else:
                continue
        elif tx.type == TransactionType.INCOME:
            if acc_type == AccountType.SAVINGS:
                continue
            eff_type = TransactionType.INCOME
        elif tx.type == TransactionType.EXPENSE:
            if acc_type == AccountType.SAVINGS:
                continue
            eff_type = TransactionType.EXPENSE
        else:
            continue

        tx_primary = to_primary_currency(tx.amount, tx.currency, primary_cur, tx.exchange_rate or rate)
        key = (tx.date.year, tx.date.month)
        if eff_type == "EXPENSE":
            monthly_map[key]["expense"] += tx_primary
        else:
            monthly_map[key]["income"] += tx_primary

    sorted_keys = sorted(monthly_map.keys())
    if len(sorted_keys) > months_limit:
        sorted_keys = sorted_keys[-months_limit:]

    trends: List[MonthlyTrendItem] = []
    total_exp_sum = Decimal("0.00")
    total_inc_sum = Decimal("0.00")
    highest_exp = Decimal("-1.00")
    highest_exp_month = None
    lowest_exp = Decimal("999999999.00")
    lowest_exp_month = None

    for (yr, mo) in sorted_keys:
        data = monthly_map[(yr, mo)]
        inc = data["income"]
        exp = data["expense"]
        diff = inc - exp
        label = f"{calendar.month_abbr[mo]} {yr}"

        trends.append(
            MonthlyTrendItem(
                year=yr,
                month=mo,
                month_label=label,
                income_primary=inc,
                expense_primary=exp,
                difference_primary=diff,
                net_primary=diff,
            )
        )

        total_exp_sum += exp
        total_inc_sum += inc

        if exp > highest_exp:
            highest_exp = exp
            highest_exp_month = label
        if exp < lowest_exp:
            lowest_exp = exp
            lowest_exp_month = label

    count = len(trends) or 1
    avg_exp = round(total_exp_sum / count, 2)
    avg_inc = round(total_inc_sum / count, 2)

    return AnalyticsTrendsResponse(
        primary_currency=primary_cur,
        trends=trends,
        average_monthly_expense=avg_exp,
        average_monthly_income=avg_inc,
        highest_expense_month=highest_exp_month,
        lowest_expense_month=lowest_exp_month,
    )


@router.get(
    "/forecast",
    response_model=ForecastResponse,
    summary="Get time-series forecast for upcoming monthly expenditures",
)
async def get_analytics_forecast(
    current_user: CurrentUserDep,
    db: SessionDep,
) -> ForecastResponse:
    primary_cur = current_user.primary_currency
    rate = current_user.exchange_rate

    query = (
        select(Transaction)
        .options(
            selectinload(Transaction.account),
            selectinload(Transaction.to_account),
        )
        .where(Transaction.user_id == current_user.id)
        .order_by(Transaction.date.asc())
    )
    transactions = (await db.execute(query)).scalars().all()

    monthly_expense_map = defaultdict(lambda: Decimal("0.00"))

    for tx in transactions:
        acc_type = tx.account.type if tx.account else AccountType.SPENDING
        to_acc_type = tx.to_account.type if tx.to_account else None

        eff_type = None

        if tx.type == TransactionType.TRANSFER:
            if acc_type != AccountType.SAVINGS and to_acc_type == AccountType.SAVINGS:
                eff_type = TransactionType.EXPENSE
            else:
                continue
        elif tx.type == TransactionType.EXPENSE:
            if acc_type == AccountType.SAVINGS:
                continue
            eff_type = TransactionType.EXPENSE
        else:
            continue

        if eff_type == "EXPENSE":
            tx_primary = to_primary_currency(tx.amount, tx.currency, primary_cur, tx.exchange_rate or rate)
            key = (tx.date.year, tx.date.month)
            monthly_expense_map[key] += tx_primary

    sorted_keys = sorted(monthly_expense_map.keys())
    monthly_data: List[Dict[str, Any]] = []

    for (yr, mo) in sorted_keys:
        d = date(yr, mo, 1)
        label = f"{calendar.month_abbr[mo]} {yr}"
        monthly_data.append({
            "date": d,
            "month_label": label,
            "amount": float(monthly_expense_map[(yr, mo)]),
        })

    return await calculate_time_series_forecast(
        monthly_data=monthly_data,
        primary_currency=primary_cur,
    )
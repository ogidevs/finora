import calendar
import datetime as dt
from collections import defaultdict
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.account import Account
from app.models.enums import AccountType, SavingsTransferDirection, TransactionType
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.transaction import TransactionOut
from app.services.currency_service import to_primary_currency


async def calculate_account_balance_base(
    db: AsyncSession,
    user_id: int,
    account: Account,
) -> Decimal:
    inc_res = await db.execute(
        select(func.coalesce(func.sum(Transaction.amount_base), 0)).where(
            Transaction.user_id == user_id,
            Transaction.account_id == account.id,
            Transaction.type == TransactionType.INCOME,
        )
    )
    income_sum = Decimal(str(inc_res.scalar() or 0))

    exp_res = await db.execute(
        select(func.coalesce(func.sum(Transaction.amount_base), 0)).where(
            Transaction.user_id == user_id,
            Transaction.account_id == account.id,
            Transaction.type == TransactionType.EXPENSE,
        )
    )
    expense_sum = Decimal(str(exp_res.scalar() or 0))

    trans_out_res = await db.execute(
        select(func.coalesce(func.sum(Transaction.amount_base), 0)).where(
            Transaction.user_id == user_id,
            Transaction.account_id == account.id,
            Transaction.type == TransactionType.TRANSFER,
        )
    )
    transfer_out_sum = Decimal(str(trans_out_res.scalar() or 0))

    trans_in_res = await db.execute(
        select(func.coalesce(func.sum(Transaction.amount_base), 0)).where(
            Transaction.user_id == user_id,
            Transaction.to_account_id == account.id,
            Transaction.type == TransactionType.TRANSFER,
        )
    )
    transfer_in_sum = Decimal(str(trans_in_res.scalar() or 0))

    return (
        Decimal(str(account.initial_balance))
        + income_sum
        - expense_sum
        - transfer_out_sum
        + transfer_in_sum
    )


def classify_savings_transfer(
    tx_type: str,
    acc_type: Optional[str],
    to_acc_type: Optional[str],
) -> Tuple[bool, Optional[SavingsTransferDirection]]:
    if tx_type != TransactionType.TRANSFER:
        return False, None

    if acc_type != AccountType.SAVINGS and to_acc_type == AccountType.SAVINGS:
        return True, SavingsTransferDirection.TO_SAVINGS

    if acc_type == AccountType.SAVINGS and to_acc_type != AccountType.SAVINGS:
        return True, SavingsTransferDirection.FROM_SAVINGS

    return False, None


def resolve_cashflow_kind(
    tx_type: str,
    acc_type: Optional[str],
    to_acc_type: Optional[str],
) -> Optional[TransactionType]:
    if tx_type == TransactionType.INCOME:
        return TransactionType.INCOME
    if tx_type == TransactionType.EXPENSE:
        return TransactionType.EXPENSE

    is_savings, direction = classify_savings_transfer(tx_type, acc_type, to_acc_type)
    if is_savings:
        if direction == SavingsTransferDirection.TO_SAVINGS:
            return TransactionType.EXPENSE
        if direction == SavingsTransferDirection.FROM_SAVINGS:
            return TransactionType.INCOME

    return None


def build_transaction_out(tx: Transaction, user: User) -> TransactionOut:
    amount_primary = to_primary_currency(
        tx.amount,
        tx.currency,
        user.primary_currency,
        tx.exchange_rate,
        user.exchange_rate,
    )
    cat_name = tx.category.name if tx.category else None
    parent_cat_name = (
        tx.category.parent.name if tx.category and tx.category.parent else None
    )

    acc_type = tx.account.type if tx.account else AccountType.SPENDING
    to_acc_type = tx.to_account.type if tx.to_account else None
    is_savings_transfer, savings_transfer_direction = classify_savings_transfer(
        tx.type, acc_type, to_acc_type
    )

    return TransactionOut(
        id=tx.id,
        user_id=tx.user_id,
        type=tx.type,
        amount=tx.amount,
        currency=tx.currency,
        exchange_rate=tx.exchange_rate,
        amount_base=tx.amount_base,
        amount_primary=amount_primary,
        primary_currency=user.primary_currency,
        account_id=tx.account_id,
        account_name=tx.account.name if tx.account else "Unknown",
        account_type=acc_type,
        to_account_id=tx.to_account_id,
        to_account_name=tx.to_account.name if tx.to_account else None,
        to_account_type=to_acc_type,
        is_savings_transfer=is_savings_transfer,
        savings_transfer_direction=savings_transfer_direction,
        category_id=tx.category_id,
        category_name=cat_name,
        parent_category_name=parent_cat_name,
        date=tx.date,
        note=tx.note,
        tag=tx.tag,
        created_at=tx.created_at,
    )


async def get_monthly_expense_series(
    db: AsyncSession,
    user: User,
) -> List[Dict[str, Any]]:
    primary_cur = user.primary_currency
    rate = user.exchange_rate

    query = (
        select(Transaction)
        .options(
            selectinload(Transaction.account),
            selectinload(Transaction.to_account),
        )
        .where(
            Transaction.user_id == user.id,
            Transaction.type.in_([TransactionType.EXPENSE, TransactionType.TRANSFER]),
        )
        .order_by(Transaction.date.asc())
    )
    res = await db.execute(query)
    transactions = res.scalars().all()

    monthly_totals: Dict[Tuple[int, int], Decimal] = defaultdict(lambda: Decimal("0.00"))

    for tx in transactions:
        acc_type = tx.account.type if tx.account else AccountType.SPENDING
        to_acc_type = tx.to_account.type if tx.to_account else None
        if resolve_cashflow_kind(tx.type, acc_type, to_acc_type) != TransactionType.EXPENSE:
            continue

        amt = to_primary_currency(
            tx.amount,
            tx.currency,
            primary_cur,
            tx.exchange_rate,
            rate,
        )
        monthly_totals[(tx.date.year, tx.date.month)] += amt

    sorted_months = sorted(monthly_totals.keys())
    return [
        {
            "date": dt.date(yr, mo, 1),
            "month_label": f"{calendar.month_abbr[mo]} {yr}",
            "amount": monthly_totals[(yr, mo)],
        }
        for yr, mo in sorted_months
    ]


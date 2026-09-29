import calendar
import csv
import datetime as dt
import io
import json
from collections import defaultdict
from decimal import Decimal, InvalidOperation
from typing import Dict, List, Optional

from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy import delete, func, select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUserDep, SessionDep
from app.models.account import Account
from app.models.category import Category
from app.models.enums import AccountType, CategoryType, TransactionType
from app.models.transaction import Transaction
from app.schemas.transaction import (
    DailyTransactionsGroup,
    MonthlyTransactionsResponse,
    TransactionBatchUpdate,
    TransactionBatchUpdateResponse,
    TransactionCreate,
    TransactionImportResponse,
    TransactionOut,
    TransactionUpdate,
)
from app.services.currency_service import get_default_rate, to_base_currency
from app.services.ledger_service import (
    build_transaction_out,
    resolve_cashflow_kind,
)

router = APIRouter()


async def _load_transaction_with_relations(db: SessionDep, tx_id: int) -> Transaction:
    query = (
        select(Transaction)
        .options(
            selectinload(Transaction.account),
            selectinload(Transaction.to_account),
            selectinload(Transaction.category).selectinload(Category.parent),
        )
        .where(Transaction.id == tx_id)
    )
    return (await db.execute(query)).scalar_one()


@router.get(
    "/",
    response_model=MonthlyTransactionsResponse,
    summary="List transactions for a day, month, or year",
    description="Returns transactions grouped by day for the specified period, including converted amounts in the user's primary currency.",
)
async def list_transactions(
    current_user: CurrentUserDep,
    db: SessionDep,
    period: str = Query("month", description="Period type: 'day', 'month', or 'year'"),
    day: Optional[int] = Query(None, ge=1, le=31, description="Day of month (for period='day')"),
    month: Optional[int] = Query(None, ge=1, le=12, description="Month (1-12)"),
    year: Optional[int] = Query(None, ge=1900, le=2200, description="Year (e.g., 2026)"),
    account_id: Optional[int] = Query(None, description="Filter by account ID"),
    type: Optional[str] = Query(None, description="Filter by transaction type (INCOME, EXPENSE, TRANSFER)"),
    tag: Optional[str] = Query(None, description="Filter by tag"),
) -> MonthlyTransactionsResponse:
    today = dt.date.today()
    target_year = year or today.year
    target_month = month or today.month
    period_lower = period.lower().strip()

    if period_lower == "day":
        target_day = day or today.day
        max_days = calendar.monthrange(target_year, target_month)[1]
        safe_day = min(target_day, max_days)
        start_date = dt.date(target_year, target_month, safe_day)
        end_date = start_date
        period_label = start_date.strftime("%d %B %Y")
    elif period_lower == "year":
        start_date = dt.date(target_year, 1, 1)
        end_date = dt.date(target_year, 12, 31)
        period_label = f"{target_year}"
    else:
        period_lower = "month"
        max_days = calendar.monthrange(target_year, target_month)[1]
        start_date = dt.date(target_year, target_month, 1)
        end_date = dt.date(target_year, target_month, max_days)
        period_label = f"{calendar.month_name[target_month]} {target_year}"

    query = (
        select(Transaction)
        .options(
            selectinload(Transaction.account),
            selectinload(Transaction.to_account),
            selectinload(Transaction.category).selectinload(Category.parent),
        )
        .where(
            Transaction.user_id == current_user.id,
            Transaction.date >= start_date,
            Transaction.date <= end_date,
        )
    )

    if account_id is not None:
        query = query.where(
            (Transaction.account_id == account_id) | (Transaction.to_account_id == account_id)
        )

    if type is not None:
        query = query.where(Transaction.type == type.upper())

    if tag is not None and tag.strip():
        query = query.where(func.lower(Transaction.tag) == tag.strip().lower())

    query = query.order_by(Transaction.date.desc(), Transaction.id.desc())
    result = await db.execute(query)
    transactions = result.scalars().all()

    primary_cur = current_user.primary_currency
    daily_map: Dict[dt.date, List[TransactionOut]] = defaultdict(list)
    daily_income: Dict[dt.date, Decimal] = defaultdict(lambda: Decimal("0.00"))
    daily_expense: Dict[dt.date, Decimal] = defaultdict(lambda: Decimal("0.00"))

    total_income_primary = Decimal("0.00")
    total_expense_primary = Decimal("0.00")

    for tx in transactions:
        tx_out = build_transaction_out(tx, current_user)
        daily_map[tx.date].append(tx_out)

        cashflow_kind = resolve_cashflow_kind(
            tx.type, tx_out.account_type, tx_out.to_account_type
        )
        if cashflow_kind == TransactionType.INCOME:
            daily_income[tx.date] += tx_out.amount_primary
            total_income_primary += tx_out.amount_primary
        elif cashflow_kind == TransactionType.EXPENSE:
            daily_expense[tx.date] += tx_out.amount_primary
            total_expense_primary += tx_out.amount_primary

    sorted_dates = sorted(daily_map.keys(), reverse=True)
    day_groups: List[DailyTransactionsGroup] = []

    for d in sorted_dates:
        inc = daily_income[d]
        exp = daily_expense[d]
        net = inc - exp
        day_groups.append(
            DailyTransactionsGroup(
                date=d,
                day_name=d.strftime("%A"),
                formatted_date=d.strftime("%d.%m.%Y"),
                primary_currency=primary_cur,
                total_income_primary=inc,
                total_expense_primary=exp,
                net_primary=net,
                transactions=daily_map[d],
            )
        )

    return MonthlyTransactionsResponse(
        period=period_lower,
        day=day if period_lower == "day" else None,
        month=target_month,
        year=target_year,
        month_name=calendar.month_name[target_month],
        period_label=period_label,
        primary_currency=primary_cur,
        total_income_primary=total_income_primary,
        total_expense_primary=total_expense_primary,
        net_primary=total_income_primary - total_expense_primary,
        transaction_count=len(transactions),
        days=day_groups,
    )


@router.get(
    "/count",
    summary="Count total transactions for current user",
    description="Returns the total number of transactions recorded by the current user across all dates.",
)
async def count_transactions(
    current_user: CurrentUserDep,
    db: SessionDep,
):
    res = await db.execute(
        select(func.count(Transaction.id)).where(Transaction.user_id == current_user.id)
    )
    count = res.scalar() or 0
    return {"count": count}


@router.post(
    "/",
    response_model=TransactionOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new transaction",
    description="Records a new income, expense, or transfer transaction.",
)
async def create_transaction(
    tx_in: TransactionCreate,
    current_user: CurrentUserDep,
    db: SessionDep,
) -> TransactionOut:
    acc_res = await db.execute(
        select(Account).where(
            Account.id == tx_in.account_id,
            Account.user_id == current_user.id,
        )
    )
    account = acc_res.scalar_one_or_none()
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Selected account not found.",
        )

    if tx_in.type == TransactionType.TRANSFER:
        if not tx_in.to_account_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Destination account is required for transfers.",
            )
        to_acc_res = await db.execute(
            select(Account).where(
                Account.id == tx_in.to_account_id,
                Account.user_id == current_user.id,
            )
        )
        to_account = to_acc_res.scalar_one_or_none()
        if not to_account:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Destination account not found.",
            )

    category = None
    if tx_in.category_id and tx_in.type != TransactionType.TRANSFER:
        cat_res = await db.execute(
            select(Category)
            .options(selectinload(Category.parent))
            .where(
                Category.id == tx_in.category_id,
                Category.user_id == current_user.id,
            )
        )
        category = cat_res.scalar_one_or_none()
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Selected category not found.",
            )

    curr = tx_in.currency.upper()
    if tx_in.exchange_rate and tx_in.exchange_rate > 0:
        rate = tx_in.exchange_rate
    elif curr == current_user.primary_currency:
        rate = current_user.exchange_rate
    else:
        rate = get_default_rate(curr)

    amount_base = to_base_currency(tx_in.amount, curr, rate)

    new_tx = Transaction(
        user_id=current_user.id,
        account_id=account.id,
        to_account_id=tx_in.to_account_id if tx_in.type == TransactionType.TRANSFER else None,
        category_id=category.id if category else None,
        type=tx_in.type,
        amount=tx_in.amount,
        currency=curr,
        exchange_rate=rate,
        amount_base=amount_base,
        date=tx_in.date,
        note=tx_in.note.strip() if tx_in.note else None,
        tag=tx_in.tag.strip() if tx_in.tag else None,
    )

    db.add(new_tx)
    await db.commit()

    fresh_tx = await _load_transaction_with_relations(db, new_tx.id)
    return build_transaction_out(fresh_tx, current_user)


@router.patch(
    "/batch",
    response_model=TransactionBatchUpdateResponse,
    summary="Batch update multiple transactions",
    description="Updates account, category, date, note, or tag across a list of selected transaction IDs.",
)
async def batch_update_transactions(
    batch_in: TransactionBatchUpdate,
    current_user: CurrentUserDep,
    db: SessionDep,
) -> TransactionBatchUpdateResponse:
    if not batch_in.transaction_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No transaction IDs provided.",
        )

    if batch_in.account_id is not None:
        acc_res = await db.execute(
            select(Account).where(
                Account.id == batch_in.account_id,
                Account.user_id == current_user.id,
            )
        )
        if not acc_res.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Target account not found.",
            )

    if batch_in.category_id is not None and not batch_in.clear_category:
        cat_res = await db.execute(
            select(Category).where(
                Category.id == batch_in.category_id,
                Category.user_id == current_user.id,
            )
        )
        if not cat_res.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Target category not found.",
            )

    query = select(Transaction).where(
        Transaction.id.in_(batch_in.transaction_ids),
        Transaction.user_id == current_user.id,
    )
    res = await db.execute(query)
    tx_list = res.scalars().all()

    updated_count = 0
    for tx in tx_list:
        if batch_in.account_id is not None:
            if tx.type == TransactionType.TRANSFER and tx.to_account_id == batch_in.account_id:
                continue
            tx.account_id = batch_in.account_id

        if batch_in.clear_category:
            tx.category_id = None
        elif batch_in.category_id is not None and tx.type != TransactionType.TRANSFER:
            tx.category_id = batch_in.category_id

        if batch_in.date is not None:
            tx.date = batch_in.date

        if batch_in.clear_note:
            tx.note = None
        elif batch_in.note is not None:
            tx.note = batch_in.note.strip() or None

        if batch_in.clear_tag:
            tx.tag = None
        elif batch_in.tag is not None:
            tx.tag = batch_in.tag.strip() or None

        db.add(tx)
        updated_count += 1

    await db.commit()
    return TransactionBatchUpdateResponse(
        updated_count=updated_count,
        message=f"Successfully updated {updated_count} transaction(s).",
    )


@router.get(
    "/export",
    summary="Export transactions to CSV or JSON",
    description="Exports user transactions as a downloadable CSV or JSON file.",
)
async def export_transactions(
    current_user: CurrentUserDep,
    db: SessionDep,
    format: str = Query("json", pattern="^(csv|json)$", description="Export format: csv or json"),
    year: Optional[int] = Query(None, description="Optional filter by year"),
    month: Optional[int] = Query(None, description="Optional filter by month"),
    account_id: Optional[int] = Query(None, description="Optional filter by account"),
):
    query = (
        select(Transaction)
        .options(
            selectinload(Transaction.account),
            selectinload(Transaction.to_account),
            selectinload(Transaction.category).selectinload(Category.parent),
        )
        .where(Transaction.user_id == current_user.id)
    )

    if year and month:
        max_days = calendar.monthrange(year, month)[1]
        query = query.where(
            Transaction.date >= dt.date(year, month, 1),
            Transaction.date <= dt.date(year, month, max_days),
        )
    elif year:
        query = query.where(
            Transaction.date >= dt.date(year, 1, 1),
            Transaction.date <= dt.date(year, 12, 31),
        )

    if account_id:
        query = query.where(
            (Transaction.account_id == account_id) | (Transaction.to_account_id == account_id)
        )

    query = query.order_by(Transaction.date.desc(), Transaction.id.desc())
    result = await db.execute(query)
    transactions = result.scalars().all()

    rows = []
    for tx in transactions:
        cat_name = tx.category.name if tx.category else ""
        parent_name = (
            tx.category.parent.name if tx.category and tx.category.parent else ""
        )
        rows.append(
            {
                "id": tx.id,
                "date": tx.date.isoformat(),
                "type": str(tx.type.value if hasattr(tx.type, "value") else tx.type),
                "amount": float(tx.amount),
                "currency": tx.currency,
                "exchange_rate": float(tx.exchange_rate),
                "account": tx.account.name if tx.account else "",
                "to_account": tx.to_account.name if tx.to_account else "",
                "category": cat_name,
                "parent_category": parent_name,
                "note": tx.note or "",
                "tag": tx.tag or "",
            }
        )

    if format.lower() == "csv":
        output = io.StringIO()
        fieldnames = [
            "id",
            "date",
            "type",
            "amount",
            "currency",
            "exchange_rate",
            "account",
            "to_account",
            "category",
            "parent_category",
            "note",
            "tag",
        ]
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=transactions_export.csv"},
        )

    json_str = json.dumps(rows, indent=2, ensure_ascii=False)
    return StreamingResponse(
        iter([json_str]),
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=transactions_export.json"},
    )


@router.post(
    "/import",
    response_model=TransactionImportResponse,
    summary="Import transactions from CSV or JSON file",
    description="Parses and imports transactions from an uploaded CSV or JSON file, auto-creating missing accounts or categories when needed.",
)
async def import_transactions(
    current_user: CurrentUserDep,
    db: SessionDep,
    file: UploadFile = File(...),
) -> TransactionImportResponse:
    filename = (file.filename or "").lower()
    raw_bytes = await file.read()
    try:
        content = raw_bytes.decode("utf-8-sig")
    except UnicodeDecodeError:
        content = raw_bytes.decode("latin-1")

    records: List[dict] = []
    if filename.endswith(".json"):
        try:
            parsed = json.loads(content)
            if isinstance(parsed, list):
                records = parsed
            elif isinstance(parsed, dict) and "transactions" in parsed:
                records = parsed["transactions"]
            else:
                raise HTTPException(
                    status_code=400,
                    detail="JSON must be an array of transaction objects.",
                )
        except json.JSONDecodeError as e:
            raise HTTPException(status_code=400, detail=f"Invalid JSON file: {str(e)}")
    elif filename.endswith(".csv"):
        reader = csv.DictReader(io.StringIO(content))
        records = [dict(r) for r in reader]
    else:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file format. Please upload a .csv or .json file.",
        )

    acc_res = await db.execute(select(Account).where(Account.user_id == current_user.id))
    user_accounts = list(acc_res.scalars().all())
    acc_map: Dict[str, Account] = {a.name.strip().lower(): a for a in user_accounts}
    default_acc = user_accounts[0] if user_accounts else None

    cat_res = await db.execute(select(Category).where(Category.user_id == current_user.id))
    user_categories = list(cat_res.scalars().all())
    cat_map: Dict[tuple, Category] = {
        (c.name.strip().lower(), str(c.type.value if hasattr(c.type, "value") else c.type)): c
        for c in user_categories
    }

    imported_count = 0
    skipped_count = 0
    errors: List[str] = []

    for idx, row in enumerate(records, start=1):
        try:
            norm_row = {
                str(k).strip().lower(): v for k, v in row.items() if k is not None
            }

            raw_date = str(norm_row.get("date") or "").strip()
            if not raw_date:
                skipped_count += 1
                errors.append(f"Row {idx}: Missing date")
                continue

            tx_date = None
            for fmt in ("%Y-%m-%d", "%d.%m.%Y", "%d/%m/%Y", "%m/%d/%Y", "%Y/%m/%d"):
                try:
                    tx_date = dt.datetime.strptime(raw_date[:10], fmt).date()
                    break
                except ValueError:
                    continue
            if not tx_date:
                skipped_count += 1
                errors.append(f"Row {idx}: Unrecognized date format '{raw_date}'")
                continue

            raw_amount = (
                str(norm_row.get("amount") or "").strip().replace(",", ".")
            )
            try:
                amount = abs(Decimal(raw_amount))
                if amount <= 0:
                    raise ValueError()
            except (InvalidOperation, ValueError):
                skipped_count += 1
                errors.append(f"Row {idx}: Invalid amount '{raw_amount}'")
                continue

            raw_type = str(norm_row.get("type") or "EXPENSE").strip().upper()
            if raw_type not in ("INCOME", "EXPENSE", "TRANSFER"):
                raw_type = "EXPENSE"

            raw_curr = (
                str(norm_row.get("currency") or current_user.primary_currency)
                .strip()
                .upper()
            )
            if len(raw_curr) != 3:
                raw_curr = current_user.primary_currency

            raw_rate = norm_row.get("exchange_rate")
            rate = None
            if raw_rate:
                try:
                    r_val = Decimal(str(raw_rate))
                    if r_val > 0:
                        rate = r_val
                except InvalidOperation:
                    pass
            if not rate:
                rate = (
                    current_user.exchange_rate
                    if raw_curr == current_user.primary_currency
                    else get_default_rate(raw_curr)
                )

            acc_name = str(norm_row.get("account") or "").strip()
            if acc_name:
                acc_key = acc_name.lower()
                if acc_key in acc_map:
                    account = acc_map[acc_key]
                else:
                    inferred_type = (
                        AccountType.SAVINGS
                        if "sav" in acc_key
                        else AccountType.SPENDING
                    )
                    account = Account(
                        user_id=current_user.id,
                        name=acc_name[:100],
                        type=inferred_type,
                        initial_balance=Decimal("0.00"),
                        color="#3B82F6",
                        icon="PiggyBank"
                        if inferred_type == AccountType.SAVINGS
                        else "CreditCard",
                    )
                    db.add(account)
                    await db.flush()
                    acc_map[acc_key] = account
            else:
                if not default_acc:
                    default_acc = Account(
                        user_id=current_user.id,
                        name="Card",
                        type=AccountType.SPENDING,
                        initial_balance=Decimal("0.00"),
                        color="#3B82F6",
                        icon="CreditCard",
                    )
                    db.add(default_acc)
                    await db.flush()
                    acc_map["card"] = default_acc
                account = default_acc

            to_account_id = None
            category_id = None

            if raw_type == "TRANSFER":
                to_acc_name = str(
                    norm_row.get("to_account") or norm_row.get("category") or "Savings"
                ).strip()
                to_key = to_acc_name.lower()
                if to_key in acc_map:
                    to_acc = acc_map[to_key]
                else:
                    inferred_type = (
                        AccountType.SAVINGS
                        if "sav" in to_key
                        else AccountType.SPENDING
                    )
                    to_acc = Account(
                        user_id=current_user.id,
                        name=to_acc_name[:100],
                        type=inferred_type,
                        initial_balance=Decimal("0.00"),
                        color="#8B5CF6",
                        icon="PiggyBank"
                        if inferred_type == AccountType.SAVINGS
                        else "CreditCard",
                    )
                    db.add(to_acc)
                    await db.flush()
                    acc_map[to_key] = to_acc
                if to_acc.id == account.id:
                    skipped_count += 1
                    errors.append(
                        f"Row {idx}: Transfer source and destination accounts cannot be identical."
                    )
                    continue
                to_account_id = to_acc.id
            else:
                cat_name = str(norm_row.get("category") or "").strip()
                if cat_name:
                    cat_key = (cat_name.lower(), raw_type)
                    if cat_key in cat_map:
                        category_id = cat_map[cat_key].id
                    else:
                        new_cat = Category(
                            user_id=current_user.id,
                            name=cat_name[:100],
                            type=CategoryType.INCOME
                            if raw_type == "INCOME"
                            else CategoryType.EXPENSE,
                            color="#10B981" if raw_type == "INCOME" else "#6366F1",
                            icon="Tag",
                        )
                        db.add(new_cat)
                        await db.flush()
                        cat_map[cat_key] = new_cat
                        category_id = new_cat.id

            note = str(norm_row.get("note") or "").strip() or None
            tag = str(norm_row.get("tag") or "").strip() or None
            amount_base = to_base_currency(amount, raw_curr, rate)

            tx = Transaction(
                user_id=current_user.id,
                account_id=account.id,
                to_account_id=to_account_id,
                category_id=category_id,
                type=TransactionType(raw_type),
                amount=amount,
                currency=raw_curr,
                exchange_rate=rate,
                amount_base=amount_base,
                date=tx_date,
                note=note[:500] if note else None,
                tag=tag[:50] if tag else None,
            )
            db.add(tx)
            imported_count += 1
        except Exception as e:
            skipped_count += 1
            errors.append(f"Row {idx}: {str(e)}")

    await db.commit()
    return TransactionImportResponse(
        message=f"Successfully imported {imported_count} transaction(s).",
        imported_count=imported_count,
        skipped_count=skipped_count,
        errors=errors[:20],
    )


@router.put(
    "/{tx_id}",
    response_model=TransactionOut,
    summary="Update a transaction",
    description="Updates an existing transaction belonging to the authenticated user.",
)
async def update_transaction(
    tx_id: int,
    tx_in: TransactionUpdate,
    current_user: CurrentUserDep,
    db: SessionDep,
) -> TransactionOut:
    query = select(Transaction).where(
        Transaction.id == tx_id,
        Transaction.user_id == current_user.id,
    )
    tx = (await db.execute(query)).scalar_one_or_none()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found.")

    if tx_in.type is not None:
        tx.type = tx_in.type

    if tx_in.account_id is not None:
        acc_check = await db.execute(
            select(Account).where(
                Account.id == tx_in.account_id,
                Account.user_id == current_user.id,
            )
        )
        if not acc_check.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Account not found.")
        tx.account_id = tx_in.account_id

    if "to_account_id" in tx_in.model_fields_set:
        if tx_in.to_account_id is not None and tx.type == TransactionType.TRANSFER:
            to_acc_check = await db.execute(
                select(Account).where(
                    Account.id == tx_in.to_account_id,
                    Account.user_id == current_user.id,
                )
            )
            if not to_acc_check.scalar_one_or_none():
                raise HTTPException(
                    status_code=404, detail="Destination account not found."
                )
            tx.to_account_id = tx_in.to_account_id
        else:
            tx.to_account_id = None

    if tx.type == TransactionType.TRANSFER:
        if not tx.to_account_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Destination account is required for transfers.",
            )
        if tx.account_id == tx.to_account_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Source and destination accounts must be different.",
            )
    else:
        tx.to_account_id = None

    if "category_id" in tx_in.model_fields_set or tx_in.type == TransactionType.TRANSFER:
        if tx.type == TransactionType.TRANSFER:
            tx.category_id = None
        elif "category_id" in tx_in.model_fields_set:
            if tx_in.category_id is None:
                tx.category_id = None
            else:
                cat_check = await db.execute(
                    select(Category).where(
                        Category.id == tx_in.category_id,
                        Category.user_id == current_user.id,
                    )
                )
                category = cat_check.scalar_one_or_none()
                tx.category_id = category.id if category else None

    if tx_in.amount is not None:
        tx.amount = tx_in.amount

    if tx_in.currency is not None:
        tx.currency = tx_in.currency.upper()

    if tx_in.exchange_rate is not None:
        tx.exchange_rate = tx_in.exchange_rate
    elif not tx.exchange_rate or tx_in.currency is not None:
        tx.exchange_rate = (
            current_user.exchange_rate
            if tx.currency == current_user.primary_currency
            else get_default_rate(tx.currency)
        )

    tx.amount_base = to_base_currency(tx.amount, tx.currency, tx.exchange_rate)

    if tx_in.date is not None:
        tx.date = tx_in.date

    if "note" in tx_in.model_fields_set:
        tx.note = tx_in.note.strip() if tx_in.note else None

    if "tag" in tx_in.model_fields_set:
        tx.tag = tx_in.tag.strip() if tx_in.tag else None

    db.add(tx)
    await db.commit()

    fresh_tx = await _load_transaction_with_relations(db, tx.id)
    return build_transaction_out(fresh_tx, current_user)


@router.delete(
    "/clear",
    summary="Clear all transactions for current user",
    description="Permanently deletes all transactions for the authenticated user and resets account balances to 0.00.",
)
@router.post(
    "/clear",
    include_in_schema=False,
)
async def clear_all_transactions(
    current_user: CurrentUserDep,
    db: SessionDep,
):
    await db.execute(delete(Transaction).where(Transaction.user_id == current_user.id))

    acc_res = await db.execute(select(Account).where(Account.user_id == current_user.id))
    accounts = acc_res.scalars().all()
    for acc in accounts:
        acc.initial_balance = Decimal("0.00")
        db.add(acc)

    await db.commit()
    return {"message": "All transactions deleted and account balances reset to 0.00."}


@router.delete(
    "/{tx_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a transaction",
    description="Deletes a transaction belonging to the authenticated user.",
)
async def delete_transaction(
    tx_id: int,
    current_user: CurrentUserDep,
    db: SessionDep,
):
    query = select(Transaction).where(
        Transaction.id == tx_id,
        Transaction.user_id == current_user.id,
    )
    tx = (await db.execute(query)).scalar_one_or_none()

    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found.")

    await db.delete(tx)
    await db.commit()
    return None

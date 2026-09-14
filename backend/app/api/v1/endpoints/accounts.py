import datetime as dt
from decimal import Decimal
from typing import List

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.api.deps import CurrentUserDep, SessionDep
from app.models.account import Account
from app.models.enums import TransactionType
from app.models.transaction import Transaction
from app.schemas.account import AccountCreate, AccountOut, AccountUpdate
from app.services.currency_service import from_base_currency, to_base_currency
from app.services.ledger_service import calculate_account_balance_base
from app.services.seeder import cleanup_duplicate_defaults, seed_user_defaults

router = APIRouter()


@router.get(
    "/",
    response_model=List[AccountOut],
    summary="List user accounts with calculated current balances",
    description="Returns all financial accounts belonging to the current user, including dynamic balance calculations in the user's primary currency.",
)
async def list_accounts(current_user: CurrentUserDep, db: SessionDep) -> List[AccountOut]:
    result = await db.execute(
        select(Account).where(Account.user_id == current_user.id).order_by(Account.id)
    )
    accounts = result.scalars().all()

    if not accounts:
        await seed_user_defaults(db, current_user.id)
        result = await db.execute(
            select(Account).where(Account.user_id == current_user.id).order_by(Account.id)
        )
        accounts = result.scalars().all()
    else:
        await cleanup_duplicate_defaults(db, current_user.id)
        result = await db.execute(
            select(Account).where(Account.user_id == current_user.id).order_by(Account.id)
        )
        accounts = result.scalars().all()

    out_list: List[AccountOut] = []
    for acc in accounts:
        base_balance = await calculate_account_balance_base(db, current_user.id, acc)
        primary_balance = from_base_currency(
            base_balance, current_user.primary_currency, current_user.exchange_rate
        )
        primary_initial = from_base_currency(
            Decimal(str(acc.initial_balance)),
            current_user.primary_currency,
            current_user.exchange_rate,
        )

        out_list.append(
            AccountOut(
                id=acc.id,
                user_id=acc.user_id,
                name=acc.name,
                type=acc.type,
                initial_balance=primary_initial,
                current_balance=primary_balance,
                currency=current_user.primary_currency,
                color=acc.color,
                icon=acc.icon,
                created_at=acc.created_at,
            )
        )

    return out_list


@router.post(
    "/",
    response_model=AccountOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new financial account",
    description="Creates a new account for the current user. The initial balance is provided in the user's primary currency and stored in base EUR.",
)
async def create_account(
    acc_in: AccountCreate,
    current_user: CurrentUserDep,
    db: SessionDep,
) -> AccountOut:
    base_initial = to_base_currency(
        acc_in.initial_balance, current_user.primary_currency, current_user.exchange_rate
    )

    new_acc = Account(
        user_id=current_user.id,
        name=acc_in.name.strip(),
        type=acc_in.type,
        initial_balance=base_initial,
        color=acc_in.color,
        icon=acc_in.icon,
    )
    db.add(new_acc)
    await db.commit()
    await db.refresh(new_acc)

    return AccountOut(
        id=new_acc.id,
        user_id=new_acc.user_id,
        name=new_acc.name,
        type=new_acc.type,
        initial_balance=acc_in.initial_balance,
        current_balance=acc_in.initial_balance,
        currency=current_user.primary_currency,
        color=new_acc.color,
        icon=new_acc.icon,
        created_at=new_acc.created_at,
    )


@router.put(
    "/{account_id}",
    response_model=AccountOut,
    summary="Update an existing account",
    description="Updates account details or adjusts its current balance (either directly or by creating a correction transaction).",
)
async def update_account(
    account_id: int,
    acc_in: AccountUpdate,
    current_user: CurrentUserDep,
    db: SessionDep,
) -> AccountOut:
    result = await db.execute(
        select(Account).where(Account.id == account_id, Account.user_id == current_user.id)
    )
    acc = result.scalar_one_or_none()

    if not acc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found.",
        )

    current_base_balance = await calculate_account_balance_base(db, current_user.id, acc)

    if acc_in.name is not None:
        acc.name = acc_in.name.strip()
    if acc_in.type is not None:
        acc.type = acc_in.type
    if acc_in.color is not None:
        acc.color = acc_in.color
    if acc_in.icon is not None:
        acc.icon = acc_in.icon

    if acc_in.current_balance is not None:
        desired_base_balance = to_base_currency(
            acc_in.current_balance, current_user.primary_currency, current_user.exchange_rate
        )
        diff_base = desired_base_balance - current_base_balance

        if abs(diff_base) > Decimal("0.0001"):
            if acc_in.create_correction_transaction:
                tx_type = TransactionType.INCOME if diff_base > 0 else TransactionType.EXPENSE
                abs_diff_base = abs(diff_base)
                abs_diff_primary = from_base_currency(
                    abs_diff_base, current_user.primary_currency, current_user.exchange_rate
                )

                correction_tx = Transaction(
                    user_id=current_user.id,
                    account_id=acc.id,
                    type=tx_type,
                    amount=abs_diff_primary,
                    currency=current_user.primary_currency,
                    exchange_rate=current_user.exchange_rate,
                    amount_base=abs_diff_base,
                    date=dt.date.today(),
                    note=f"Balance adjustment for {acc.name}",
                    tag="adjustment",
                )
                db.add(correction_tx)
            else:
                acc.initial_balance = Decimal(str(acc.initial_balance)) + diff_base
    elif acc_in.initial_balance is not None:
        acc.initial_balance = to_base_currency(
            acc_in.initial_balance, current_user.primary_currency, current_user.exchange_rate
        )

    db.add(acc)
    await db.commit()
    await db.refresh(acc)

    final_base_balance = await calculate_account_balance_base(db, current_user.id, acc)
    primary_balance = from_base_currency(
        final_base_balance, current_user.primary_currency, current_user.exchange_rate
    )
    primary_initial = from_base_currency(
        Decimal(str(acc.initial_balance)),
        current_user.primary_currency,
        current_user.exchange_rate,
    )

    return AccountOut(
        id=acc.id,
        user_id=acc.user_id,
        name=acc.name,
        type=acc.type,
        initial_balance=primary_initial,
        current_balance=primary_balance,
        currency=current_user.primary_currency,
        color=acc.color,
        icon=acc.icon,
        created_at=acc.created_at,
    )


@router.delete(
    "/{account_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an account",
    description="Deletes an account belonging to the current user.",
)
async def delete_account(
    account_id: int,
    current_user: CurrentUserDep,
    db: SessionDep,
):
    result = await db.execute(
        select(Account).where(Account.id == account_id, Account.user_id == current_user.id)
    )
    acc = result.scalar_one_or_none()

    if not acc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found.",
        )

    await db.delete(acc)
    await db.commit()
    return None

from decimal import Decimal
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.account import Account
from app.models.category import Category
from app.models.transaction import Transaction

DEFAULT_CATEGORIES_DATA = [
    {
        "name": "Food & Dining",
        "type": "EXPENSE",
        "color": "#F59E0B",
        "icon": "Utensils",
        "subcategories": ["Groceries", "Restaurants & Cafes", "Food Delivery"],
    },
    {
        "name": "Housing & Utilities",
        "type": "EXPENSE",
        "color": "#3B82F6",
        "icon": "Home",
        "subcategories": ["Rent", "Electricity & Water", "Internet & Mobile"],
    },
    {
        "name": "Transportation",
        "type": "EXPENSE",
        "color": "#10B981",
        "icon": "Car",
        "subcategories": ["Fuel", "Public Transit", "Taxi", "Vehicle Service"],
    },
    {
        "name": "Shopping & Lifestyle",
        "type": "EXPENSE",
        "color": "#EC4899",
        "icon": "ShoppingBag",
        "subcategories": ["Clothing", "Electronics", "Pharmacy & Health"],
    },
    {
        "name": "Entertainment",
        "type": "EXPENSE",
        "color": "#8B5CF6",
        "icon": "Tv",
        "subcategories": ["Cinema & Concerts", "Streaming Subscriptions", "Hobbies"],
    },
    {
        "name": "Income",
        "type": "INCOME",
        "color": "#059669",
        "icon": "DollarSign",
        "subcategories": ["Monthly Salary", "Freelance & Projects", "Investment & Interest", "Gifts"],
    },
]


async def cleanup_duplicate_defaults(db: AsyncSession, user_id: int) -> None:
    """
    Cleans up any duplicate accounts or categories that may have been created
    due to concurrent seeding. Preserves user transactions by reassigning to canonical records.
    """
    acc_res = await db.execute(select(Account).where(Account.user_id == user_id).order_by(Account.id))
    accounts = acc_res.scalars().all()
    seen_acc_names: dict[str, Account] = {}
    for acc in accounts:
        norm_name = acc.name.strip().lower()
        if norm_name not in seen_acc_names:
            seen_acc_names[norm_name] = acc
        else:
            primary_acc = seen_acc_names[norm_name]
            await db.execute(
                update(Transaction)
                .where(Transaction.account_id == acc.id)
                .values(account_id=primary_acc.id)
            )
            await db.execute(
                update(Transaction)
                .where(Transaction.to_account_id == acc.id)
                .values(to_account_id=primary_acc.id)
            )
            await db.delete(acc)

    parent_res = await db.execute(
        select(Category)
        .where(Category.user_id == user_id, Category.parent_id.is_(None))
        .order_by(Category.id)
    )
    parents = parent_res.scalars().all()
    seen_parents: dict[tuple[str, str], Category] = {}
    for p in parents:
        key = (p.name.strip().lower(), p.type)
        if key not in seen_parents:
            seen_parents[key] = p
        else:
            canonical_parent = seen_parents[key]
            await db.execute(
                update(Category)
                .where(Category.parent_id == p.id)
                .values(parent_id=canonical_parent.id)
            )
            await db.execute(
                update(Transaction)
                .where(Transaction.category_id == p.id)
                .values(category_id=canonical_parent.id)
            )
            await db.delete(p)

    sub_res = await db.execute(
        select(Category)
        .where(Category.user_id == user_id, Category.parent_id.is_not(None))
        .order_by(Category.id)
    )
    subs = sub_res.scalars().all()
    seen_subs: dict[tuple[int, str, str], Category] = {}
    for s in subs:
        key = (s.parent_id, s.name.strip().lower(), s.type)
        if key not in seen_subs:
            seen_subs[key] = s
        else:
            canonical_sub = seen_subs[key]
            await db.execute(
                update(Transaction)
                .where(Transaction.category_id == s.id)
                .values(category_id=canonical_sub.id)
            )
            await db.delete(s)

    await db.commit()


async def seed_user_defaults(db: AsyncSession, user_id: int) -> None:
    """
    Seeds default accounts and categorized structure for a newly registered user.
    """
    acc_check = await db.execute(select(Account).where(Account.user_id == user_id))
    if not acc_check.scalars().first():
        card_acc = Account(
            user_id=user_id,
            name="Card",
            type="SPENDING",
            initial_balance=Decimal("0.00"),
            color="#3B82F6",
            icon="CreditCard",
        )
        bank_acc = Account(
            user_id=user_id,
            name="Bank",
            type="SPENDING",
            initial_balance=Decimal("0.00"),
            color="#10B981",
            icon="CreditCard",
        )
        savings_acc = Account(
            user_id=user_id,
            name="Savings",
            type="SAVINGS",
            initial_balance=Decimal("0.00"),
            color="#8B5CF6",
            icon="PiggyBank",
        )
        db.add_all([card_acc, bank_acc, savings_acc])
        await db.flush()

    cat_check = await db.execute(select(Category).where(Category.user_id == user_id))
    if not cat_check.scalars().first():
        for cat_info in DEFAULT_CATEGORIES_DATA:
            parent = Category(
                user_id=user_id,
                name=cat_info["name"],
                type=cat_info["type"],
                color=cat_info["color"],
                icon=cat_info["icon"],
            )
            db.add(parent)
            await db.flush()

            for sub_name in cat_info["subcategories"]:
                sub = Category(
                    user_id=user_id,
                    name=sub_name,
                    type=cat_info["type"],
                    parent_id=parent.id,
                )
                db.add(sub)
        await db.flush()

    await db.commit()
    await cleanup_duplicate_defaults(db, user_id)

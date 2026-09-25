"""Initial migration

Revision ID: 96ee14c735aa
Revises: 
Create Date: 2026-11-01 01:44:06.023313

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '96ee14c735aa'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema (creates all tables on a fresh DB, or syncs missing columns on an existing DB)."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    # 1. Users table
    if 'users' not in existing_tables:
        op.create_table(
            'users',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('username', sa.String(length=50), nullable=False),
            sa.Column('email', sa.String(length=255), nullable=False),
            sa.Column('password_hash', sa.String(length=255), nullable=False),
            sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=False),
            sa.Column('primary_currency', sa.String(length=10), server_default='EUR', nullable=False),
            sa.Column('exchange_rate', sa.Numeric(precision=10, scale=4), server_default='1.0000', nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
        op.create_index(op.f('ix_users_username'), 'users', ['username'], unique=True)
        op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    else:
        user_cols = {c['name']: c for c in inspector.get_columns('users')}
        if 'password_hash' not in user_cols:
            if 'hashed_password' in user_cols:
                op.alter_column('users', 'hashed_password', new_column_name='password_hash')
            else:
                op.add_column('users', sa.Column('password_hash', sa.String(length=255), server_default='', nullable=False))
        if 'is_active' not in user_cols:
            op.add_column('users', sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=False))
        if 'primary_currency' not in user_cols:
            op.add_column('users', sa.Column('primary_currency', sa.String(length=10), server_default='EUR', nullable=False))
        if 'exchange_rate' not in user_cols:
            op.add_column('users', sa.Column('exchange_rate', sa.Numeric(precision=10, scale=4), server_default='1.0000', nullable=False))
        if 'created_at' not in user_cols:
            op.add_column('users', sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False))
        if 'secondary_currency' in user_cols:
            op.drop_column('users', 'secondary_currency')

    # 2. Accounts table
    if 'accounts' not in existing_tables:
        op.create_table(
            'accounts',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('name', sa.String(length=100), nullable=False),
            sa.Column('type', sa.String(length=20), server_default='SPENDING', nullable=False),
            sa.Column('initial_balance', sa.Numeric(precision=14, scale=2), server_default='0.00', nullable=False),
            sa.Column('color', sa.String(length=30), nullable=True),
            sa.Column('icon', sa.String(length=50), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index(op.f('ix_accounts_id'), 'accounts', ['id'], unique=False)
        op.create_index(op.f('ix_accounts_user_id'), 'accounts', ['user_id'], unique=False)
    else:
        acc_cols = {c['name']: c for c in inspector.get_columns('accounts')}
        if 'type' not in acc_cols:
            op.add_column('accounts', sa.Column('type', sa.String(length=20), server_default='SPENDING', nullable=False))
        if 'initial_balance' not in acc_cols:
            op.add_column('accounts', sa.Column('initial_balance', sa.Numeric(precision=14, scale=2), server_default='0.00', nullable=False))
        if 'color' not in acc_cols:
            op.add_column('accounts', sa.Column('color', sa.String(length=30), nullable=True))
        if 'icon' not in acc_cols:
            op.add_column('accounts', sa.Column('icon', sa.String(length=50), nullable=True))
        if 'created_at' not in acc_cols:
            op.add_column('accounts', sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False))
        if 'currency' in acc_cols:
            op.drop_column('accounts', 'currency')

    # 3. Categories table
    if 'categories' not in existing_tables:
        op.create_table(
            'categories',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=True),
            sa.Column('name', sa.String(length=100), nullable=False),
            sa.Column('type', sa.String(length=20), server_default='EXPENSE', nullable=False),
            sa.Column('parent_id', sa.Integer(), nullable=True),
            sa.Column('color', sa.String(length=30), nullable=True),
            sa.Column('icon', sa.String(length=50), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
            sa.ForeignKeyConstraint(['parent_id'], ['categories.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index(op.f('ix_categories_id'), 'categories', ['id'], unique=False)
        op.create_index(op.f('ix_categories_parent_id'), 'categories', ['parent_id'], unique=False)
        op.create_index(op.f('ix_categories_user_id'), 'categories', ['user_id'], unique=False)
    else:
        cat_cols = {c['name']: c for c in inspector.get_columns('categories')}
        if 'user_id' not in cat_cols:
            op.add_column('categories', sa.Column('user_id', sa.Integer(), nullable=True))
        if 'type' not in cat_cols:
            op.add_column('categories', sa.Column('type', sa.String(length=20), server_default='EXPENSE', nullable=False))
        if 'parent_id' not in cat_cols:
            op.add_column('categories', sa.Column('parent_id', sa.Integer(), nullable=True))
        if 'color' not in cat_cols:
            op.add_column('categories', sa.Column('color', sa.String(length=30), nullable=True))
        if 'icon' not in cat_cols:
            op.add_column('categories', sa.Column('icon', sa.String(length=50), nullable=True))
        if 'created_at' not in cat_cols:
            op.add_column('categories', sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False))

    # 4. Transactions table
    if 'transactions' not in existing_tables:
        op.create_table(
            'transactions',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('type', sa.String(length=20), nullable=False),
            sa.Column('amount', sa.Numeric(precision=14, scale=2), nullable=False),
            sa.Column('currency', sa.String(length=10), server_default='EUR', nullable=False),
            sa.Column('exchange_rate', sa.Numeric(precision=10, scale=4), server_default='1.0000', nullable=False),
            sa.Column('amount_base', sa.Numeric(precision=14, scale=2), nullable=False),
            sa.Column('account_id', sa.Integer(), nullable=False),
            sa.Column('to_account_id', sa.Integer(), nullable=True),
            sa.Column('category_id', sa.Integer(), nullable=True),
            sa.Column('date', sa.Date(), nullable=False),
            sa.Column('note', sa.Text(), nullable=True),
            sa.Column('tag', sa.String(length=50), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
            sa.ForeignKeyConstraint(['account_id'], ['accounts.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['category_id'], ['categories.id'], ondelete='SET NULL'),
            sa.ForeignKeyConstraint(['to_account_id'], ['accounts.id'], ondelete='SET NULL'),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index(op.f('ix_transactions_account_id'), 'transactions', ['account_id'], unique=False)
        op.create_index(op.f('ix_transactions_category_id'), 'transactions', ['category_id'], unique=False)
        op.create_index(op.f('ix_transactions_date'), 'transactions', ['date'], unique=False)
        op.create_index(op.f('ix_transactions_id'), 'transactions', ['id'], unique=False)
        op.create_index(op.f('ix_transactions_tag'), 'transactions', ['tag'], unique=False)
        op.create_index(op.f('ix_transactions_to_account_id'), 'transactions', ['to_account_id'], unique=False)
        op.create_index(op.f('ix_transactions_user_id'), 'transactions', ['user_id'], unique=False)
    else:
        tx_cols = {c['name']: c for c in inspector.get_columns('transactions')}
        if 'exchange_rate' not in tx_cols:
            op.add_column('transactions', sa.Column('exchange_rate', sa.Numeric(precision=10, scale=4), server_default='1.0000', nullable=False))
        if 'amount_base' not in tx_cols:
            op.add_column('transactions', sa.Column('amount_base', sa.Numeric(precision=14, scale=2), server_default='0.00', nullable=False))
            op.execute(sa.text("UPDATE transactions SET amount_base = amount WHERE amount_base = 0"))
        if 'to_account_id' not in tx_cols:
            op.add_column('transactions', sa.Column('to_account_id', sa.Integer(), nullable=True))
        if 'category_id' not in tx_cols:
            op.add_column('transactions', sa.Column('category_id', sa.Integer(), nullable=True))
        if 'note' not in tx_cols:
            op.add_column('transactions', sa.Column('note', sa.Text(), nullable=True))
        elif not tx_cols['note'].get('nullable', True):
            op.alter_column('transactions', 'note', existing_type=sa.Text(), nullable=True)
        if 'tag' not in tx_cols:
            op.add_column('transactions', sa.Column('tag', sa.String(length=50), nullable=True))
        if 'secondary_amount' in tx_cols:
            op.drop_column('transactions', 'secondary_amount')
        if 'secondary_currency' in tx_cols:
            op.drop_column('transactions', 'secondary_currency')

    # 5. Receipts table
    if 'receipts' not in existing_tables:
        op.create_table(
            'receipts',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('transaction_id', sa.Integer(), nullable=True),
            sa.Column('image_path', sa.String(length=500), nullable=False),
            sa.Column('ocr_raw_text', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
            sa.ForeignKeyConstraint(['transaction_id'], ['transactions.id'], ondelete='SET NULL'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('transaction_id'),
        )
        op.create_index(op.f('ix_receipts_id'), 'receipts', ['id'], unique=False)
    else:
        rec_cols = {c['name']: c for c in inspector.get_columns('receipts')}
        if 'transaction_id' not in rec_cols:
            op.add_column('receipts', sa.Column('transaction_id', sa.Integer(), nullable=True))
        if 'image_path' not in rec_cols:
            op.add_column('receipts', sa.Column('image_path', sa.String(length=500), server_default='', nullable=False))
        if 'ocr_raw_text' not in rec_cols:
            op.add_column('receipts', sa.Column('ocr_raw_text', sa.Text(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_receipts_id'), table_name='receipts')
    op.drop_table('receipts')
    op.drop_index(op.f('ix_transactions_user_id'), table_name='transactions')
    op.drop_index(op.f('ix_transactions_to_account_id'), table_name='transactions')
    op.drop_index(op.f('ix_transactions_tag'), table_name='transactions')
    op.drop_index(op.f('ix_transactions_id'), table_name='transactions')
    op.drop_index(op.f('ix_transactions_date'), table_name='transactions')
    op.drop_index(op.f('ix_transactions_category_id'), table_name='transactions')
    op.drop_index(op.f('ix_transactions_account_id'), table_name='transactions')
    op.drop_table('transactions')
    op.drop_index(op.f('ix_categories_user_id'), table_name='categories')
    op.drop_index(op.f('ix_categories_parent_id'), table_name='categories')
    op.drop_index(op.f('ix_categories_id'), table_name='categories')
    op.drop_table('categories')
    op.drop_index(op.f('ix_accounts_user_id'), table_name='accounts')
    op.drop_index(op.f('ix_accounts_id'), table_name='accounts')
    op.drop_table('accounts')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_index(op.f('ix_users_username'), table_name='users')
    op.drop_index(op.f('ix_users_id'), table_name='users')
    op.drop_table('users')

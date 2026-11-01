import json
import uuid
from datetime import date
from decimal import Decimal
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_validation_error_format():
    invalid_payload = {
        "username": "ab",
        "email": "not-an-email",
        "password": "123"
    }
    res = client.post("/api/auth/register", json=invalid_payload)
    assert res.status_code == 422
    data = res.json()
    assert "detail" in data
    assert isinstance(data["detail"], list)
    fields_with_errors = [e["loc"][-1] for e in data["detail"]]
    assert "username" in fields_with_errors
    assert "email" in fields_with_errors
    assert "password" in fields_with_errors


def test_complete_finance_flow():
    # 1. Register test user with unique credentials for isolation
    unique_id = uuid.uuid4().hex[:8]
    user_payload = {
        "username": f"user_{unique_id}",
        "email": f"tester_{unique_id}@finance.io",
        "password": "StrongPassword123!"
    }
    reg_res = client.post("/api/auth/register", json=user_payload)
    assert reg_res.status_code == 201
    token = reg_res.cookies["access_token"]

    authed = TestClient(app, cookies={"access_token": token})

    # 2. Check Settings
    settings_res = authed.get("/api/settings/")
    assert settings_res.status_code == 200
    user_settings = settings_res.json()
    assert user_settings["primary_currency"] == "EUR"
    assert float(user_settings["exchange_rate"]) == 1.0000

    # 3. Get Accounts (defaults should be seeded: Bank Card, Cash Wallet, Savings Account)
    acc_res = authed.get("/api/accounts/")
    assert acc_res.status_code == 200
    accounts = acc_res.json()
    assert len(accounts) >= 2
    bank_acc = accounts[0]

    # 4. Create a custom Account (no currency required)
    new_acc_res = authed.post("/api/accounts/", json={
        "name": "Crypto Vault",
        "initial_balance": 250.00
    })
    assert new_acc_res.status_code == 201
    crypto_acc = new_acc_res.json()
    assert crypto_acc["name"] == "Crypto Vault"

    # 5. Get Categories (hierarchical with subcategories)
    cat_res = authed.get("/api/categories/")
    assert cat_res.status_code == 200
    categories = cat_res.json()
    assert len(categories) >= 3
    food_cat = next(c for c in categories if "Food" in c["name"])
    assert len(food_cat["subcategories"]) >= 1
    groceries_sub = food_cat["subcategories"][0]

    income_cat = next(c for c in categories if c["type"] == "INCOME")
    salary_sub = income_cat["subcategories"][0]

    # 6. Add an Income transaction (Salary: 2000 EUR, note optional)
    inc_res = authed.post("/api/transactions/", json={
        "type": "INCOME",
        "amount": 2000.00,
        "currency": "EUR",
        "account_id": bank_acc["id"],
        "category_id": salary_sub["id"],
        "date": "2026-09-28",
        # note omitted to verify it's optional!
        "tag": "salary"
    })
    assert inc_res.status_code == 201
    inc_tx = inc_res.json()
    assert float(inc_tx["amount"]) == 2000.00
    assert float(inc_tx["amount_primary"]) == 2000.00

    # 7. Add an Expense transaction in RSD with adjustable rate (Groceries: 5860 RSD at rate 117.20 -> 50 EUR)
    exp_res = authed.post("/api/transactions/", json={
        "type": "EXPENSE",
        "amount": 5860.00,
        "currency": "RSD",
        "exchange_rate": 117.2000,
        "account_id": bank_acc["id"],
        "category_id": groceries_sub["id"],
        "date": "2026-09-28",
        "note": "Supermarket grocery haul"
    })
    assert exp_res.status_code == 201
    exp_tx = exp_res.json()
    assert float(exp_tx["amount"]) == 5860.00
    assert float(exp_tx["amount_base"]) == 50.00
    assert float(exp_tx["amount_primary"]) == 50.00

    # 8. Add a Transfer transaction (Bank Card -> Crypto Vault: 100 EUR, no category, no note)
    transfer_res = authed.post("/api/transactions/", json={
        "type": "TRANSFER",
        "amount": 100.00,
        "currency": "EUR",
        "account_id": bank_acc["id"],
        "to_account_id": crypto_acc["id"],
        "date": "2026-09-28"
    })
    assert transfer_res.status_code == 201

    # 9. Check daily grouped transactions
    tx_list_res = authed.get("/api/transactions/?month=9&year=2026")
    assert tx_list_res.status_code == 200
    monthly_data = tx_list_res.json()
    assert monthly_data["month"] == 9
    assert monthly_data["transaction_count"] == 3
    assert len(monthly_data["days"]) >= 1
    day_group = monthly_data["days"][0]
    assert day_group["date"] == "2026-09-28"
    assert float(day_group["total_income_primary"]) == 2000.00
    assert float(day_group["total_expense_primary"]) == 50.00
    assert float(day_group["net_primary"]) == 1950.00

    # 10. Check analytics category breakdown
    analytics_res = authed.get("/api/analytics/summary?period=month&month=9&year=2026")
    assert analytics_res.status_code == 200
    analytics_data = analytics_res.json()
    assert float(analytics_data["total_expense_primary"]) == 50.00
    assert float(analytics_data["total_income_primary"]) == 2000.00
    assert len(analytics_data["categories"]) >= 2

    # 11. Switch user's primary currency to RSD and verify dynamic conversion
    update_res = authed.put("/api/settings/", json={
        "primary_currency": "RSD",
        "exchange_rate": 117.2000
    })
    assert update_res.status_code == 200
    assert update_res.json()["primary_currency"] == "RSD"

    # Verify accounts now return balances scaled to RSD
    acc_rsd_res = authed.get("/api/accounts/")
    assert acc_rsd_res.status_code == 200
    rsd_accounts = acc_rsd_res.json()
    assert rsd_accounts[0]["currency"] == "RSD"
    # Bank card initial was 0.00 EUR, + 2000 EUR income - 50 EUR expense - 100 EUR transfer = 1850 EUR * 117.20 = 216820 RSD
    assert float(rsd_accounts[0]["current_balance"]) == round(1850.00 * 117.20, 2)

    clean_res = authed.delete("/api/transactions/clear")
    assert clean_res.status_code == 200
    clean_txs = authed.get("/api/transactions/?month=9&year=2026")
    assert clean_txs.status_code == 200
    assert clean_txs.json()["transaction_count"] == 0
    clean_accs = authed.get("/api/accounts/")
    assert clean_accs.status_code == 200
    for a in clean_accs.json():
        assert float(a["initial_balance"]) == 0.00
        assert float(a["current_balance"]) == 0.00


def test_no_duplicate_accounts_or_categories_on_registration():
    """Verify that registering an account and immediately requesting accounts/categories does NOT duplicate records."""
    unique_id = uuid.uuid4().hex[:8]
    user_payload = {
        "username": f"dedup_{unique_id}",
        "email": f"dedup_{unique_id}@finance.io",
        "password": "StrongPassword123!"
    }
    reg_res = client.post("/api/auth/register", json=user_payload)
    assert reg_res.status_code == 201
    token = reg_res.cookies["access_token"]

    authed = TestClient(app, cookies={"access_token": token})

    # Call /me, /accounts, /categories
    me_res = authed.get("/api/auth/me")
    assert me_res.status_code == 200

    acc_res = authed.get("/api/accounts/")
    assert acc_res.status_code == 200
    accounts = acc_res.json()
    assert len(accounts) == 3, f"Expected exactly 3 default accounts, got {len(accounts)}"

    cat_res = authed.get("/api/categories/")
    assert cat_res.status_code == 200
    categories = cat_res.json()
    assert len(categories) == 6, f"Expected exactly 6 default top-level categories, got {len(categories)}"

    # Repeated calls should NOT increase counts
    acc_res2 = authed.get("/api/accounts/")
    assert len(acc_res2.json()) == 3
    cat_res2 = authed.get("/api/categories/")
    assert len(cat_res2.json()) == 6


def test_edit_transaction():
    """Verify editing a transaction updates all attributes, recalculates conversions, and allows clearing optional fields."""
    unique_id = uuid.uuid4().hex[:8]
    user_payload = {
        "username": f"edituser_{unique_id}",
        "email": f"edituser_{unique_id}@finance.io",
        "password": "StrongPassword123!"
    }
    reg_res = client.post("/api/auth/register", json=user_payload)
    assert reg_res.status_code == 201
    token = reg_res.cookies["access_token"]
    authed = TestClient(app, cookies={"access_token": token})

    # Fetch accounts & categories
    accounts = authed.get("/api/accounts/").json()
    acc1 = accounts[0]
    acc2 = accounts[1]
    categories = authed.get("/api/categories/").json()
    food_cat = next(c for c in categories if "Food" in c["name"])
    groceries_sub = food_cat["subcategories"][0]

    # Create initial expense
    create_res = authed.post("/api/transactions/", json={
        "type": "EXPENSE",
        "amount": 50.00,
        "currency": "EUR",
        "account_id": acc1["id"],
        "category_id": groceries_sub["id"],
        "date": "2026-09-28",
        "note": "Initial note",
        "tag": "groceries"
    })
    assert create_res.status_code == 201
    tx = create_res.json()
    tx_id = tx["id"]
    assert float(tx["amount"]) == 50.00
    assert tx["note"] == "Initial note"

    # 1. Update amount, note, and tag
    edit_res = authed.put(f"/api/transactions/{tx_id}", json={
        "amount": 75.50,
        "note": "Updated grocery note",
        "tag": "weekly-market"
    })
    assert edit_res.status_code == 200
    updated = edit_res.json()
    assert float(updated["amount"]) == 75.50
    assert float(updated["amount_base"]) == 75.50
    assert float(updated["amount_primary"]) == 75.50
    assert updated["note"] == "Updated grocery note"
    assert updated["tag"] == "weekly-market"

    # 2. Update currency to RSD with exchange rate, and clear note
    edit_rsd_res = authed.put(f"/api/transactions/{tx_id}", json={
        "amount": 11720.00,
        "currency": "RSD",
        "exchange_rate": 117.2000,
        "note": ""
    })
    assert edit_rsd_res.status_code == 200
    rsd_tx = edit_rsd_res.json()
    assert float(rsd_tx["amount"]) == 11720.00
    assert float(rsd_tx["amount_base"]) == 100.00
    assert float(rsd_tx["amount_primary"]) == 100.00
    assert rsd_tx["note"] is None

    # 3. Convert transaction to TRANSFER
    transfer_edit = authed.put(f"/api/transactions/{tx_id}", json={
        "type": "TRANSFER",
        "amount": 20.00,
        "currency": "EUR",
        "account_id": acc1["id"],
        "to_account_id": acc2["id"]
    })
    assert transfer_edit.status_code == 200
    tf_tx = transfer_edit.json()
    assert tf_tx["type"] == "TRANSFER"
    assert float(tf_tx["amount"]) == 20.00
    assert tf_tx["to_account_id"] == acc2["id"]
    assert tf_tx["category_id"] is None


def test_savings_account_transfer_and_period_expense():
    unique_id = uuid.uuid4().hex[:8]
    user_payload = {
        "username": f"savings_{unique_id}",
        "email": f"savings_{unique_id}@finance.io",
        "password": "StrongPassword123!"
    }
    reg_res = client.post("/api/auth/register", json=user_payload)
    assert reg_res.status_code == 201
    token = reg_res.cookies["access_token"]
    authed = TestClient(app, cookies={"access_token": token})

    # 1. Verify default seeded accounts have proper types
    acc_res = authed.get("/api/accounts/")
    assert acc_res.status_code == 200
    accounts = acc_res.json()
    acc_map = {a["name"]: a["type"] for a in accounts}
    assert acc_map.get("Card") == "SPENDING"
    assert acc_map.get("Bank") == "SPENDING"
    assert acc_map.get("Savings") == "SAVINGS"
    spending_acc = next(a for a in accounts if a["name"] == "Card")
    savings_acc = next(a for a in accounts if a["name"] == "Savings")

    # 2. Give Spending Account initial balance via income
    cats = authed.get("/api/categories/").json()
    income_sub = next(c for c in cats if c["type"] == "INCOME")["subcategories"][0]["id"]
    expense_sub = next(c for c in cats if c["type"] == "EXPENSE")["subcategories"][0]["id"]

    inc_res = authed.post("/api/transactions/", json={
        "type": "INCOME",
        "amount": 1000.00,
        "currency": "EUR",
        "account_id": spending_acc["id"],
        "category_id": income_sub,
        "date": "2026-10-01",
        "tag": "salary"
    })
    assert inc_res.status_code == 201

    # Check month summary before transfer: income=1000, expense=0, net=1000
    m_before = authed.get("/api/transactions/?month=10&year=2026").json()
    assert float(m_before["total_income_primary"]) == 1000.00
    assert float(m_before["total_expense_primary"]) == 0.00
    assert float(m_before["net_primary"]) == 1000.00

    # 3. Transfer from Spending Account -> Savings Account: 300 EUR
    transfer_res = authed.post("/api/transactions/", json={
        "type": "TRANSFER",
        "amount": 300.00,
        "currency": "EUR",
        "account_id": spending_acc["id"],
        "to_account_id": savings_acc["id"],
        "date": "2026-10-02",
        "tag": "saving-goal"
    })
    assert transfer_res.status_code == 201
    transfer_tx = transfer_res.json()
    assert transfer_tx["is_savings_transfer"] is True
    assert transfer_tx["savings_transfer_direction"] == "TO_SAVINGS"

    # Check balances: Spending Account should be 1000 - 300 = 700. Savings Account should be 0 + 300 = 300
    acc_check = authed.get("/api/accounts/").json()
    spending_now = next(a for a in acc_check if a["id"] == spending_acc["id"])
    savings_now = next(a for a in acc_check if a["id"] == savings_acc["id"])
    assert float(spending_now["current_balance"]) == 700.00
    assert float(savings_now["current_balance"]) == 300.00

    # 4. Check monthly ledger: transfer to savings MUST count as an expense for current period!
    m_after = authed.get("/api/transactions/?month=10&year=2026").json()
    assert float(m_after["total_income_primary"]) == 1000.00
    assert float(m_after["total_expense_primary"]) == 300.00
    assert float(m_after["net_primary"]) == 700.00

    # 5. Check analytics summary: total_expense_primary must be 300.00, with Savings category
    analytics_res = authed.get("/api/analytics/summary?period=month&month=10&year=2026").json()
    assert float(analytics_res["total_income_primary"]) == 1000.00
    assert float(analytics_res["total_expense_primary"]) == 300.00
    assert float(analytics_res["net_savings_primary"]) == 700.00
    savings_cat = next((c for c in analytics_res["categories"] if "Savings" in c["category_name"]), None)
    assert savings_cat is not None
    assert float(savings_cat["total_amount_primary"]) == 300.00

    # 6. Direct transactions on savings account must NOT contribute to period income or expense
    direct_savings_inc = authed.post("/api/transactions/", json={
        "type": "INCOME",
        "amount": 50.00,
        "currency": "EUR",
        "account_id": savings_acc["id"],
        "category_id": income_sub,
        "date": "2026-10-03",
        "tag": "interest"
    })
    assert direct_savings_inc.status_code == 201

    # Balances updated: savings goes to 350
    acc_check2 = authed.get("/api/accounts/").json()
    savings_now2 = next(a for a in acc_check2 if a["id"] == savings_acc["id"])
    assert float(savings_now2["current_balance"]) == 350.00

    # But monthly income/expense unchanged! (still 1000 income, 300 expense)
    m_after2 = authed.get("/api/transactions/?month=10&year=2026").json()
    assert float(m_after2["total_income_primary"]) == 1000.00
    assert float(m_after2["total_expense_primary"]) == 300.00

    # 7. Transfer from Savings -> Card: 100 EUR counts as INCOME for the period
    transfer_back = authed.post("/api/transactions/", json={
        "type": "TRANSFER",
        "amount": 100.00,
        "currency": "EUR",
        "account_id": savings_acc["id"],
        "to_account_id": spending_acc["id"],
        "date": "2026-10-04",
        "tag": "withdrawal"
    })
    assert transfer_back.status_code == 201
    tb_data = transfer_back.json()
    assert tb_data["is_savings_transfer"] is True
    assert tb_data["savings_transfer_direction"] == "FROM_SAVINGS"

    # Balances: Spending is 700 + 100 = 800, Savings is 350 - 100 = 250
    acc_check3 = authed.get("/api/accounts/").json()
    spending_now3 = next(a for a in acc_check3 if a["id"] == spending_acc["id"])
    savings_now3 = next(a for a in acc_check3 if a["id"] == savings_acc["id"])
    assert float(spending_now3["current_balance"]) == 800.00
    assert float(savings_now3["current_balance"]) == 250.00

    # Monthly ledger: Income increases to 1100 (1000 + 100), Expense is 300, Net is 800
    m_after3 = authed.get("/api/transactions/?month=10&year=2026").json()
    assert float(m_after3["total_income_primary"]) == 1100.00
    assert float(m_after3["total_expense_primary"]) == 300.00
    assert float(m_after3["net_primary"]) == 800.00


def test_batch_update_transactions():
    uid = uuid.uuid4().hex[:8]
    auth_resp = client.post("/api/auth/register", json={
        "username": f"mass_{uid}",
        "email": f"mass_{uid}@example.com",
        "password": "StrongPassword123!",
        "primary_currency": "EUR"
    })
    token = auth_resp.cookies["access_token"]
    authed = TestClient(app, cookies={"access_token": token})

    acc1 = authed.post("/api/accounts/", json={"name": "Checking", "currency": "EUR", "initial_balance": 500}).json()
    acc2 = authed.post("/api/accounts/", json={"name": "Cash Wallet", "currency": "EUR", "initial_balance": 200}).json()
    cat = authed.post("/api/categories/", json={"name": "Groceries", "type": "EXPENSE"}).json()

    tx1 = authed.post("/api/transactions/", json={
        "type": "EXPENSE",
        "amount": 25.0,
        "currency": "EUR",
        "account_id": acc1["id"],
        "date": "2026-10-01",
        "note": "Old Note 1",
        "tag": "oldtag1"
    }).json()

    tx2 = authed.post("/api/transactions/", json={
        "type": "EXPENSE",
        "amount": 40.0,
        "currency": "EUR",
        "account_id": acc1["id"],
        "date": "2026-10-02",
        "note": "Old Note 2",
        "tag": "oldtag2"
    }).json()

    batch_resp = authed.patch("/api/transactions/batch", json={
        "transaction_ids": [tx1["id"], tx2["id"]],
        "account_id": acc2["id"],
        "category_id": cat["id"],
        "date": "2026-10-05",
        "note": "Updated Batch Note",
        "tag": "massedited"
    })
    assert batch_resp.status_code == 200
    assert batch_resp.json()["updated_count"] == 2

    m = authed.get("/api/transactions/?month=10&year=2026").json()
    day = next(d for d in m["days"] if d["date"] == "2026-10-05")
    updated_txs = [t for t in day["transactions"] if t["id"] in [tx1["id"], tx2["id"]]]
    assert len(updated_txs) == 2
    for utx in updated_txs:
        assert utx["account_id"] == acc2["id"]
        assert utx["category_id"] == cat["id"]
        assert utx["date"] == "2026-10-05"
        assert utx["note"] == "Updated Batch Note"
        assert utx["tag"] == "massedited"

    del_resp = authed.post("/api/transactions/batch-delete", json={
        "transaction_ids": [tx1["id"], tx2["id"]],
    })
    assert del_resp.status_code == 200
    assert del_resp.json()["deleted_count"] == 2

    m_after_del = authed.get("/api/transactions/?month=10&year=2026").json()
    assert m_after_del["transaction_count"] == 0


def test_transactions_export_and_import():
    unique_id = uuid.uuid4().hex[:8]
    user_payload = {
        "username": f"imp_{unique_id}",
        "email": f"imp_{unique_id}@test.com",
        "password": "Password123!",
    }
    reg_res = client.post("/api/auth/register", json=user_payload)
    assert reg_res.status_code == 201
    token = reg_res.cookies["access_token"]
    authed = TestClient(app, cookies={"access_token": token})

    accs = authed.get("/api/accounts/").json()
    card_acc = accs[0]

    authed.post("/api/transactions/", json={
        "type": "EXPENSE",
        "amount": 45.0,
        "currency": "EUR",
        "account_id": card_acc["id"],
        "date": "2026-10-01",
        "note": "Initial Export Test",
        "tag": "testexport",
    })

    export_json = authed.get("/api/transactions/export?format=json")
    assert export_json.status_code == 200
    assert "application/json" in export_json.headers["content-type"]
    exported_data = export_json.json()
    assert len(exported_data) == 1
    assert exported_data[0]["amount"] == 45.0
    assert exported_data[0]["tag"] == "testexport"

    export_csv = authed.get("/api/transactions/export?format=csv")
    assert export_csv.status_code == 200
    assert "text/csv" in export_csv.headers["content-type"]
    assert "Initial Export Test" in export_csv.text

    csv_content = (
        "date,type,amount,currency,account,category,note,tag\n"
        "2026-10-02,EXPENSE,15.50,EUR,Card,Groceries,Imported CSV Note,csvtag\n"
        "2026-10-03,INCOME,500.00,EUR,Card,Salary,Imported Income,incometag\n"
    )
    import_csv_res = authed.post(
        "/api/transactions/import",
        files={"file": ("transactions.csv", csv_content.encode("utf-8"), "text/csv")},
    )
    assert import_csv_res.status_code == 200
    assert import_csv_res.json()["imported_count"] == 2

    json_content = json.dumps([
        {
            "date": "2026-10-04",
            "type": "EXPENSE",
            "amount": 22.00,
            "currency": "EUR",
            "account": "Card",
            "category": "Dining",
            "note": "Imported JSON Note",
            "tag": "jsontag",
        }
    ])
    import_json_res = authed.post(
        "/api/transactions/import",
        files={"file": ("transactions.json", json_content.encode("utf-8"), "application/json")},
    )
    assert import_json_res.status_code == 200
    assert import_json_res.json()["imported_count"] == 1

    feed = authed.get("/api/transactions/?month=10&year=2026").json()
    assert feed["transaction_count"] == 4


def test_edit_account_amount_with_optional_correction():
    unique_id = uuid.uuid4().hex[:8]
    user_payload = {
        "username": f"acc_edit_{unique_id}",
        "email": f"acc_edit_{unique_id}@finance.io",
        "password": "StrongPassword123!"
    }
    reg_res = client.post("/api/auth/register", json=user_payload)
    assert reg_res.status_code == 201
    token = reg_res.cookies["access_token"]
    authed = TestClient(app, cookies={"access_token": token})

    accounts = authed.get("/api/accounts/").json()
    card_acc = next(a for a in accounts if a["name"] == "Card")
    assert float(card_acc["current_balance"]) == 0.00

    update1 = authed.put(f"/api/accounts/{card_acc['id']}", json={
        "current_balance": 500.00,
        "create_correction_transaction": False
    })
    assert update1.status_code == 200
    assert float(update1.json()["current_balance"]) == 500.00

    today = date.today()
    txs1 = authed.get(f"/api/transactions/?month={today.month}&year={today.year}").json()
    assert txs1["transaction_count"] == 0

    update2 = authed.put(f"/api/accounts/{card_acc['id']}", json={
        "current_balance": 750.00,
        "create_correction_transaction": True
    })
    assert update2.status_code == 200
    assert float(update2.json()["current_balance"]) == 750.00

    txs2 = authed.get(f"/api/transactions/?month={today.month}&year={today.year}").json()
    assert txs2["transaction_count"] == 1
    found_tx = txs2["days"][0]["transactions"][0]
    assert found_tx["type"] == "INCOME"
    assert float(found_tx["amount"]) == 250.00
    assert found_tx["tag"] == "adjustment"

    update3 = authed.put(f"/api/accounts/{card_acc['id']}", json={
        "current_balance": 650.00,
        "create_correction_transaction": True
    })
    assert update3.status_code == 200
    assert float(update3.json()["current_balance"]) == 650.00

    txs3 = authed.get(f"/api/transactions/?month={today.month}&year={today.year}").json()
    assert txs3["transaction_count"] == 2
    expense_corr = next(t for t in txs3["days"][0]["transactions"] if t["type"] == "EXPENSE")
    assert float(expense_corr["amount"]) == 100.00
    assert expense_corr["tag"] == "adjustment"

    update4 = authed.put(f"/api/accounts/{card_acc['id']}", json={
        "current_balance": 1200.00,
        "create_correction_transaction": False
    })
    assert update4.status_code == 200
    assert float(update4.json()["current_balance"]) == 1200.00

    txs4 = authed.get(f"/api/transactions/?month={today.month}&year={today.year}").json()
    assert txs4["transaction_count"] == 2






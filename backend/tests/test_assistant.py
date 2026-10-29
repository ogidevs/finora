import uuid
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_assistant_insights_and_chat():
    uid = uuid.uuid4().hex[:8]
    auth_resp = client.post("/api/auth/register", json={
        "username": f"aiuser_{uid}",
        "email": f"ai_{uid}@example.com",
        "password": "StrongPassword123!",
        "primary_currency": "EUR"
    })
    token = auth_resp.cookies["access_token"]
    authed = TestClient(app, cookies={"access_token": token})

    acc_card = authed.post("/api/accounts/", json={"name": "Primary Spending", "currency": "EUR", "initial_balance": 1000, "type": "SPENDING"}).json()
    acc_savings = authed.post("/api/accounts/", json={"name": "Emergency Fund", "currency": "EUR", "initial_balance": 5000, "type": "SAVINGS"}).json()

    cat_food = authed.post("/api/categories/", json={"name": "Food & Groceries", "type": "EXPENSE"}).json()
    cat_salary = authed.post("/api/categories/", json={"name": "Salary", "type": "INCOME"}).json()

    authed.post("/api/transactions/", json={
        "type": "INCOME",
        "amount": 3000.0,
        "currency": "EUR",
        "account_id": acc_card["id"],
        "category_id": cat_salary["id"],
        "date": "2026-09-15"
    })
    authed.post("/api/transactions/", json={
        "type": "EXPENSE",
        "amount": 1000.0,
        "currency": "EUR",
        "account_id": acc_card["id"],
        "category_id": cat_food["id"],
        "date": "2026-09-20"
    })

    authed.post("/api/transactions/", json={
        "type": "INCOME",
        "amount": 3200.0,
        "currency": "EUR",
        "account_id": acc_card["id"],
        "category_id": cat_salary["id"],
        "date": "2026-10-01"
    })
    authed.post("/api/transactions/", json={
        "type": "EXPENSE",
        "amount": 1200.0,
        "currency": "EUR",
        "account_id": acc_card["id"],
        "category_id": cat_food["id"],
        "date": "2026-10-05"
    })
    authed.post("/api/transactions/", json={
        "type": "TRANSFER",
        "amount": 300.0,
        "currency": "EUR",
        "account_id": acc_card["id"],
        "to_account_id": acc_savings["id"],
        "date": "2026-10-10"
    })

    resp = authed.get("/api/assistant/insights?month=10&year=2026")
    assert resp.status_code == 200
    data = resp.json()

    assert "facts" in data
    facts = data["facts"]
    assert facts["period"] == "October 2026"
    assert float(facts["income"]) == 3200.0
    assert float(facts["expenses"]) == 1500.0
    assert float(facts["difference"]) == 1700.0
    assert float(facts["savings_net_transfers"]) == 300.0
    assert float(facts["savings_account_balance"]) == 5300.0
    assert len(data["recommendations"]) >= 1
    assert data["provider"] in ["ollama", "fallback"]

    chat_resp = authed.post("/api/assistant/chat", json={
        "message": "What is my current difference?",
        "month": 10,
        "year": 2026
    })
    assert chat_resp.status_code == 200
    chat_data = chat_resp.json()
    assert "reply" in chat_data
    assert len(chat_data["reply"]) > 10

    chat_savings = authed.post("/api/assistant/chat", json={
        "message": "How much do I have in savings?",
        "month": 10,
        "year": 2026
    })
    assert chat_savings.status_code == 200
    assert "5,300" in chat_savings.json()["reply"] or "5300" in chat_savings.json()["reply"]

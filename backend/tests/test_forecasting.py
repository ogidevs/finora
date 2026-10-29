import uuid
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_analytics_trends_and_forecasting():
    unique_id = uuid.uuid4().hex[:8]
    user_payload = {
        "username": f"user_fc_{unique_id}",
        "email": f"tester_fc_{unique_id}@finance.io",
        "password": "StrongPassword123!"
    }
    reg_res = client.post("/api/auth/register", json=user_payload)
    assert reg_res.status_code == 201
    token = reg_res.cookies["access_token"]

    authed = TestClient(app, cookies={"access_token": token})

    trends_res = authed.get("/api/analytics/trends")
    assert trends_res.status_code == 200
    trends_data = trends_res.json()
    assert "trends" in trends_data
    assert "average_monthly_expense" in trends_data

    forecast_res = authed.get("/api/analytics/forecast")
    assert forecast_res.status_code == 200
    forecast_data = forecast_res.json()
    assert "eligible" in forecast_data
    assert forecast_data["eligible"] is False
    assert forecast_data["historical_months_count"] < 6

    acc_res = authed.get("/api/accounts/")
    assert acc_res.status_code == 200
    acc_id = acc_res.json()[0]["id"]

    for i in range(1, 8):
        m_str = f"0{i}" if i < 10 else f"{i}"
        tx_res = authed.post("/api/transactions/", json={
            "type": "EXPENSE",
            "amount": 100.00 * i,
            "currency": "EUR",
            "account_id": acc_id,
            "date": f"2026-{m_str}-15",
            "note": f"Month {i} expense"
        })
        assert tx_res.status_code == 201


    trends_after_seed = authed.get("/api/analytics/trends")
    assert trends_after_seed.status_code == 200
    assert len(trends_after_seed.json()["trends"]) >= 6

    forecast_after_seed = authed.get("/api/analytics/forecast")
    assert forecast_after_seed.status_code == 200
    fc_data = forecast_after_seed.json()
    assert fc_data["eligible"] is True
    assert fc_data["historical_months_count"] >= 6
    assert fc_data["recommended_projection"] is not None
    assert float(fc_data["recommended_projection"]) > 0
    assert len(fc_data["points"]) > 6

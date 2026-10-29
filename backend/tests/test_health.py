from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "version" in data
    assert data["message"].startswith("Welcome to")


def test_ping_endpoint():
    response = client.get("/api/ping")
    assert response.status_code == 200
    assert response.json() == {"ping": "pong"}

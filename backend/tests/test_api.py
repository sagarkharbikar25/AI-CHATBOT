import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_health_check():
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"

def test_list_products():
    res = client.get("/api/products")
    assert res.status_code == 200
    products = res.json()
    assert len(products) > 0
    assert any(p["id"] == "flowdesk" for p in products)

def test_create_call_requires_consent():
    res = client.post("/api/calls", json={
        "session_id": "test-session-123",
        "product_id": "flowdesk",
        "language": "en",
        "consent_given": False
    })
    assert res.status_code == 400
    assert "consent" in res.json()["detail"].lower()

def test_create_call_success():
    res = client.post("/api/calls", json={
        "session_id": "test-session-123",
        "product_id": "flowdesk",
        "language": "en",
        "consent_given": True
    })
    assert res.status_code == 200
    data = res.json()
    assert "call_id" in data
    assert "ws_token" in data
    assert "ws_url" in data

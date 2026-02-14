"""Test job endpoints."""
import pytest
from fastapi.testclient import TestClient
from app import create_app


@pytest.fixture
def client():
    app = create_app()
    return TestClient(app)


def test_health_check(client):
    response = client.get("/health/check")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_list_jobs(client):
    response = client.get("/api/v1/jobs")
    assert response.status_code == 200
    data = response.json()
    assert "jobs" in data
    assert "total" in data


def test_scrape_jobs(client):
    response = client.post("/api/v1/jobs/scrape?source=linkedin")
    assert response.status_code == 200
    assert "success" in response.json()

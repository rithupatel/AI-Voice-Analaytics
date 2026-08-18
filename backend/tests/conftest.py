import os

import pytest

# Mock required environment variables before importing app
os.environ["JWT_SECRET_KEY"] = "test_secret_key"

from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c

@pytest.fixture
def auth_token(client):
    response = client.post("/token", data={"username": "testuser", "password": "password123"})
    assert response.status_code == 200
    return response.json()["access_token"]

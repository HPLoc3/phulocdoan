"""Shared pytest fixtures for the test suite.

- `api_url` — base URL of the running API (override via env `API_URL`).
- `client` — async httpx client scoped to a single test.
- `unique_email` — generates a fresh email per test to avoid collisions.
- `auth_headers` factory — registers a temporary user and returns Bearer headers.

Integration tests assume `docker compose up -d` is running.
"""
import os
import uuid

import httpx
import pytest


@pytest.fixture(scope="session")
def api_url() -> str:
    return os.environ.get("API_URL", "http://127.0.0.1:8000") + "/api/v1"


@pytest.fixture
async def client(api_url: str):
    async with httpx.AsyncClient(base_url=api_url, timeout=10.0) as c:
        yield c


@pytest.fixture
def unique_email() -> str:
    return f"pytest-{uuid.uuid4().hex[:10]}@example.com"


@pytest.fixture
async def auth_headers(client: httpx.AsyncClient, unique_email: str) -> dict[str, str]:
    """Register a fresh user and return Authorization headers."""
    res = await client.post(
        "/auth/register",
        json={
            "email": unique_email,
            "password": "secret123",
            "full_name": "Pytest User",
        },
    )
    assert res.status_code == 201, res.text
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

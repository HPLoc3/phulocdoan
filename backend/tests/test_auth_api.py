"""Integration tests for /api/v1/auth/* — requires running API."""
import pytest


pytestmark = pytest.mark.integration


class TestRegister:
    async def test_register_returns_token_and_user(self, client, unique_email):
        res = await client.post(
            "/auth/register",
            json={"email": unique_email, "password": "secret123", "full_name": "Reg User"},
        )
        assert res.status_code == 201
        data = res.json()
        assert data["token_type"] == "bearer"
        assert len(data["access_token"]) > 20
        assert data["user"]["email"] == unique_email
        assert data["user"]["role"] == "customer"

    async def test_duplicate_email_rejected(self, client, unique_email):
        payload = {"email": unique_email, "password": "secret123", "full_name": "Dup"}
        first = await client.post("/auth/register", json=payload)
        assert first.status_code == 201
        second = await client.post("/auth/register", json=payload)
        assert second.status_code == 409

    async def test_short_password_rejected(self, client, unique_email):
        res = await client.post(
            "/auth/register",
            json={"email": unique_email, "password": "abc", "full_name": "Short Pwd"},
        )
        assert res.status_code == 422


class TestLogin:
    async def test_login_with_valid_credentials(self, client, unique_email):
        await client.post(
            "/auth/register",
            json={"email": unique_email, "password": "secret123", "full_name": "Login User"},
        )
        res = await client.post(
            "/auth/login",
            json={"email": unique_email, "password": "secret123"},
        )
        assert res.status_code == 200
        assert "access_token" in res.json()

    async def test_login_with_wrong_password(self, client, unique_email):
        await client.post(
            "/auth/register",
            json={"email": unique_email, "password": "secret123", "full_name": "Login User"},
        )
        res = await client.post(
            "/auth/login",
            json={"email": unique_email, "password": "wrong"},
        )
        assert res.status_code == 401

    async def test_login_unknown_email(self, client):
        res = await client.post(
            "/auth/login",
            json={"email": "definitely-not-registered@example.com", "password": "whatever"},
        )
        assert res.status_code == 401


class TestMe:
    async def test_me_requires_auth(self, client):
        res = await client.get("/auth/me")
        assert res.status_code == 401

    async def test_me_returns_current_user(self, client, auth_headers, unique_email):
        res = await client.get("/auth/me", headers=auth_headers)
        assert res.status_code == 200
        assert res.json()["email"] == unique_email

    async def test_invalid_token_rejected(self, client):
        res = await client.get("/auth/me", headers={"Authorization": "Bearer not-a-real-jwt"})
        assert res.status_code == 401

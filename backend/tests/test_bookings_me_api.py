"""Integration tests for /api/v1/bookings/me — requires running API + seeded event_id=1 with available tickets."""
import uuid

import pytest


pytestmark = pytest.mark.integration


class TestBookingsMe:
    async def test_requires_auth(self, client):
        res = await client.get("/bookings/me")
        assert res.status_code == 401

    async def test_new_user_has_empty_list(self, client, auth_headers):
        res = await client.get("/bookings/me", headers=auth_headers)
        assert res.status_code == 200
        assert res.json() == []

    async def test_user_only_sees_their_own_bookings(self, client):
        """Two separate users should not see each other's bookings."""
        # User A
        ua = await client.post(
            "/auth/register",
            json={
                "email": f"a-{uuid.uuid4().hex[:8]}@example.com",
                "password": "secret123",
                "full_name": "User A",
            },
        )
        headers_a = {"Authorization": f"Bearer {ua.json()['access_token']}"}

        # A places a booking against seeded event/category
        booking_res = await client.post(
            "/bookings/",
            headers=headers_a,
            json={
                "event_id": 1,
                "idempotency_key": str(uuid.uuid4()),
                "items": [{"ticket_category_id": 1, "quantity": 1}],
            },
        )
        if booking_res.status_code != 201:
            pytest.skip(f"Cannot create booking (event/category may be sold out): {booking_res.text}")

        booking_id = booking_res.json()["id"]

        # User B
        ub = await client.post(
            "/auth/register",
            json={
                "email": f"b-{uuid.uuid4().hex[:8]}@example.com",
                "password": "secret123",
                "full_name": "User B",
            },
        )
        headers_b = {"Authorization": f"Bearer {ub.json()['access_token']}"}

        # A sees their booking
        list_a = (await client.get("/bookings/me", headers=headers_a)).json()
        assert any(b["id"] == booking_id for b in list_a)
        assert all("items" in b and isinstance(b["items"], list) for b in list_a)

        # B does NOT see A's booking
        list_b = (await client.get("/bookings/me", headers=headers_b)).json()
        assert all(b["id"] != booking_id for b in list_b)

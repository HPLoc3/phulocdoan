"""Integration tests for /api/v1/ticket-categories — requires running API + seeded event_id=1."""
import pytest


pytestmark = pytest.mark.integration

EVENT_ID = 1  # seeded in database/seed.sql


class TestCreate:
    async def test_create_seeds_remaining_to_total(self, client):
        res = await client.post(
            f"/events/{EVENT_ID}/ticket-categories",
            json={"name": f"PyTest-{__import__('uuid').uuid4().hex[:6]}", "price": 500_000, "total_quantity": 30},
        )
        assert res.status_code == 201
        data = res.json()
        assert data["total_quantity"] == 30
        assert data["remaining_quantity"] == 30
        assert data["max_per_booking"] == 5  # default

        # cleanup
        await client.delete(f"/ticket-categories/{data['id']}")

    async def test_create_for_unknown_event_returns_404(self, client):
        res = await client.post(
            "/events/999999/ticket-categories",
            json={"name": "Nope", "price": 100, "total_quantity": 1},
        )
        assert res.status_code == 404

    async def test_negative_price_rejected(self, client):
        res = await client.post(
            f"/events/{EVENT_ID}/ticket-categories",
            json={"name": "BadPrice", "price": -100, "total_quantity": 10},
        )
        assert res.status_code == 400

    async def test_zero_quantity_rejected(self, client):
        res = await client.post(
            f"/events/{EVENT_ID}/ticket-categories",
            json={"name": "ZeroQty", "price": 100, "total_quantity": 0},
        )
        assert res.status_code == 400


class TestUpdate:
    async def test_increasing_total_increases_remaining(self, client):
        created = (
            await client.post(
                f"/events/{EVENT_ID}/ticket-categories",
                json={"name": "GrowMe", "price": 100, "total_quantity": 10},
            )
        ).json()
        cat_id = created["id"]

        res = await client.patch(f"/ticket-categories/{cat_id}", json={"total_quantity": 50})
        assert res.status_code == 200
        data = res.json()
        assert data["total_quantity"] == 50
        assert data["remaining_quantity"] == 50  # nothing sold

        await client.delete(f"/ticket-categories/{cat_id}")

    async def test_update_unknown_id_returns_404(self, client):
        res = await client.patch("/ticket-categories/999999", json={"name": "X"})
        assert res.status_code == 404


class TestDelete:
    async def test_delete_unsold_category(self, client):
        created = (
            await client.post(
                f"/events/{EVENT_ID}/ticket-categories",
                json={"name": "ToDelete", "price": 100, "total_quantity": 5},
            )
        ).json()
        res = await client.delete(f"/ticket-categories/{created['id']}")
        assert res.status_code == 204

        # second delete is 404
        res2 = await client.delete(f"/ticket-categories/{created['id']}")
        assert res2.status_code == 404

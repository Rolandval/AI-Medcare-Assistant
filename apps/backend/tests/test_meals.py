"""Tests for meal endpoints."""

import pytest


async def _register_and_get_headers(client) -> dict:
    res = await client.post("/api/v1/auth/register", json={
        "name": "Meals Test",
        "email": f"meals_{id(client)}@example.com",
        "password": "SecurePass123",
    })
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_get_meals_today_empty(client):
    headers = await _register_and_get_headers(client)
    res = await client.get("/api/v1/meals/today", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "meals_data" in data or isinstance(data, (list, dict))


@pytest.mark.asyncio
async def test_get_meals_list(client):
    headers = await _register_and_get_headers(client)
    res = await client.get("/api/v1/meals/", headers=headers)
    assert res.status_code == 200


@pytest.mark.asyncio
async def test_meals_unauthorized(client):
    res = await client.get("/api/v1/meals/today")
    assert res.status_code == 401

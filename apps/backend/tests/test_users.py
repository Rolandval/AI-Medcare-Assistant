"""Tests for user endpoints — profile, health profile, export, delete."""

import pytest


async def _register_and_get_headers(client) -> dict:
    res = await client.post("/api/v1/auth/register", json={
        "name": "User Test",
        "email": f"user_{id(client)}@example.com",
        "password": "SecurePass123",
    })
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_get_profile(client):
    headers = await _register_and_get_headers(client)
    res = await client.get("/api/v1/users/me", headers=headers)
    assert res.status_code == 200
    assert res.json()["name"] == "User Test"


@pytest.mark.asyncio
async def test_update_profile(client):
    headers = await _register_and_get_headers(client)

    res = await client.patch("/api/v1/users/me", json={
        "name": "Оновлене Ім'я",
        "gender": "male",
        "location_city": "Львів",
    }, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["name"] == "Оновлене Ім'я"
    assert data["gender"] == "male"


@pytest.mark.asyncio
async def test_get_health_profile(client):
    headers = await _register_and_get_headers(client)
    res = await client.get("/api/v1/users/me/health-profile", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "chronic_conditions" in data


@pytest.mark.asyncio
async def test_update_health_profile(client):
    headers = await _register_and_get_headers(client)

    res = await client.patch("/api/v1/users/me/health-profile", json={
        "height_cm": 180,
        "weight_kg": 75,
        "chronic_conditions": ["hypertension"],
        "allergies": ["penicillin"],
        "health_goals": ["weight_loss", "better_sleep"],
    }, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["height_cm"] == 180
    assert "hypertension" in data["chronic_conditions"]


@pytest.mark.asyncio
async def test_export_data(client):
    headers = await _register_and_get_headers(client)
    res = await client.post("/api/v1/users/me/export-data", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "user" in data


@pytest.mark.asyncio
async def test_delete_account_endpoint_exists(client):
    """Verify delete endpoint is accessible (cascade integrity tested separately)."""
    headers = await _register_and_get_headers(client)
    # Just verify the endpoint responds (not 404/405)
    res = await client.delete("/api/v1/users/me", headers=headers)
    assert res.status_code in (200, 204)

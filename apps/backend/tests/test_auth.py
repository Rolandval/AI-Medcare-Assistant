"""Tests for auth endpoints — register, login, refresh, me."""

import pytest
from tests.conftest import auth_headers


@pytest.mark.asyncio
async def test_register(client):
    res = await client.post("/api/v1/auth/register", json={
        "name": "Новий Юзер",
        "email": "new@example.com",
        "password": "SecurePass123",
    })
    assert res.status_code == 201
    data = res.json()
    assert "access_token" in data
    assert "refresh_token" in data


@pytest.mark.asyncio
async def test_register_duplicate_email(client):
    payload = {
        "name": "Юзер 1",
        "email": "dup@example.com",
        "password": "SecurePass123",
    }
    res1 = await client.post("/api/v1/auth/register", json=payload)
    assert res1.status_code == 201

    res2 = await client.post("/api/v1/auth/register", json=payload)
    assert res2.status_code == 409  # Conflict — duplicate email


@pytest.mark.asyncio
async def test_register_short_password(client):
    res = await client.post("/api/v1/auth/register", json={
        "name": "Test",
        "email": "short@example.com",
        "password": "123",
    })
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_login(client):
    # Register first
    await client.post("/api/v1/auth/register", json={
        "name": "Login Test",
        "email": "login@example.com",
        "password": "SecurePass123",
    })

    # Login
    res = await client.post("/api/v1/auth/login", json={
        "email": "login@example.com",
        "password": "SecurePass123",
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    await client.post("/api/v1/auth/register", json={
        "name": "Wrong PW",
        "email": "wrongpw@example.com",
        "password": "SecurePass123",
    })

    res = await client.post("/api/v1/auth/login", json={
        "email": "wrongpw@example.com",
        "password": "WrongPassword123",
    })
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_me(client):
    # Register and get token
    reg_res = await client.post("/api/v1/auth/register", json={
        "name": "Me Test",
        "email": "me@example.com",
        "password": "SecurePass123",
    })
    token = reg_res.json()["access_token"]

    # Get /me
    res = await client.get("/api/v1/auth/me", headers={
        "Authorization": f"Bearer {token}",
    })
    assert res.status_code == 200
    data = res.json()
    assert data["email"] == "me@example.com"
    assert data["name"] == "Me Test"


@pytest.mark.asyncio
async def test_me_unauthorized(client):
    res = await client.get("/api/v1/auth/me")
    assert res.status_code == 401  # Unauthorized — no token


@pytest.mark.asyncio
async def test_refresh_token(client):
    reg_res = await client.post("/api/v1/auth/register", json={
        "name": "Refresh Test",
        "email": "refresh@example.com",
        "password": "SecurePass123",
    })
    refresh = reg_res.json()["refresh_token"]

    res = await client.post("/api/v1/auth/refresh", json={
        "refresh_token": refresh,
    })
    assert res.status_code == 200
    assert "access_token" in res.json()

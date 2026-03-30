"""Tests for health endpoints — metrics and surveys."""

import pytest


async def _register_and_get_headers(client) -> dict:
    """Helper: register user and return auth headers."""
    res = await client.post("/api/v1/auth/register", json={
        "name": "Health Test",
        "email": f"health_{id(client)}@example.com",
        "password": "SecurePass123",
    })
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_log_metric(client):
    headers = await _register_and_get_headers(client)

    res = await client.post("/api/v1/health/metrics", json={
        "metric_type": "weight",
        "value": 75.5,
        "unit": "kg",
    }, headers=headers)
    assert res.status_code in (200, 201)


@pytest.mark.asyncio
async def test_log_blood_pressure(client):
    headers = await _register_and_get_headers(client)

    # Systolic
    res1 = await client.post("/api/v1/health/metrics", json={
        "metric_type": "blood_pressure_systolic",
        "value": 120,
        "unit": "mmHg",
    }, headers=headers)
    assert res1.status_code in (200, 201)

    # Diastolic
    res2 = await client.post("/api/v1/health/metrics", json={
        "metric_type": "blood_pressure_diastolic",
        "value": 80,
        "unit": "mmHg",
    }, headers=headers)
    assert res2.status_code in (200, 201)


@pytest.mark.asyncio
async def test_get_metrics(client):
    headers = await _register_and_get_headers(client)

    # Log a metric first
    await client.post("/api/v1/health/metrics", json={
        "metric_type": "heart_rate",
        "value": 72,
        "unit": "bpm",
    }, headers=headers)

    res = await client.get("/api/v1/health/metrics", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 1


@pytest.mark.asyncio
async def test_get_latest_metrics(client):
    headers = await _register_and_get_headers(client)

    await client.post("/api/v1/health/metrics", json={
        "metric_type": "temperature",
        "value": 36.6,
        "unit": "°C",
    }, headers=headers)

    res = await client.get("/api/v1/health/metrics/latest", headers=headers)
    assert res.status_code == 200


@pytest.mark.asyncio
async def test_submit_survey(client):
    headers = await _register_and_get_headers(client)

    res = await client.post("/api/v1/health/surveys", json={
        "survey_type": "morning",
        "wellbeing_score": 7,
        "mood": "good",
        "sleep_hours": 7.5,
    }, headers=headers)
    assert res.status_code in (200, 201)


@pytest.mark.asyncio
async def test_get_surveys(client):
    headers = await _register_and_get_headers(client)

    await client.post("/api/v1/health/surveys", json={
        "survey_type": "evening",
        "wellbeing_score": 8,
        "energy_level": 7,
        "stress_level": "low",
    }, headers=headers)

    res = await client.get("/api/v1/health/surveys", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)

"""Tests for core security — password hashing, JWT tokens."""

import uuid
from datetime import timedelta

import pytest

from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)


def test_hash_and_verify_password():
    plain = "MySecurePassword123"
    hashed = hash_password(plain)
    assert hashed != plain
    assert verify_password(plain, hashed)
    assert not verify_password("WrongPassword", hashed)


def test_create_and_decode_access_token():
    user_id = str(uuid.uuid4())
    token = create_access_token({"sub": user_id})
    payload = decode_token(token)
    assert payload is not None
    assert payload["sub"] == user_id
    assert payload["type"] == "access"


def test_create_and_decode_refresh_token():
    user_id = str(uuid.uuid4())
    token = create_refresh_token({"sub": user_id})
    payload = decode_token(token)
    assert payload is not None
    assert payload["sub"] == user_id
    assert payload["type"] == "refresh"


def test_decode_invalid_token():
    payload = decode_token("this.is.not.a.valid.jwt")
    assert payload is None


def test_decode_empty_token():
    payload = decode_token("")
    assert payload is None


def test_access_token_with_custom_expiry():
    token = create_access_token(
        {"sub": "test-user"},
        expires_delta=timedelta(minutes=5),
    )
    payload = decode_token(token)
    assert payload is not None
    assert payload["type"] == "access"

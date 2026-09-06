"""Tests for password hashing and JWT token utilities."""

import pytest
import time
from app.utils.security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
)


def test_hash_and_verify_password():
    """Hashing a password then verifying it returns True."""
    pwd = "secret123"
    hashed = hash_password(pwd)
    assert hashed != pwd
    assert verify_password(pwd, hashed) is True


def test_verify_password_wrong():
    """Wrong password returns False."""
    hashed = hash_password("correct")
    assert verify_password("wrong", hashed) is False


def test_verify_password_invalid_hash():
    """Malformed hash returns False rather than raising."""
    assert verify_password("any", "not-a-valid-bcrypt-hash") is False


def test_jwt_round_trip():
    """Encoded payload can be decoded back.

    Note: python-jose requires ``sub`` to be a string per the JWT spec, so
    the create_access_token helper coerces int -> str. We assert the string
    form here.
    """
    token = create_access_token(data={"sub": 42})
    payload = decode_access_token(token)
    assert payload is not None
    assert int(payload["sub"]) == 42
    assert "exp" in payload


def test_jwt_invalid_token():
    """Garbage token returns None."""
    assert decode_access_token("not.a.jwt") is None
    assert decode_access_token("") is None


def test_passwords_are_unique_per_call():
    """bcrypt uses random salt — two hashes of the same password differ."""
    a = hash_password("same")
    b = hash_password("same")
    assert a != b
    # but both verify
    assert verify_password("same", a)
    assert verify_password("same", b)

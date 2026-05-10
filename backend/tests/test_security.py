"""Pure unit tests for app.core.security — no DB / no network."""
from datetime import timedelta

import pytest
from jose import jwt

from app.core.config import settings
from app.core.security import (
    create_access_token,
    get_password_hash,
    verify_password,
)


class TestPasswordHashing:
    def test_hash_is_not_plaintext(self):
        h = get_password_hash("hunter2")
        assert h != "hunter2"
        assert h.startswith("$2b$")  # bcrypt prefix

    def test_verify_password_matches(self):
        h = get_password_hash("hunter2")
        assert verify_password("hunter2", h) is True

    def test_verify_password_rejects_wrong(self):
        h = get_password_hash("hunter2")
        assert verify_password("wrong", h) is False

    def test_hash_is_salted(self):
        """Hashing the same password twice should produce different hashes."""
        assert get_password_hash("same") != get_password_hash("same")


class TestJWT:
    def test_token_round_trip(self):
        token = create_access_token(subject=42)
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        assert payload["sub"] == "42"
        assert "exp" in payload

    def test_subject_is_stringified(self):
        token = create_access_token(subject=123)
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        assert isinstance(payload["sub"], str)

    def test_token_with_custom_expiry(self):
        token = create_access_token(subject=1, expires_delta=timedelta(seconds=1))
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        assert payload["exp"] > 0

    def test_invalid_signature_rejected(self):
        token = create_access_token(subject=1)
        with pytest.raises(jwt.JWTError):
            jwt.decode(token, "wrong-secret", algorithms=[settings.ALGORITHM])

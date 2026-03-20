import hashlib
import hmac
import json
import time
import base64

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import settings

router = APIRouter()

TOKEN_EXPIRY_SECONDS = 60 * 60 * 24 * 7  # 7 days


def _sign(payload: dict) -> str:
    """Create a simple signed token (base64 payload + HMAC signature)."""
    payload_bytes = base64.urlsafe_b64encode(json.dumps(payload).encode())
    sig = hmac.new(settings.auth_secret.encode(), payload_bytes, hashlib.sha256).hexdigest()
    return f"{payload_bytes.decode()}.{sig}"


def verify_token(token: str) -> dict | None:
    """Verify and decode a signed token. Returns payload or None."""
    parts = token.split(".", 1)
    if len(parts) != 2:
        return None
    payload_b64, sig = parts
    expected_sig = hmac.new(
        settings.auth_secret.encode(), payload_b64.encode(), hashlib.sha256
    ).hexdigest()
    if not hmac.compare_digest(sig, expected_sig):
        return None
    try:
        payload = json.loads(base64.urlsafe_b64decode(payload_b64))
    except Exception:
        return None
    if payload.get("exp", 0) < time.time():
        return None
    return payload


class LoginRequest(BaseModel):
    password: str


class LoginResponse(BaseModel):
    token: str


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest):
    if not settings.auth_password:
        raise HTTPException(500, "AUTH_PASSWORD not configured on server")

    # Constant-time comparison
    if not hmac.compare_digest(body.password, settings.auth_password):
        raise HTTPException(401, "Wrong password")

    token = _sign({"exp": int(time.time()) + TOKEN_EXPIRY_SECONDS})
    return LoginResponse(token=token)


@router.get("/me")
def me():
    """Returns 200 if the request passed auth middleware (token is valid)."""
    return {"ok": True}

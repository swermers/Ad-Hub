import hashlib
import hmac
import json
import secrets
import time
import base64
import uuid

import bcrypt
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.permissions import get_current_user, require_admin

router = APIRouter()

TOKEN_EXPIRY_SECONDS = 60 * 60 * 24 * 7  # 7 days


# ─── Token signing ────────────────────────────────────────────────────────────

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


# ─── Login (backwards-compatible + user-based) ────────────────────────────────

class LoginRequest(BaseModel):
    password: str
    email: str | None = None


class LoginResponse(BaseModel):
    token: str
    role: str
    display_name: str | None = None


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    from app.models.user import User

    # Try user-based login first (if email provided)
    if body.email:
        user = db.query(User).filter(User.email == body.email).first()
        if not user:
            raise HTTPException(401, "Invalid credentials")
        if not bcrypt.checkpw(body.password.encode(), user.password_hash.encode()):
            raise HTTPException(401, "Invalid credentials")
        token = _sign({
            "user_id": user.id,
            "role": user.role,
            "exp": int(time.time()) + TOKEN_EXPIRY_SECONDS,
        })
        return LoginResponse(token=token, role=user.role, display_name=user.display_name)

    # Legacy password-only login (backwards compatible)
    if not settings.auth_password:
        raise HTTPException(500, "AUTH_PASSWORD not configured on server")
    if not hmac.compare_digest(body.password, settings.auth_password):
        raise HTTPException(401, "Wrong password")

    token = _sign({
        "role": "admin",
        "exp": int(time.time()) + TOKEN_EXPIRY_SECONDS,
    })
    return LoginResponse(token=token, role="admin", display_name="Admin")


@router.get("/me")
def me(user: dict = Depends(get_current_user)):
    """Returns current user info."""
    return {
        "ok": True,
        "role": user["role"],
        "display_name": user.get("display_name") or user.get("label", "Unknown"),
        "id": user["id"],
    }


# ─── Agent API Key Management (admin only) ────────────────────────────────────

class CreateAgentKeyRequest(BaseModel):
    label: str = "Default Agent"
    product_id: str | None = None
    scopes: list[str] = ["generate", "schedule", "publish", "monitor", "optimize"]


class AgentKeyResponse(BaseModel):
    id: str
    key_prefix: str
    label: str
    product_id: str | None
    scopes: list[str]
    is_active: bool
    created_at: str


class AgentKeyCreatedResponse(AgentKeyResponse):
    raw_key: str  # Only returned once at creation time


@router.post("/agent-keys", response_model=AgentKeyCreatedResponse)
def create_agent_key(
    body: CreateAgentKeyRequest,
    db: Session = Depends(get_db),
    user: dict = Depends(require_admin),
):
    """Create a new agent API key. The raw key is only shown once."""
    from app.models.user import AgentAPIKey

    raw_key = f"adhub_{secrets.token_urlsafe(32)}"
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    key_prefix = raw_key[:12]

    agent_key = AgentAPIKey(
        id=str(uuid.uuid4()),
        workspace_id=user.get("workspace_id"),  # Inherit workspace from creating admin
        product_id=body.product_id,
        key_hash=key_hash,
        key_prefix=key_prefix,
        label=body.label,
        role="agent",
        scopes=json.dumps(body.scopes),
        is_active=True,
    )
    db.add(agent_key)
    db.commit()

    return AgentKeyCreatedResponse(
        id=agent_key.id,
        key_prefix=key_prefix,
        label=body.label,
        product_id=body.product_id,
        scopes=body.scopes,
        is_active=True,
        created_at=agent_key.created_at.isoformat(),
        raw_key=raw_key,
    )


@router.get("/agent-keys", response_model=list[AgentKeyResponse])
def list_agent_keys(
    db: Session = Depends(get_db),
    user: dict = Depends(require_admin),
):
    """List agent API keys for this workspace (without the raw key)."""
    from app.models.user import AgentAPIKey
    from app.permissions import scope_query

    query = scope_query(db.query(AgentAPIKey), AgentAPIKey, user)
    keys = query.order_by(AgentAPIKey.created_at.desc()).all()
    results = []
    for k in keys:
        scopes = []
        if k.scopes:
            try:
                scopes = json.loads(k.scopes)
            except (json.JSONDecodeError, TypeError):
                pass
        results.append(AgentKeyResponse(
            id=k.id,
            key_prefix=k.key_prefix,
            label=k.label or "",
            product_id=k.product_id,
            scopes=scopes,
            is_active=k.is_active,
            created_at=k.created_at.isoformat(),
        ))
    return results


@router.delete("/agent-keys/{key_id}", status_code=204)
def revoke_agent_key(
    key_id: str,
    db: Session = Depends(get_db),
    user: dict = Depends(require_admin),
):
    """Revoke (deactivate) an agent API key."""
    from app.models.user import AgentAPIKey

    key = db.query(AgentAPIKey).filter(AgentAPIKey.id == key_id).first()
    if not key:
        raise HTTPException(404, "Agent key not found")
    key.is_active = False
    db.commit()


# ─── Seed Default Admin (called on startup) ──────────────────────────────────

def seed_default_admin(db: Session):
    """Create a default admin user if none exist. Uses AUTH_PASSWORD from env."""
    from app.models.user import User

    existing = db.query(User).first()
    if existing:
        return  # Users already exist, don't seed

    if not settings.auth_password:
        return  # No password configured, skip seeding

    admin = User(
        id=str(uuid.uuid4()),
        email="admin@adhub.local",
        password_hash=bcrypt.hashpw(settings.auth_password.encode(), bcrypt.gensalt()).decode(),
        display_name="Admin",
        role="admin",
    )
    db.add(admin)
    db.commit()

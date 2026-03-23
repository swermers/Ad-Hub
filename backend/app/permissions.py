"""
Role-based permission system for the two-seat architecture.

Roles:
  admin  — Human seat. Full access to everything.
  viewer — Human seat (read-only). Can view but not mutate.
  agent  — Bot seat. Can generate, schedule, publish, monitor, optimize.
           CANNOT: change API keys, modify budgets, alter connections, edit brand profile,
           modify guardrails, manage users.

Usage in routers:
    from app.permissions import require_admin, require_human, require_any

    @router.post("/connections", dependencies=[Depends(require_admin)])
    def create_connection(...): ...

    @router.get("/analytics", dependencies=[Depends(require_any)])
    def get_analytics(...): ...
"""

import hashlib
import json
from datetime import datetime, timezone

from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database import get_db

# ─── Role hierarchy ──────────────────────────────────────────────────────────

ROLE_ADMIN = "admin"
ROLE_VIEWER = "viewer"
ROLE_AGENT = "agent"

# What the agent role is allowed to do (endpoint tags / action categories)
AGENT_ALLOWED_ACTIONS = {
    "generate",       # content + ad generation
    "schedule",       # schedule posts
    "publish",        # publish to platforms
    "monitor",        # read analytics, performance data
    "optimize",       # run optimizer, pause/promote ads
    "content:read",   # read content pieces
    "content:write",  # create/edit content (drafts)
    "campaign:read",  # read campaigns
    "campaign:write", # create campaigns (within guardrails)
    "pain_points",    # research pain points
    "seeds:read",     # read seed bank
}

# What the agent is explicitly DENIED (even if authenticated)
AGENT_DENIED_ACTIONS = {
    "connections",    # API keys, platform tokens
    "brand_profile",  # brand voice/rules (human-curated)
    "guardrails",     # safety guardrails (human-set)
    "users",          # user management
    "settings",       # system configuration
    "billing",        # subscription management
    "products:delete", # delete products
}


# ─── Current user extraction ─────────────────────────────────────────────────

def get_current_user(request: Request, db: Session = Depends(get_db)) -> dict:
    """Extract the current user/agent from the request.

    The middleware has already verified the token. This function decodes it
    to get the role and identity for permission checking.

    Returns dict with: id, role, email|label, product_id (for agents)
    """
    auth_header = request.headers.get("Authorization", "")

    # Agent API key auth (prefix: "Bearer adhub_")
    if auth_header.startswith("Bearer adhub_"):
        return _resolve_agent_key(auth_header.removeprefix("Bearer "), db)

    # Human token auth
    if auth_header.startswith("Bearer "):
        return _resolve_human_token(auth_header.removeprefix("Bearer "), db)

    # No auth header — middleware should have blocked this, but be safe
    raise HTTPException(status_code=401, detail="Not authenticated")


def _resolve_human_token(token: str, db: Session) -> dict:
    """Decode a human auth token and return user info."""
    from app.routers.auth import verify_token

    payload = verify_token(token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = payload.get("user_id")
    role = payload.get("role", ROLE_ADMIN)

    if user_id:
        from app.models.user import User
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            return {
                "id": user.id,
                "role": user.role,
                "email": user.email,
                "display_name": user.display_name,
            }

    # Legacy token (no user_id) — treat as admin for backwards compatibility
    return {
        "id": "legacy",
        "role": role,
        "email": None,
        "display_name": "Admin",
    }


def _resolve_agent_key(key: str, db: Session) -> dict:
    """Verify an agent API key and return agent info."""
    from app.models.user import AgentAPIKey

    key_hash = hashlib.sha256(key.encode()).hexdigest()
    agent_key = db.query(AgentAPIKey).filter(
        AgentAPIKey.key_hash == key_hash,
        AgentAPIKey.is_active.is_(True),
    ).first()

    if not agent_key:
        raise HTTPException(status_code=401, detail="Invalid agent API key")

    # Update last used timestamp
    agent_key.last_used_at = datetime.now(timezone.utc)
    db.commit()

    scopes = []
    if agent_key.scopes:
        try:
            scopes = json.loads(agent_key.scopes)
        except (json.JSONDecodeError, TypeError):
            pass

    return {
        "id": agent_key.id,
        "role": ROLE_AGENT,
        "label": agent_key.label,
        "product_id": agent_key.product_id,
        "scopes": scopes,
    }


# ─── Permission dependencies (use with Depends()) ────────────────────────────

def require_admin(user: dict = Depends(get_current_user)):
    """Only admin users can access this endpoint."""
    if user["role"] != ROLE_ADMIN:
        raise HTTPException(
            status_code=403,
            detail="Admin access required. Bot agents cannot access this resource.",
        )
    return user


def require_human(user: dict = Depends(get_current_user)):
    """Admin or viewer — no bots allowed."""
    if user["role"] == ROLE_AGENT:
        raise HTTPException(
            status_code=403,
            detail="Human access required. Bot agents cannot access this resource.",
        )
    return user


def require_any(user: dict = Depends(get_current_user)):
    """Any authenticated role (admin, viewer, or agent)."""
    return user


def require_agent_or_admin(user: dict = Depends(get_current_user)):
    """Agent or admin — viewers cannot write."""
    if user["role"] == ROLE_VIEWER:
        raise HTTPException(status_code=403, detail="Write access required.")
    return user


def deny_agent(user: dict = Depends(get_current_user)):
    """Explicitly block agents from config-mutation endpoints."""
    if user["role"] == ROLE_AGENT:
        raise HTTPException(
            status_code=403,
            detail="Bot agents cannot modify configuration. This action requires human authorization.",
        )
    return user

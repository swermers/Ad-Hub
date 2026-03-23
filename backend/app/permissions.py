"""
Role-based permission system for the two-seat architecture.

Roles:
  admin  — Human seat. Full access to everything in their workspace.
  viewer — Human seat (read-only). Can view but not mutate.
  agent  — Bot seat. Can generate, schedule, publish, monitor, optimize.
           CANNOT: change API keys, modify budgets, alter connections, edit brand profile,
           modify guardrails, manage users.

Workspace isolation:
  Every user and agent key belongs to a workspace. All queries are automatically
  filtered to only return data within the caller's workspace.

Usage in routers:
    from app.permissions import require_admin, require_human, require_any, get_workspace_id

    @router.post("/connections", dependencies=[Depends(require_admin)])
    def create_connection(...): ...

    @router.get("/products")
    def list_products(workspace_id: str = Depends(get_workspace_id), db=Depends(get_db)):
        return db.query(Product).filter(Product.workspace_id == workspace_id).all()
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

    Returns dict with: id, role, email|label, workspace_id, product_id (for agents)
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
                "workspace_id": user.workspace_id,
            }

    # Legacy token (no user_id) — treat as admin with no workspace filter
    return {
        "id": "legacy",
        "role": role,
        "email": None,
        "display_name": "Admin",
        "workspace_id": None,  # Legacy: no workspace filter (sees all)
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
        "workspace_id": agent_key.workspace_id,
        "product_id": agent_key.product_id,
        "scopes": scopes,
    }


# ─── Workspace scoping ───────────────────────────────────────────────────────

def get_workspace_id(user: dict = Depends(get_current_user)) -> str | None:
    """Extract workspace_id from the current user for query filtering.

    Returns the workspace_id or None (for legacy/superadmin users who see all data).
    Routers use this to filter queries: Product.workspace_id == workspace_id
    """
    return user.get("workspace_id")


def require_product_access(product_id: str, user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Verify the current user has access to a specific product.

    Checks that the product belongs to the user's workspace.
    For agents with product_id scope, also checks product match.
    """
    from app.models import Product

    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Workspace check (skip for legacy users with no workspace)
    ws_id = user.get("workspace_id")
    if ws_id and product.workspace_id and product.workspace_id != ws_id:
        raise HTTPException(status_code=404, detail="Product not found")

    # Agent product scope check
    if user["role"] == ROLE_AGENT and user.get("product_id"):
        if user["product_id"] != product_id:
            raise HTTPException(
                status_code=403,
                detail="Agent key is scoped to a different product.",
            )

    return product


def scope_query(query, model, user: dict):
    """Apply workspace scoping to a SQLAlchemy query.

    Usage:
        query = db.query(Product)
        query = scope_query(query, Product, user)
        products = query.all()
    """
    ws_id = user.get("workspace_id")
    if ws_id and hasattr(model, "workspace_id"):
        query = query.filter(model.workspace_id == ws_id)
    return query


def scope_product_query(query, model, user: dict, db: Session):
    """Apply workspace scoping via product_id for models that don't have workspace_id directly.

    For models like ContentPiece, Seed, etc. that have product_id but not workspace_id,
    this filters to only products in the user's workspace.
    """
    ws_id = user.get("workspace_id")
    if ws_id and hasattr(model, "product_id"):
        from app.models import Product
        workspace_product_ids = [
            p.id for p in db.query(Product.id).filter(Product.workspace_id == ws_id).all()
        ]
        query = query.filter(model.product_id.in_(workspace_product_ids))
    return query


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

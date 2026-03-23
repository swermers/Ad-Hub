"""Billing router — subscription management, Stripe integration, usage dashboard.

Endpoints:
  GET  /billing/usage          — Current usage vs limits
  GET  /billing/subscription   — Current subscription details
  POST /billing/checkout       — Create Stripe checkout session
  POST /billing/portal         — Create Stripe billing portal session
  POST /billing/webhook        — Stripe webhook handler (public, verified by signature)
  PUT  /billing/tier           — Change tier (for testing/admin without Stripe)
"""

import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.engines.billing import TIER_LIMITS, get_tier_limits, get_usage_summary
from app.models.billing import Subscription
from app.models.workspace import Workspace
from app.permissions import get_current_user, require_admin

logger = logging.getLogger(__name__)

router = APIRouter()


# ─── Schemas ──────────────────────────────────────────────────────────────────

class UsageResponse(BaseModel):
    tier: str
    billing_period: dict
    usage: dict
    limits: dict
    utilization: dict


class SubscriptionResponse(BaseModel):
    id: str | None
    tier: str
    status: str
    monthly_amount_cents: int
    currency: str
    current_period_start: str | None
    current_period_end: str | None
    trial_end: str | None
    cancel_at_period_end: bool
    stripe_customer_id: str | None


class CheckoutRequest(BaseModel):
    tier: str  # starter, pro, agency


class CheckoutResponse(BaseModel):
    checkout_url: str | None
    message: str


class TierUpdateRequest(BaseModel):
    tier: str


class TierInfo(BaseModel):
    name: str
    price_monthly_cents: int
    max_products: int
    max_generations_per_month: int
    max_platforms: int
    ad_management: bool
    white_label: bool


# ─── Usage & Subscription Info ────────────────────────────────────────────────

@router.get("/usage", response_model=UsageResponse)
def get_usage(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    """Get current usage vs limits for the workspace."""
    ws_id = user.get("workspace_id")
    if not ws_id:
        # Legacy user — return unlimited
        return UsageResponse(
            tier="legacy",
            billing_period={"start": "", "end": ""},
            usage={},
            limits={},
            utilization={},
        )

    summary = get_usage_summary(db, ws_id)
    return UsageResponse(**summary)


@router.get("/subscription", response_model=SubscriptionResponse)
def get_subscription(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    """Get current subscription details."""
    ws_id = user.get("workspace_id")
    if not ws_id:
        return SubscriptionResponse(
            id=None, tier="legacy", status="active",
            monthly_amount_cents=0, currency="usd",
            current_period_start=None, current_period_end=None,
            trial_end=None, cancel_at_period_end=False,
            stripe_customer_id=None,
        )

    sub = db.query(Subscription).filter(Subscription.workspace_id == ws_id).first()
    workspace = db.query(Workspace).filter(Workspace.id == ws_id).first()

    if not sub:
        tier = workspace.tier if workspace else "starter"
        return SubscriptionResponse(
            id=None, tier=tier, status="active",
            monthly_amount_cents=get_tier_limits(tier)["price_monthly_cents"],
            currency="usd",
            current_period_start=None, current_period_end=None,
            trial_end=None, cancel_at_period_end=False,
            stripe_customer_id=None,
        )

    return SubscriptionResponse(
        id=sub.id,
        tier=sub.tier,
        status=sub.status,
        monthly_amount_cents=sub.monthly_amount_cents,
        currency=sub.currency,
        current_period_start=sub.current_period_start.isoformat() if sub.current_period_start else None,
        current_period_end=sub.current_period_end.isoformat() if sub.current_period_end else None,
        trial_end=sub.trial_end.isoformat() if sub.trial_end else None,
        cancel_at_period_end=sub.cancel_at_period_end,
        stripe_customer_id=sub.stripe_customer_id,
    )


@router.get("/tiers", response_model=list[TierInfo])
def list_tiers():
    """List all available subscription tiers and their limits."""
    return [
        TierInfo(name=name, **{k: v for k, v in limits.items() if k != "max_users"})
        for name, limits in TIER_LIMITS.items()
    ]


# ─── Stripe Checkout & Portal ────────────────────────────────────────────────

@router.post("/checkout", response_model=CheckoutResponse)
def create_checkout_session(
    body: CheckoutRequest,
    db: Session = Depends(get_db),
    user: dict = Depends(require_admin),
):
    """Create a Stripe checkout session for subscription signup/upgrade."""
    if not settings.stripe_secret_key:
        raise HTTPException(400, "Stripe is not configured. Set STRIPE_SECRET_KEY in .env")

    import stripe
    stripe.api_key = settings.stripe_secret_key

    ws_id = user.get("workspace_id")
    if not ws_id:
        raise HTTPException(400, "No workspace found")

    # Map tier to Stripe price ID
    price_map = {
        "starter": settings.stripe_starter_price_id,
        "pro": settings.stripe_pro_price_id,
        "agency": settings.stripe_agency_price_id,
    }
    price_id = price_map.get(body.tier)
    if not price_id:
        raise HTTPException(400, f"Invalid tier: {body.tier}")

    # Get or create Stripe customer
    sub = db.query(Subscription).filter(Subscription.workspace_id == ws_id).first()
    customer_id = sub.stripe_customer_id if sub else None

    if not customer_id:
        customer = stripe.Customer.create(
            email=user.get("email"),
            metadata={"workspace_id": ws_id},
        )
        customer_id = customer.id

        if not sub:
            sub = Subscription(workspace_id=ws_id, tier=body.tier, status="incomplete")
            db.add(sub)
        sub.stripe_customer_id = customer_id
        db.commit()

    session = stripe.checkout.Session.create(
        customer=customer_id,
        payment_method_types=["card"],
        line_items=[{"price": price_id, "quantity": 1}],
        mode="subscription",
        success_url=f"{settings.app_url}/settings/billing?success=true",
        cancel_url=f"{settings.app_url}/settings/billing?canceled=true",
        metadata={"workspace_id": ws_id, "tier": body.tier},
    )

    return CheckoutResponse(checkout_url=session.url, message="Redirect to checkout")


@router.post("/portal", response_model=CheckoutResponse)
def create_portal_session(
    db: Session = Depends(get_db),
    user: dict = Depends(require_admin),
):
    """Create a Stripe billing portal session for managing subscription."""
    if not settings.stripe_secret_key:
        raise HTTPException(400, "Stripe is not configured")

    import stripe
    stripe.api_key = settings.stripe_secret_key

    ws_id = user.get("workspace_id")
    sub = db.query(Subscription).filter(Subscription.workspace_id == ws_id).first()

    if not sub or not sub.stripe_customer_id:
        raise HTTPException(400, "No active subscription found")

    session = stripe.billing_portal.Session.create(
        customer=sub.stripe_customer_id,
        return_url=f"{settings.app_url}/settings/billing",
    )

    return CheckoutResponse(checkout_url=session.url, message="Redirect to billing portal")


# ─── Stripe Webhook ──────────────────────────────────────────────────────────

@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """Handle Stripe webhook events. This endpoint is public but verified by signature."""
    if not settings.stripe_secret_key:
        raise HTTPException(400, "Stripe not configured")

    import stripe
    stripe.api_key = settings.stripe_secret_key

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.stripe_webhook_secret
        )
    except (ValueError, stripe.error.SignatureVerificationError):
        raise HTTPException(400, "Invalid webhook signature")

    event_type = event["type"]
    data = event["data"]["object"]

    if event_type == "checkout.session.completed":
        _handle_checkout_completed(db, data)
    elif event_type == "customer.subscription.updated":
        _handle_subscription_updated(db, data)
    elif event_type == "customer.subscription.deleted":
        _handle_subscription_deleted(db, data)
    elif event_type == "invoice.payment_failed":
        _handle_payment_failed(db, data)

    return {"received": True}


def _handle_checkout_completed(db: Session, session_data: dict):
    """Process successful checkout — activate subscription."""
    ws_id = session_data.get("metadata", {}).get("workspace_id")
    tier = session_data.get("metadata", {}).get("tier", "starter")
    stripe_sub_id = session_data.get("subscription")
    customer_id = session_data.get("customer")

    if not ws_id:
        logger.warning("Checkout completed without workspace_id in metadata")
        return

    sub = db.query(Subscription).filter(Subscription.workspace_id == ws_id).first()
    if not sub:
        sub = Subscription(workspace_id=ws_id)
        db.add(sub)

    sub.stripe_customer_id = customer_id
    sub.stripe_subscription_id = stripe_sub_id
    sub.tier = tier
    sub.status = "active"
    sub.monthly_amount_cents = get_tier_limits(tier)["price_monthly_cents"]
    sub.updated_at = datetime.now(timezone.utc)

    # Update workspace tier and limits
    workspace = db.query(Workspace).filter(Workspace.id == ws_id).first()
    if workspace:
        limits = get_tier_limits(tier)
        workspace.tier = tier
        workspace.max_products = limits["max_products"]
        workspace.max_generations_per_month = limits["max_generations_per_month"]

    db.commit()
    logger.info("Subscription activated for workspace %s: %s", ws_id, tier)


def _handle_subscription_updated(db: Session, sub_data: dict):
    """Handle subscription changes (upgrade, downgrade, renewal)."""
    stripe_sub_id = sub_data.get("id")
    sub = db.query(Subscription).filter(Subscription.stripe_subscription_id == stripe_sub_id).first()
    if not sub:
        return

    sub.status = sub_data.get("status", sub.status)

    period = sub_data.get("current_period_start")
    if period:
        sub.current_period_start = datetime.fromtimestamp(period, tz=timezone.utc)
    period_end = sub_data.get("current_period_end")
    if period_end:
        sub.current_period_end = datetime.fromtimestamp(period_end, tz=timezone.utc)

    sub.cancel_at_period_end = sub_data.get("cancel_at_period_end", False)
    sub.updated_at = datetime.now(timezone.utc)
    db.commit()


def _handle_subscription_deleted(db: Session, sub_data: dict):
    """Handle subscription cancellation."""
    stripe_sub_id = sub_data.get("id")
    sub = db.query(Subscription).filter(Subscription.stripe_subscription_id == stripe_sub_id).first()
    if not sub:
        return

    sub.status = "canceled"
    sub.canceled_at = datetime.now(timezone.utc)
    sub.updated_at = datetime.now(timezone.utc)
    db.commit()

    logger.info("Subscription canceled for workspace %s", sub.workspace_id)


def _handle_payment_failed(db: Session, invoice_data: dict):
    """Handle failed payment — mark subscription as past_due."""
    customer_id = invoice_data.get("customer")
    sub = db.query(Subscription).filter(Subscription.stripe_customer_id == customer_id).first()
    if not sub:
        return

    sub.status = "past_due"
    sub.updated_at = datetime.now(timezone.utc)
    db.commit()

    logger.warning("Payment failed for workspace %s", sub.workspace_id)


# ─── Admin: Manual Tier Change (for testing without Stripe) ──────────────────

@router.put("/tier", dependencies=[Depends(require_admin)])
def update_tier(
    body: TierUpdateRequest,
    db: Session = Depends(get_db),
    user: dict = Depends(require_admin),
):
    """Manually change workspace tier (admin/testing only)."""
    if body.tier not in TIER_LIMITS:
        raise HTTPException(400, f"Invalid tier. Options: {list(TIER_LIMITS.keys())}")

    ws_id = user.get("workspace_id")
    if not ws_id:
        raise HTTPException(400, "No workspace found")

    workspace = db.query(Workspace).filter(Workspace.id == ws_id).first()
    if not workspace:
        raise HTTPException(404, "Workspace not found")

    limits = get_tier_limits(body.tier)
    workspace.tier = body.tier
    workspace.max_products = limits["max_products"]
    workspace.max_generations_per_month = limits["max_generations_per_month"]
    workspace.updated_at = datetime.now(timezone.utc)

    # Update or create subscription record
    sub = db.query(Subscription).filter(Subscription.workspace_id == ws_id).first()
    if not sub:
        sub = Subscription(workspace_id=ws_id)
        db.add(sub)
    sub.tier = body.tier
    sub.status = "active"
    sub.monthly_amount_cents = limits["price_monthly_cents"]
    sub.updated_at = datetime.now(timezone.utc)

    db.commit()

    return {
        "tier": body.tier,
        "limits": limits,
        "message": f"Workspace upgraded to {body.tier}",
    }

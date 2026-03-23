import hashlib

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import settings

# Routes that don't require auth
PUBLIC_PATHS = {"/api/auth/login", "/api/health", "/api/billing/webhook"}


class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Skip auth if no password is configured (local dev)
        if not settings.auth_password:
            return await call_next(request)

        path = request.url.path

        # Allow public routes
        if path in PUBLIC_PATHS:
            return await call_next(request)

        # Allow non-API routes (static files, uploads, etc.)
        if not path.startswith("/api/"):
            return await call_next(request)

        # Allow CORS preflight
        if request.method == "OPTIONS":
            return await call_next(request)

        # Check Authorization header
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return JSONResponse(status_code=401, content={"detail": "Not authenticated"})

        token = auth_header.removeprefix("Bearer ")

        # Agent API key auth (prefix: "adhub_")
        if token.startswith("adhub_"):
            if not self._verify_agent_key(token):
                return JSONResponse(status_code=401, content={"detail": "Invalid agent API key"})
            return await call_next(request)

        # Human token auth (signed JWT-like token)
        from app.routers.auth import verify_token

        if verify_token(token) is None:
            return JSONResponse(status_code=401, content={"detail": "Invalid or expired token"})

        return await call_next(request)

    @staticmethod
    def _verify_agent_key(key: str) -> bool:
        """Quick check that an agent key exists and is active.

        Full permission checking happens in the permissions module via Depends().
        This just validates the key is real so we don't pass garbage downstream.
        """
        from app.database import SessionLocal
        from app.models.user import AgentAPIKey

        key_hash = hashlib.sha256(key.encode()).hexdigest()
        db = SessionLocal()
        try:
            agent_key = db.query(AgentAPIKey).filter(
                AgentAPIKey.key_hash == key_hash,
                AgentAPIKey.is_active.is_(True),
            ).first()
            return agent_key is not None
        finally:
            db.close()

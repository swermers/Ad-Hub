from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import settings

# Routes that don't require auth
PUBLIC_PATHS = {"/api/auth/login", "/api/health"}


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

        from app.routers.auth import verify_token

        if verify_token(token) is None:
            return JSONResponse(status_code=401, content={"detail": "Invalid or expired token"})

        return await call_next(request)

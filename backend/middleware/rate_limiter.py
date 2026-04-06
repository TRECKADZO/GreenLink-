"""
Rate Limiter Middleware for GreenLink
Protection contre les attaques par force brute
"""
import time
from collections import defaultdict
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

class RateLimitStore:
    """In-memory rate limit tracker per IP+endpoint"""
    def __init__(self):
        self.attempts = defaultdict(list)  # key -> [timestamps]
        self.blocked = {}  # key -> unblock_time
    
    def cleanup_old(self, key, window):
        now = time.time()
        self.attempts[key] = [t for t in self.attempts[key] if now - t < window]
    
    def is_blocked(self, key):
        if key in self.blocked:
            if time.time() < self.blocked[key]:
                return True
            del self.blocked[key]
        return False
    
    def record(self, key):
        self.attempts[key].append(time.time())
    
    def block(self, key, seconds):
        self.blocked[key] = time.time() + seconds
    
    def count(self, key, window):
        self.cleanup_old(key, window)
        return len(self.attempts[key])

rate_store = RateLimitStore()

# Rate limit rules: path_prefix -> (max_attempts, window_seconds, block_seconds)
RATE_RULES = {
    "/api/auth/login": (5, 60, 300),           # 5 attempts/min, block 5 min
    "/api/auth/forgot-password": (3, 60, 600),  # 3 attempts/min, block 10 min
    "/api/sms/send-otp": (3, 60, 300),          # 3 attempts/min, block 5 min
    "/api/sms/send": (5, 60, 300),              # 5 attempts/min, block 5 min
    "/api/auth/register": (5, 300, 600),        # 5 attempts/5min, block 10 min
}

class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        method = request.method
        
        # Only rate limit POST endpoints
        if method != "POST":
            return await call_next(request)
        
        # Check if path matches any rule
        rule = None
        for prefix, config in RATE_RULES.items():
            if path == prefix or path.startswith(prefix + "/"):
                rule = config
                break
        
        if not rule:
            return await call_next(request)
        
        max_attempts, window, block_duration = rule
        
        # Get real client IP (behind proxy)
        client_ip = (
            request.headers.get("x-forwarded-for", "").split(",")[0].strip()
            or request.headers.get("x-real-ip", "")
            or (request.client.host if request.client else "unknown")
        )
        key = f"{client_ip}:{path}"
        
        # Check if blocked
        if rate_store.is_blocked(key):
            remaining = int(rate_store.blocked.get(key, 0) - time.time())
            return JSONResponse(
                status_code=429,
                content={
                    "detail": f"Trop de tentatives. Reessayez dans {remaining} secondes.",
                    "retry_after": remaining
                },
                headers={"Retry-After": str(remaining)}
            )
        
        # Record attempt and check count
        rate_store.record(key)
        count = rate_store.count(key, window)
        
        if count > max_attempts:
            rate_store.block(key, block_duration)
            return JSONResponse(
                status_code=429,
                content={
                    "detail": f"Trop de tentatives ({count}/{max_attempts}). Bloque pour {block_duration//60} minutes.",
                    "retry_after": block_duration
                },
                headers={"Retry-After": str(block_duration)}
            )
        
        response = await call_next(request)
        
        # Add rate limit headers
        response.headers["X-RateLimit-Limit"] = str(max_attempts)
        response.headers["X-RateLimit-Remaining"] = str(max(0, max_attempts - count))
        
        return response

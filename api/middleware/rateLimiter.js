/**
 * AegisID — Rate Limiter Middleware
 * 
 * In-memory sliding window rate limiter.
 * Production: Replace with Redis-backed limiter or API Gateway throttling.
 * 
 * Config:
 *   - windowMs: Time window in milliseconds (default: 60s)
 *   - maxRequests: Max requests per IP per window (default: 100)
 */

const { RateLimitError } = require("../utils/errors");

// In-memory store: Map<ip, { count, windowStart }>
const store = new Map();

// Clean up expired entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
        if (now - entry.windowStart > entry.windowMs * 2) {
            store.delete(key);
        }
    }
}, 5 * 60 * 1000);

function rateLimiter({ windowMs = 60_000, maxRequests = 100 } = {}) {
    return (req, res, next) => {
        const ip = req.ip || req.connection?.remoteAddress || "unknown";
        const now = Date.now();

        let entry = store.get(ip);

        if (!entry || (now - entry.windowStart) > windowMs) {
            // New window
            entry = { count: 1, windowStart: now, windowMs };
            store.set(ip, entry);
        } else {
            entry.count++;
        }

        // Set rate limit headers
        const remaining = Math.max(0, maxRequests - entry.count);
        const resetTime = new Date(entry.windowStart + windowMs).toISOString();
        res.set("X-RateLimit-Limit", String(maxRequests));
        res.set("X-RateLimit-Remaining", String(remaining));
        res.set("X-RateLimit-Reset", resetTime);

        if (entry.count > maxRequests) {
            res.set("Retry-After", String(Math.ceil((entry.windowStart + windowMs - now) / 1000)));
            return next(new RateLimitError());
        }

        next();
    };
}

module.exports = { rateLimiter };

/**
 * AegisID — JWT Authentication Middleware
 * 
 * Validates Bearer tokens for service-to-service API calls.
 * Uses HMAC-SHA256 for simplicity; production should use RS256 with key rotation.
 * 
 * Token structure:
 *   header.payload.signature (standard JWT)
 * 
 * Payload claims:
 *   - sub: service identifier
 *   - iat: issued at (unix seconds)
 *   - exp: expiration (unix seconds)
 *   - scope: allowed operations (e.g., "verify", "audit")
 * 
 * Environment:
 *   - AEGISID_JWT_SECRET: HMAC signing key (required in production)
 *   - AEGISID_AUTH_ENABLED: "true" to enforce auth (default: "false" for dev)
 */

const crypto = require("crypto");
const { AuthenticationError } = require("../utils/errors");

const JWT_SECRET = process.env.AEGISID_JWT_SECRET || "dev-secret-change-in-production";
const AUTH_ENABLED = process.env.AEGISID_AUTH_ENABLED === "true";

function base64UrlDecode(str) {
    const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - base64.length % 4) % 4);
    return Buffer.from(padded, "base64").toString("utf-8");
}

function base64UrlEncode(data) {
    return Buffer.from(data).toString("base64")
        .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Verify a JWT token and return its payload.
 */
function verifyToken(token) {
    const parts = token.split(".");
    if (parts.length !== 3) {
        throw new AuthenticationError("Malformed token");
    }

    const [headerB64, payloadB64, signatureB64] = parts;

    // Verify signature
    const expectedSig = crypto
        .createHmac("sha256", JWT_SECRET)
        .update(`${headerB64}.${payloadB64}`)
        .digest("base64url");

    if (expectedSig !== signatureB64) {
        throw new AuthenticationError("Invalid token signature");
    }

    // Decode payload
    const payload = JSON.parse(base64UrlDecode(payloadB64));

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
        throw new AuthenticationError("Token has expired");
    }

    return payload;
}

/**
 * Generate a JWT token (utility for creating API keys).
 */
function generateToken({ sub, scope = "verify", expiresInSeconds = 86400 } = {}) {
    const now = Math.floor(Date.now() / 1000);

    const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const payload = base64UrlEncode(JSON.stringify({
        sub,
        scope,
        iat: now,
        exp: now + expiresInSeconds
    }));

    const signature = crypto
        .createHmac("sha256", JWT_SECRET)
        .update(`${header}.${payload}`)
        .digest("base64url");

    return `${header}.${payload}.${signature}`;
}

/**
 * Express middleware: requires valid Bearer token.
 * Skipped when AEGISID_AUTH_ENABLED !== "true" (dev mode).
 */
function jwtAuth(requiredScope = null) {
    return (req, res, next) => {
        // Skip auth in dev mode
        if (!AUTH_ENABLED) {
            req.auth = { sub: "dev-user", scope: "verify,audit" };
            return next();
        }

        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return next(new AuthenticationError("Missing Authorization header"));
        }

        try {
            const token = authHeader.slice(7);
            const payload = verifyToken(token);

            // Check scope if required
            if (requiredScope) {
                const scopes = (payload.scope || "").split(",").map(s => s.trim());
                if (!scopes.includes(requiredScope)) {
                    return next(new AuthenticationError(`Insufficient scope: requires '${requiredScope}'`));
                }
            }

            req.auth = payload;
            next();
        } catch (err) {
            next(err instanceof AuthenticationError ? err : new AuthenticationError());
        }
    };
}

module.exports = { jwtAuth, generateToken, verifyToken };

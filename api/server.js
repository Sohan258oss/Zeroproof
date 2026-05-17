/**
 * AegisID — Express API Server
 * 
 * Production-grade verification API with:
 *   - Versioned routes (v1, v2)
 *   - Rate limiting
 *   - JWT authentication (configurable)
 *   - Structured error handling
 *   - CORS with origin restriction
 *   - Request ID tracing
 *   - Audit logging
 * 
 * Environment Variables:
 *   PORT                    — Server port (default: 3000)
 *   AEGISID_CORS_ORIGIN     — Allowed CORS origin (default: * for dev)
 *   AEGISID_AUTH_ENABLED     — Enable JWT auth (default: false)
 *   AEGISID_JWT_SECRET       — JWT signing key
 *   AEGISID_AWS_ENABLED      — Enable DynamoDB logging (default: false)
 *   AEGISID_RATE_LIMIT       — Max requests per minute (default: 100)
 */

const express = require("express");
const cors = require("cors");

const { rateLimiter } = require("./middleware/rateLimiter");
const v1Routes = require("./routes/v1/verify");
const v2Routes = require("./routes/v2/verify");
const v3Documents = require("./routes/v3/documents");
const v3Credentials = require("./routes/v3/credentials");
const v3Verify = require("./routes/v3/verify");
const { AppError } = require("./utils/errors");
const response = require("./utils/response");

const app = express();

// ─────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────

// CORS
const corsOrigin = process.env.AEGISID_CORS_ORIGIN || "*";
app.use(cors({
    origin: corsOrigin,
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400 // Preflight cache: 24 hours
}));

// Body parsing
app.use(express.json({ limit: "1mb" }));

// Rate limiting
const maxRequests = Number(process.env.AEGISID_RATE_LIMIT) || 100;
app.use(rateLimiter({ windowMs: 60_000, maxRequests }));

// Request ID + timing
app.use((req, res, next) => {
    req.startTime = performance.now();
    req.requestId = require("crypto").randomUUID();
    res.set("X-Request-ID", req.requestId);
    next();
});

// ─────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────

// Health check
app.get("/health", (req, res) => {
    res.json({
        status: "healthy",
        service: "aegisid-verifier",
        version: "3.0.0",
        timestamp: new Date().toISOString()
    });
});

// API info
app.get("/", (req, res) => {
    res.json({
        name: "AegisID Verification API",
        description: "Zero-knowledge identity verification with cloud document vault",
        versions: {
            v1: {
                status: "stable",
                endpoints: ["POST /v1/verify", "GET /v1/proof-types"]
            },
            v2: {
                status: "stable",
                endpoints: ["POST /v2/verify", "GET /v2/audit/:nullifier"]
            },
            v3: {
                status: "stable",
                endpoints: [
                    "POST /v3/documents/upload",
                    "GET /v3/documents",
                    "POST /v3/credentials/issue",
                    "GET /v3/credentials",
                    "POST /v3/credentials/:id/share",
                    "GET /v3/verify/:token"
                ],
                notes: "Document Vault — upload, credential issuance, and public verification"
            }
        },
        docs: "https://github.com/Sohan258oss/Zeroproof#api-documentation"
    });
});

// Versioned routes
app.use("/v1", v1Routes);
app.use("/v2", v2Routes);
app.use("/v3/documents", v3Documents);
app.use("/v3/credentials", v3Credentials);
app.use("/v3/verify", v3Verify);

// ─────────────────────────────────────────
// ERROR HANDLING
// ─────────────────────────────────────────

// 404 handler
app.use((req, res) => {
    return response.error(res, {
        statusCode: 404,
        code: "NOT_FOUND",
        message: `Route not found: ${req.method} ${req.path}`,
        isOperational: true
    });
});

// Global error handler
app.use((err, req, res, _next) => {
    // Log error
    if (err instanceof AppError) {
        console.warn(`[${err.code}] ${err.message}`);
    } else {
        console.error("[UNHANDLED_ERROR]", err);
    }

    return response.error(res, err, { startTime: req.startTime });
});

// ─────────────────────────────────────────
// SERVER STARTUP
// ─────────────────────────────────────────

const PORT = process.env.PORT || 3000;
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`
╔════════════════════════════════════════════╗
║       AegisID Verification API v3.0        ║
║────────────────────────────────────────────║
║  Port:        ${String(PORT).padEnd(28)}║
║  Auth:        ${(process.env.AEGISID_AUTH_ENABLED === "true" ? "Enabled" : "Disabled (dev)").padEnd(28)}║
║  CORS:        ${corsOrigin.padEnd(28)}║
║  Rate Limit:  ${(maxRequests + "/min").padEnd(28)}║
╚════════════════════════════════════════════╝
        `.trim());
    });
}

module.exports = app;

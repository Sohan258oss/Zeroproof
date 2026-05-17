/**
 * AegisID — AWS Lambda Handler
 * 
 * Serverless entry point wrapping the Express app via serverless-http.
 * Falls back to manual event routing if serverless-http is not available.
 * 
 * Deployment Notes:
 *   - Minimum 512MB RAM for snarkjs operations
 *   - ARM64 architecture recommended (20% cheaper, 20% faster)
 *   - Bundle verification keys alongside function code
 *   - Set AEGISID_AWS_ENABLED=true for DynamoDB integration
 */

let serverlessHandler;

try {
    // Preferred: use serverless-http to wrap Express
    const serverless = require("serverless-http");
    const app = require("../api/server");
    serverlessHandler = serverless(app);
} catch (e) {
    // Fallback: manual routing if serverless-http not bundled
    serverlessHandler = null;
}

const { verifyProof } = require("../api/services/verifier");
const { logVerification } = require("../api/services/auditLogger");
const { checkAndStoreNullifier } = require("../api/services/nullifierStore");
const crypto = require("crypto");

exports.handler = async (event, context) => {
    // Use serverless-http if available
    if (serverlessHandler) {
        return serverlessHandler(event, context);
    }

    // ── Manual fallback handler ──
    const headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": process.env.AEGISID_CORS_ORIGIN || "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };

    // Handle CORS preflight
    if (event.requestContext?.http?.method === "OPTIONS" || event.httpMethod === "OPTIONS") {
        return { statusCode: 204, headers, body: "" };
    }

    try {
        const body = (typeof event.body === "string") ? JSON.parse(event.body) : event.body;
        const path = event.requestContext?.http?.path || event.path || "";

        // Health check
        if (path.endsWith("/health")) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    status: "healthy",
                    service: "aegisid-verifier-lambda",
                    version: "2.0.0",
                    timestamp: new Date().toISOString()
                })
            };
        }

        // Verify endpoint (v1 or v2)
        if (path.includes("/verify")) {
            if (!body || !body.proof || !body.publicSignals) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({
                        status: "error",
                        error: { code: "VALIDATION_ERROR", message: "Missing proof or publicSignals" }
                    })
                };
            }

            const proofType = body.proofType || "age_check";
            const startTime = performance.now();

            // Verify
            const result = await verifyProof(proofType, body.proof, body.publicSignals);

            if (!result.verified) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({
                        status: "error",
                        error: { code: "INVALID_PROOF", message: "Cryptographic proof verification failed" }
                    })
                };
            }

            // Nullifier check
            const nullifierHash = result.signals.nullifierHash;
            if (nullifierHash && nullifierHash !== "0") {
                await checkAndStoreNullifier(nullifierHash, proofType);
            }

            const eligibilitySignal = result.signals.isEligible || result.signals.inRange || "0";
            const isEligible = eligibilitySignal === "1";

            // Audit log
            const requestId = crypto.randomUUID();
            const processingTimeMs = Number((performance.now() - startTime).toFixed(2));

            logVerification({
                requestId,
                proofType,
                verified: true,
                isEligible,
                nullifierHash,
                publicSignals: body.publicSignals,
                ipHash: crypto.createHash("sha256")
                    .update(event.requestContext?.http?.sourceIp || "unknown")
                    .digest("hex").slice(0, 16),
                processingTimeMs
            }).catch(err => console.error("[Lambda AuditLog]", err.message));

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    status: "success",
                    data: {
                        verified: true,
                        isEligible,
                        proofType,
                        signals: result.signals
                    },
                    meta: { requestId, processingTimeMs }
                })
            };
        }

        // Unknown route
        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({
                status: "error",
                error: { code: "NOT_FOUND", message: `Route not found: ${path}` }
            })
        };

    } catch (error) {
        console.error("Lambda Execution Error:", error);
        const isOperational = error.isOperational || false;
        return {
            statusCode: error.statusCode || 500,
            headers,
            body: JSON.stringify({
                status: "error",
                error: {
                    code: error.code || "INTERNAL_ERROR",
                    message: isOperational ? error.message : "Internal server error"
                }
            })
        };
    }
};

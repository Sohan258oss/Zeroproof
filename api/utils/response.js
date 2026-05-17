/**
 * AegisID — Standardized API Response Builder
 * 
 * Every API response follows this structure:
 * {
 *   status: "success" | "error",
 *   data: { ... } | null,
 *   meta: { requestId, version, processingTimeMs },
 *   error: null | { code, message }
 * }
 */

const crypto = require("crypto");

function generateRequestId() {
    return crypto.randomUUID();
}

/**
 * Build a success response
 */
function success(res, data, { statusCode = 200, version = "v1", startTime } = {}) {
    const requestId = generateRequestId();
    const processingTimeMs = startTime ? (performance.now() - startTime).toFixed(2) : null;

    return res.status(statusCode).json({
        status: "success",
        data,
        meta: {
            requestId,
            version,
            processingTimeMs: processingTimeMs ? Number(processingTimeMs) : undefined,
            timestamp: new Date().toISOString()
        },
        error: null
    });
}

/**
 * Build an error response
 */
function error(res, err, { version = "v1", startTime } = {}) {
    const requestId = generateRequestId();
    const statusCode = err.statusCode || 500;
    const processingTimeMs = startTime ? (performance.now() - startTime).toFixed(2) : null;

    return res.status(statusCode).json({
        status: "error",
        data: null,
        meta: {
            requestId,
            version,
            processingTimeMs: processingTimeMs ? Number(processingTimeMs) : undefined,
            timestamp: new Date().toISOString()
        },
        error: {
            code: err.code || "INTERNAL_ERROR",
            message: err.isOperational ? err.message : "An unexpected error occurred"
        }
    });
}

module.exports = { success, error, generateRequestId };

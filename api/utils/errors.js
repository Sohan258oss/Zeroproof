/**
 * AegisID — Custom Error Classes
 * 
 * Structured error types for consistent API error handling.
 * Each error carries a machine-readable code, HTTP status, and human message.
 */

class AppError extends Error {
    constructor(message, statusCode, code) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

class ValidationError extends AppError {
    constructor(message = "Invalid request payload") {
        super(message, 400, "VALIDATION_ERROR");
    }
}

class ProofExpiredError extends AppError {
    constructor(message = "Proof timestamp exceeds allowed window") {
        super(message, 400, "PROOF_EXPIRED");
    }
}

class NullifierReplayError extends AppError {
    constructor(message = "This nullifier has already been used in this context") {
        super(message, 409, "NULLIFIER_REPLAYED");
    }
}

class InvalidProofError extends AppError {
    constructor(message = "Cryptographic proof verification failed") {
        super(message, 400, "INVALID_PROOF");
    }
}

class RateLimitError extends AppError {
    constructor(message = "Too many requests — please try again later") {
        super(message, 429, "RATE_LIMITED");
    }
}

class AuthenticationError extends AppError {
    constructor(message = "Invalid or missing authentication token") {
        super(message, 401, "AUTH_FAILED");
    }
}

class NotFoundError extends AppError {
    constructor(message = "Resource not found") {
        super(message, 404, "NOT_FOUND");
    }
}

module.exports = {
    AppError,
    ValidationError,
    ProofExpiredError,
    NullifierReplayError,
    InvalidProofError,
    RateLimitError,
    AuthenticationError,
    NotFoundError
};

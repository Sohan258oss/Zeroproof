/**
 * AegisID — Request Validator Middleware
 * 
 * Validates incoming proof verification requests:
 *   - Required fields present (proof, publicSignals)
 *   - Proof structure matches expected PLONK format
 *   - Public signals are string arrays
 *   - Proof type is supported
 */

const { ValidationError } = require("../utils/errors");

const SUPPORTED_PROOF_TYPES = ["age_check", "range_check"];

/**
 * Validate a verification request body.
 */
function validateVerifyRequest(req, res, next) {
    const { proof, publicSignals, proofType } = req.body;

    if (!proof || typeof proof !== "object") {
        return next(new ValidationError("Missing or invalid 'proof' object in request body"));
    }

    if (!publicSignals || !Array.isArray(publicSignals)) {
        return next(new ValidationError("Missing or invalid 'publicSignals' array in request body"));
    }

    // Validate public signals are strings (snarkjs convention)
    for (let i = 0; i < publicSignals.length; i++) {
        if (typeof publicSignals[i] !== "string") {
            return next(new ValidationError(`publicSignals[${i}] must be a string, got ${typeof publicSignals[i]}`));
        }
    }

    // Validate PLONK proof structure (must have required curve points)
    const requiredProofFields = ["A", "B", "C", "Z", "T1", "T2", "T3", "Wxi", "Wxiw"];
    for (const field of requiredProofFields) {
        if (!proof[field]) {
            return next(new ValidationError(`Proof object missing required PLONK field: '${field}'`));
        }
    }

    // Validate proof type if provided (default: age_check)
    if (proofType && !SUPPORTED_PROOF_TYPES.includes(proofType)) {
        return next(new ValidationError(
            `Unsupported proof type '${proofType}'. Supported: ${SUPPORTED_PROOF_TYPES.join(", ")}`
        ));
    }

    // Attach validated proof type to request
    req.proofType = proofType || "age_check";

    next();
}

module.exports = { validateVerifyRequest, SUPPORTED_PROOF_TYPES };

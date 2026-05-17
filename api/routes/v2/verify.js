/**
 * AegisID — V2 Verification Routes
 * 
 * Enhanced verification with:
 *   - Mandatory nullifier checking
 *   - Proof expiration validation
 *   - Nullifier audit queries
 * 
 * POST /v2/verify          — Verify with strict nullifier enforcement
 * GET  /v2/audit/:nullifier — Check if a nullifier has been used
 */

const express = require("express");
const crypto = require("crypto");
const router = express.Router();

const { validateVerifyRequest } = require("../../middleware/requestValidator");
const { jwtAuth } = require("../../middleware/jwtAuth");
const { verifyProof } = require("../../services/verifier");
const { logVerification } = require("../../services/auditLogger");
const { checkAndStoreNullifier, isNullifierUsed } = require("../../services/nullifierStore");
const response = require("../../utils/response");
const { InvalidProofError, ProofExpiredError, ValidationError } = require("../../utils/errors");

// Proof must be submitted within 5 minutes of generation
const PROOF_MAX_AGE_MS = 5 * 60 * 1000;

/**
 * POST /v2/verify
 * Strict verification: nullifiers are mandatory, proof expiration is enforced.
 */
router.post("/verify", jwtAuth("verify"), validateVerifyRequest, async (req, res, next) => {
    const startTime = performance.now();

    try {
        const { proof, publicSignals, proofTimestamp } = req.body;
        const proofType = req.proofType;

        // 1. Proof expiration check
        if (proofTimestamp) {
            const proofAge = Date.now() - new Date(proofTimestamp).getTime();
            if (proofAge > PROOF_MAX_AGE_MS) {
                throw new ProofExpiredError(
                    `Proof is ${Math.round(proofAge / 1000)}s old, maximum allowed is ${PROOF_MAX_AGE_MS / 1000}s`
                );
            }
        }

        // 2. Cryptographic verification
        const result = await verifyProof(proofType, proof, publicSignals);

        if (!result.verified) {
            throw new InvalidProofError();
        }

        // 3. Mandatory nullifier check (v2 requires nullifiers)
        const nullifierHash = result.signals.nullifierHash;
        if (!nullifierHash || nullifierHash === "0") {
            throw new ValidationError("V2 verification requires a non-zero nullifier in the proof");
        }

        await checkAndStoreNullifier(nullifierHash, proofType);

        // 4. Eligibility
        const eligibilitySignal = result.signals.isEligible || result.signals.inRange || "0";
        const isEligible = eligibilitySignal === "1";

        // 5. Audit log
        const ipHash = crypto.createHash("sha256")
            .update(req.ip || "unknown")
            .digest("hex")
            .slice(0, 16);

        const requestId = response.generateRequestId();

        logVerification({
            requestId,
            proofType,
            verified: true,
            isEligible,
            nullifierHash,
            publicSignals,
            ipHash,
            processingTimeMs: Number((performance.now() - startTime).toFixed(2))
        }).catch(err => console.error("[AuditLog] Background write failed:", err.message));

        // 6. Respond
        return response.success(res, {
            verified: true,
            isEligible,
            proofType,
            nullifierRegistered: true,
            signals: result.signals
        }, { version: "v2", startTime });

    } catch (err) {
        next(err);
    }
});

/**
 * GET /v2/audit/:nullifier
 * Check if a specific nullifier has been used.
 * Requires 'audit' scope in JWT.
 */
router.get("/audit/:nullifier", jwtAuth("audit"), async (req, res, next) => {
    try {
        const { nullifier } = req.params;

        if (!nullifier || nullifier.length < 10) {
            throw new ValidationError("Invalid nullifier hash");
        }

        const used = await isNullifierUsed(nullifier);

        return response.success(res, {
            nullifier,
            used,
            checkedAt: new Date().toISOString()
        }, { version: "v2" });
    } catch (err) {
        next(err);
    }
});

module.exports = router;

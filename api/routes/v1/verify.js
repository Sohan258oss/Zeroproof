/**
 * AegisID — V1 Verification Routes
 * 
 * POST /v1/verify   — Verify a ZK proof (age_check or range_check)
 * GET  /v1/proof-types — List supported proof types
 */

const express = require("express");
const crypto = require("crypto");
const router = express.Router();

const { validateVerifyRequest, SUPPORTED_PROOF_TYPES } = require("../../middleware/requestValidator");
const { verifyProof, PROOF_CONFIGS } = require("../../services/verifier");
const { logVerification } = require("../../services/auditLogger");
const { checkAndStoreNullifier } = require("../../services/nullifierStore");
const response = require("../../utils/response");
const { InvalidProofError } = require("../../utils/errors");

/**
 * POST /v1/verify
 * Verify a zero-knowledge proof.
 */
router.post("/verify", validateVerifyRequest, async (req, res, next) => {
    const startTime = performance.now();

    try {
        const { proof, publicSignals } = req.body;
        const proofType = req.proofType; // Set by validator middleware

        // 1. Cryptographic verification
        const result = await verifyProof(proofType, proof, publicSignals);

        if (!result.verified) {
            throw new InvalidProofError();
        }

        // 2. Nullifier replay check (if circuit produces nullifiers)
        const nullifierHash = result.signals.nullifierHash || null;
        let nullifierUsed = false;

        if (nullifierHash && nullifierHash !== "0") {
            await checkAndStoreNullifier(nullifierHash, proofType);
            nullifierUsed = true;
        }

        // 3. Determine eligibility from signals
        const eligibilitySignal = result.signals.isEligible || result.signals.inRange || "0";
        const isEligible = eligibilitySignal === "1";

        // 4. Audit log (async — don't block response)
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

        // 5. Respond
        return response.success(res, {
            verified: true,
            isEligible,
            proofType,
            nullifierUsed,
            signals: result.signals
        }, { version: "v1", startTime });

    } catch (err) {
        next(err);
    }
});

/**
 * GET /v1/proof-types
 * List all supported proof types and their configurations.
 */
router.get("/proof-types", (req, res) => {
    const types = Object.entries(PROOF_CONFIGS).map(([name, config]) => ({
        name,
        publicSignals: Object.keys(config.signalMap),
        signalCount: Object.keys(config.signalMap).length
    }));

    return response.success(res, { proofTypes: types, supported: SUPPORTED_PROOF_TYPES }, { version: "v1" });
});

module.exports = router;

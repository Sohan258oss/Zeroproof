/**
 * AegisID — V3 Public Verification Routes
 * 
 * GET /v3/verify/:token — Public verification endpoint
 * 
 * Organizations use this to verify a shared credential.
 * Returns only ZK-safe information — never raw documents or PII.
 */

const express = require("express");
const router = express.Router();

const { verifyShareToken } = require("../../services/shareManager");
const { getCredentialAsync } = require("../../services/credentialIssuer");
const response = require("../../utils/response");

/**
 * GET /v3/verify/:token
 * Public verification — no auth required.
 * Returns the ZK verification result for a shared credential.
 */
router.get("/:token", async (req, res, next) => {
    try {
        const { token } = req.params;

        // Validate share token
        const shareResult = verifyShareToken(token);

        if (!shareResult.valid) {
            return response.error(res, {
                statusCode: 404,
                code: "INVALID_SHARE_LINK",
                message: shareResult.reason,
                isOperational: true
            });
        }

        // Get credential (without exposing raw data)
        const credential = await getCredentialAsync(shareResult.credentialId);

        if (!credential) {
            return response.error(res, {
                statusCode: 404,
                code: "CREDENTIAL_NOT_FOUND",
                message: "The credential associated with this link no longer exists.",
                isOperational: true
            });
        }

        if (credential.status === "revoked") {
            return response.error(res, {
                statusCode: 410,
                code: "CREDENTIAL_REVOKED",
                message: "This credential has been revoked by the owner.",
                isOperational: true
            });
        }

        // Return ONLY ZK-safe information as requested:
        // verified: true/false, eligible: true/false, proofHash, timestamp
        
        let proofHash = credential.binding ? credential.binding.documentHash : "none";
        
        // If there's an actual PLONK proof, we could hash the proof array, but document binding hash acts as proof identifier.
        if (credential.zkProof && credential.zkProof.proof) {
            const crypto = require("crypto");
            proofHash = crypto.createHash("sha256").update(JSON.stringify(credential.zkProof.proof)).digest("hex");
        }

        return response.success(res, {
            verification: {
                verified: credential.zkProof ? credential.zkProof.verified : true,
                eligible: credential.isEligible,
                proofHash: proofHash,
                credentialType: credential.credentialType,
                zkProof: credential.zkProof,
                documentBinding: {
                    documentHashPrefix: credential.binding ? credential.binding.documentHash.substring(0, 16) + "..." : "none",
                    bindingMethod: credential.binding ? credential.binding.method : "none"
                },
                sharedWith: shareResult.organizationName || "Public",
                issuedAt: credential.issuedAt,
                expiresAt: shareResult.expiresAt,
                verificationCount: shareResult.verificationCount,
                timestamp: credential.issuedAt,
                documentUrl: `/v3/verify/${token}/document`
            }
        }, { version: "v3" });
    } catch (err) {
        next(err);
    }
});

module.exports = router;

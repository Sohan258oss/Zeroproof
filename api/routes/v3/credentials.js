/**
 * AegisID — V3 Credential Routes
 * 
 * POST   /v3/credentials/issue          — Issue a ZK credential from a document
 * GET    /v3/credentials                — List all credentials
 * GET    /v3/credentials/:id            — Get credential details
 * POST   /v3/credentials/:id/share      — Generate a share link
 * DELETE /v3/credentials/:id/share      — Revoke a share link
 */

const express = require("express");
const router = express.Router();

const { issueCredential, listCredentials, getCredentialAsync, revokeCredential } = require("../../services/credentialIssuer");
const { getDocument } = require("../../services/documentStore");
const { createShareLink, listShareLinks, revokeShareLink } = require("../../services/shareManager");
const response = require("../../utils/response");

/**
 * POST /v3/credentials/issue
 * Issue a ZK credential from an uploaded document.
 */
router.post("/issue", async (req, res, next) => {
    try {
        const { documentId, credentialType } = req.body;

        if (!documentId) {
            return response.error(res, {
                statusCode: 400,
                code: "MISSING_DOCUMENT_ID",
                message: "documentId is required",
                isOperational: true
            });
        }

        // Verify document exists
        const doc = getDocument(documentId);
        if (!doc) {
            return response.error(res, {
                statusCode: 404,
                code: "DOCUMENT_NOT_FOUND",
                message: "Document not found. Upload a document first.",
                isOperational: true
            });
        }

        // Issue the credential
        const credential = await issueCredential({
            documentId: doc.id,
            documentHash: doc.documentHash,
            attributes: req.body.overrides || doc.attributes,
            credentialType: credentialType || "age_verification"
        });

        return response.success(res, {
            credential: {
                id: credential.id,
                documentId: credential.documentId,
                credentialType: credential.credentialType,
                isEligible: credential.isEligible,
                age: credential.age,
                zkProof: credential.zkProof ? {
                    verified: credential.zkProof.verified,
                    circuit: credential.zkProof.circuit,
                    proofSystem: credential.zkProof.proofSystem,
                    curve: credential.zkProof.curve
                } : null,
                binding: credential.binding,
                issuedAt: credential.issuedAt,
                expiresAt: credential.expiresAt,
                status: credential.status
            }
        }, { version: "v3", statusCode: 201 });

    } catch (err) {
        next(err);
    }
});

/**
 * GET /v3/credentials
 * List all credentials.
 */
router.get("/", (req, res) => {
    const { documentId } = req.query;
    const creds = listCredentials(documentId || null).map(c => ({
        id: c.id,
        documentId: c.documentId,
        credentialType: c.credentialType,
        isEligible: c.isEligible,
        age: c.age,
        hasZkProof: !!c.zkProof,
        zkProofVerified: c.zkProof?.verified || false,
        issuedAt: c.issuedAt,
        expiresAt: c.expiresAt,
        status: c.status,
        attributes: {
            fullName: c.attributes?.fullName || "",
            documentType: c.attributes?.documentType || ""
        }
    }));

    return response.success(res, { credentials: creds, count: creds.length }, { version: "v3" });
});

/**
 * GET /v3/credentials/:id
 * Get credential details.
 */
router.get("/:id", async (req, res, next) => {
    try {
        const cred = await getCredentialAsync(req.params.id);
        if (!cred) {
            return response.error(res, {
                statusCode: 404,
                code: "CREDENTIAL_NOT_FOUND",
                message: "Credential not found",
                isOperational: true
            });
        }

        const shares = listShareLinks(cred.id);

        return response.success(res, {
            credential: {
                id: cred.id,
                documentId: cred.documentId,
                credentialType: cred.credentialType,
                isEligible: cred.isEligible,
                age: cred.age,
                attributes: cred.attributes,
                zkProof: cred.zkProof ? {
                    verified: cred.zkProof.verified,
                    circuit: cred.zkProof.circuit,
                    proofSystem: cred.zkProof.proofSystem,
                    curve: cred.zkProof.curve
                } : null,
                binding: cred.binding,
                issuedAt: cred.issuedAt,
                expiresAt: cred.expiresAt,
                status: cred.status
            },
            shareLinks: shares.map(s => ({
                token: s.token,
                organizationName: s.organizationName,
                expiresAt: s.expiresAt,
                verificationCount: s.verificationCount,
                status: s.status
            }))
        }, { version: "v3" });
    } catch (err) {
        next(err);
    }
});

/**
 * POST /v3/credentials/:id/share
 * Generate a shareable verification link.
 */
router.post("/:id/share", async (req, res, next) => {
    try {
        const cred = await getCredentialAsync(req.params.id);
        if (!cred) {
            return response.error(res, {
                statusCode: 404,
                code: "CREDENTIAL_NOT_FOUND",
                message: "Credential not found",
                isOperational: true
            });
        }

        const { expiresInHours, organizationName } = req.body;
        const share = createShareLink(cred.id, {
            expiresInHours: expiresInHours || 72,
            organizationName: organizationName || ""
        });

        return response.success(res, {
            shareLink: {
                token: share.token,
                verifyUrl: `/verify/${share.token}`,
                organizationName: share.organizationName,
                expiresAt: share.expiresAt,
                status: share.status
            }
        }, { version: "v3", statusCode: 201 });
    } catch (err) {
        next(err);
    }
});

/**
 * DELETE /v3/credentials/:id/share
 * Revoke a share link.
 */
router.delete("/:id/share", (req, res) => {
    const { token } = req.body;
    if (!token) {
        return response.error(res, {
            statusCode: 400,
            code: "MISSING_TOKEN",
            message: "Share link token is required",
            isOperational: true
        });
    }

    const revoked = revokeShareLink(token);
    if (!revoked) {
        return response.error(res, {
            statusCode: 404,
            code: "SHARE_NOT_FOUND",
            message: "Share link not found",
            isOperational: true
        });
    }

    return response.success(res, { revoked: true, token }, { version: "v3" });
});

module.exports = router;

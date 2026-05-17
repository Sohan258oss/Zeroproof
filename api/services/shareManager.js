/**
 * AegisID — Share Link Manager
 * 
 * Manages shareable verification links for ZK credentials.
 * Organizations can verify credentials via these links without
 * ever seeing the raw documents or personal data.
 */

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "../../data");
const SHARES_FILE = path.join(DATA_DIR, "shares.json");

function ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(SHARES_FILE)) fs.writeFileSync(SHARES_FILE, "[]", "utf-8");
}

function loadShares() {
    ensureDataDir();
    try {
        return JSON.parse(fs.readFileSync(SHARES_FILE, "utf-8"));
    } catch {
        return [];
    }
}

function saveShares(shares) {
    ensureDataDir();
    fs.writeFileSync(SHARES_FILE, JSON.stringify(shares, null, 2), "utf-8");
}

/**
 * Generate a shareable verification link for a credential.
 * 
 * @param {string} credentialId - ID of the credential to share
 * @param {Object} options
 * @param {number} options.expiresInHours - Hours until link expires (default: 72)
 * @param {string} options.organizationName - Name of org being shared with
 * @returns {Object} Share record with token
 */
function createShareLink(credentialId, { expiresInHours = 72, organizationName = "" } = {}) {
    const shareToken = crypto.randomBytes(24).toString("base64url");
    const now = new Date();

    const share = {
        token: shareToken,
        credentialId,
        organizationName,
        createdAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + expiresInHours * 60 * 60 * 1000).toISOString(),
        status: "active",
        verificationCount: 0,
        lastVerifiedAt: null
    };

    const shares = loadShares();
    shares.push(share);
    saveShares(shares);

    return share;
}

/**
 * Verify a share token and return the credential info (if valid).
 * Returns only ZK-safe information — never raw documents or PII.
 */
function verifyShareToken(token) {
    const shares = loadShares();
    const share = shares.find(s => s.token === token);

    if (!share) {
        return { valid: false, reason: "Share link not found" };
    }

    if (share.status === "revoked") {
        return { valid: false, reason: "Share link has been revoked" };
    }

    if (new Date(share.expiresAt) < new Date()) {
        return { valid: false, reason: "Share link has expired" };
    }

    // Update verification count
    share.verificationCount += 1;
    share.lastVerifiedAt = new Date().toISOString();
    saveShares(shares);

    return {
        valid: true,
        credentialId: share.credentialId,
        organizationName: share.organizationName,
        expiresAt: share.expiresAt,
        verificationCount: share.verificationCount
    };
}

/**
 * List all share links for a credential.
 */
function listShareLinks(credentialId) {
    const shares = loadShares();
    return shares.filter(s => s.credentialId === credentialId && s.status === "active");
}

/**
 * Revoke a share link.
 */
function revokeShareLink(token) {
    const shares = loadShares();
    const share = shares.find(s => s.token === token);
    if (!share) return false;

    share.status = "revoked";
    share.revokedAt = new Date().toISOString();
    saveShares(shares);
    return true;
}

module.exports = {
    createShareLink,
    verifyShareToken,
    listShareLinks,
    revokeShareLink
};

/**
 * AegisID — Credential Issuer Service
 * 
 * Issues ZK credentials bound to document hashes.
 * A credential proves that verified attributes (DOB, name hash, etc.)
 * are authentically linked to a specific document without exposing the document.
 */

const crypto = require("crypto");
const snarkjs = require("snarkjs");
const fs = require("fs");
const path = require("path");
const cloudStore = require("./cloudStore");

// Local fallback store is now managed by cloudStore, but we keep this for legacy functions if needed
const DATA_DIR = path.join(__dirname, "../../data");
const CREDS_FILE = path.join(DATA_DIR, "credentials.json");

function loadCredentials() {
    try {
        return JSON.parse(fs.readFileSync(CREDS_FILE, "utf-8"));
    } catch {
        return [];
    }
}

function saveCredentials(creds) {
    fs.writeFileSync(CREDS_FILE, JSON.stringify(creds, null, 2), "utf-8");
}

/**
 * Issue a ZK credential.
 * 
 * The credential binds extracted attributes to the document hash via:
 * 1. Hashing the attributes (DOB → birth year → age check)
 * 2. Generating a ZK proof that the attributes satisfy conditions
 * 3. Storing the credential metadata with the document hash binding
 */
async function issueCredential({ documentId, documentHash, attributes, credentialType = "age_verification" }) {
    const credentialId = crypto.randomUUID();
    const now = new Date();

    // Extract birth year from DOB
    const dob = new Date(attributes.dateOfBirth);
    const birthYear = dob.getFullYear();
    const currentYear = now.getFullYear();
    const age = currentYear - birthYear;

    // Generate a document-bound secret (deterministic from doc hash)
    const secret = BigInt("0x" + crypto.createHash("sha256")
        .update(documentHash + credentialId)
        .digest("hex")
        .slice(0, 40)).toString();

    // External nullifier bound to this credential context
    const externalNullifier = BigInt("0x" + crypto.createHash("sha256")
        .update(`aegisid-credential-${credentialId}`)
        .digest("hex")
        .slice(0, 8)).toString();

    // Generate ZK proof using the age_check circuit
    let proof = null;
    let publicSignals = null;
    let proofValid = false;

    try {
        const wasmPath = path.join(__dirname, "../../keys/age_check_js/age_check.wasm");
        const zkeyPath = path.join(__dirname, "../../keys/age_check_final.zkey");
        const vkeyPath = path.join(__dirname, "../../keys/age_check_vkey.json");

        // Check if circuit files exist
        if (fs.existsSync(wasmPath) && fs.existsSync(zkeyPath)) {
            const inputs = {
                birthYear: birthYear,
                currentYear: currentYear,
                ageLimit: 18,
                secret: secret,
                externalNullifier: externalNullifier
            };

            const result = await snarkjs.plonk.fullProve(inputs, wasmPath, zkeyPath);
            proof = result.proof;
            publicSignals = result.publicSignals;

            // Verify the proof
            const vkey = JSON.parse(fs.readFileSync(vkeyPath, "utf-8"));
            proofValid = await snarkjs.plonk.verify(vkey, publicSignals, proof);
        }
    } catch (err) {
        console.error("[CredentialIssuer] ZK proof generation failed:", err.message);
        // Credential is still issued but without a ZK proof embedded
    }

    // Create the credential record
    const credential = {
        id: credentialId,
        documentId,
        documentHash,
        credentialType,
        attributes: {
            fullName: attributes.fullName,
            dateOfBirth: attributes.dateOfBirth,
            documentType: attributes.documentType,
            nameHash: crypto.createHash("sha256").update(attributes.fullName || "").digest("hex").slice(0, 16)
        },
        zkProof: proof ? {
            proof,
            publicSignals,
            verified: proofValid,
            circuit: "age_check_v2",
            proofSystem: "PLONK",
            curve: "BN128"
        } : null,
        binding: {
            documentHash,
            attributeHash: crypto.createHash("sha256")
                .update(JSON.stringify({ birthYear, fullName: attributes.fullName, documentType: attributes.documentType }))
                .digest("hex"),
            method: "SHA-256 document binding + PLONK proof"
        },
        issuedAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
        status: "active",
        isEligible: age >= 18,
        age
    };

    // Save using cloudStore
    await cloudStore.saveCredentialToDynamoDB(credential);

    return credential;
}

/**
 * List all credentials, optionally filtered by document.
 */
function listCredentials(documentId = null) {
    const db = cloudStore.getLocalDB();
    if (db && db.creds) {
        const active = db.creds.filter(c => c.status !== "revoked");
        if (documentId) return active.filter(c => c.documentId === documentId);
        return active;
    }
    // Fallback to old format
    const creds = loadCredentials();
    const active = creds.filter(c => c.status !== "revoked");
    if (documentId) return active.filter(c => c.documentId === documentId);
    return active;
}

/**
 * Get a single credential. (Async wrapper over cloudStore)
 */
async function getCredentialAsync(credentialId) {
    return await cloudStore.getCredentialFromDynamoDB(credentialId);
}

/**
 * Get a single credential (sync fallback for local DB only).
 */
function getCredential(credentialId) {
    const db = cloudStore.getLocalDB();
    if (db && db.creds) {
        return db.creds.find(c => c.id === credentialId) || null;
    }
    const creds = loadCredentials();
    return creds.find(c => c.id === credentialId) || null;
}

/**
 * Revoke a credential.
 */
function revokeCredential(credentialId) {
    const db = cloudStore.getLocalDB();
    const idx = db.creds.findIndex(c => c.id === credentialId);
    if (idx !== -1) {
        db.creds[idx].status = "revoked";
        db.creds[idx].revokedAt = new Date().toISOString();
        fs.writeFileSync(path.join(DATA_DIR, "dynamodb_mock.json"), JSON.stringify(db, null, 2), "utf-8");
        return true;
    }
    // Fallback old format
    const creds = loadCredentials();
    const oldIdx = creds.findIndex(c => c.id === credentialId);
    if (oldIdx !== -1) {
        creds[oldIdx].status = "revoked";
        creds[oldIdx].revokedAt = new Date().toISOString();
        saveCredentials(creds);
        return true;
    }
    return false;
}

module.exports = {
    issueCredential,
    listCredentials,
    getCredential,
    getCredentialAsync,
    revokeCredential
};

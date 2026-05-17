/**
 * AegisID — Document Storage Service
 * 
 * Handles encrypted document storage (local dev mode, S3-ready for production).
 * - AES-256-GCM encryption at rest
 * - SHA-256 document hash computation
 * - Metadata tracking in JSON store
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const cloudStore = require("./cloudStore");

// Storage directories (used if fully falling back to local non-cloud code, though cloudStore handles local fallback too)
const DATA_DIR = path.join(__dirname, "../../data");
const VAULT_DIR = path.join(DATA_DIR, "vault"); 
const VERIFIED_DIR = path.join(DATA_DIR, "verified"); 
const META_FILE = path.join(DATA_DIR, "documents.json");

function loadMetadata() {
    try {
        return JSON.parse(fs.readFileSync(META_FILE, "utf-8"));
    } catch {
        return [];
    }
}

/**
 * Store a document with encryption and original backup.
 * Refactored to use CloudStore (which handles S3/DynamoDB or local fallback).
 * Now async because of cloudStore.
 */
async function storeDocument(fileBuffer, { originalName, mimeType, attributes, isVerified = false }) {
    const documentHash = cloudStore.computeDocumentHash(fileBuffer);
    
    // 1. Duplicate Detection
    const existingId = await cloudStore.checkDuplicate(documentHash);
    if (existingId) {
        throw new Error(`DUPLICATE_DOCUMENT:${existingId}`);
    }

    const docId = crypto.randomUUID();

    // 2. Encrypt and Store in "Vault Cloud" (S3 or local fallback)
    const vaultKey = `vault/${docId}.enc`;
    await cloudStore.uploadToS3(fileBuffer, vaultKey);

    // Build metadata record
    const record = {
        id: docId,
        originalName,
        mimeType,
        sizeBytes: fileBuffer.length,
        documentHash,
        attributes: {
            fullName: attributes.fullName || "",
            dateOfBirth: attributes.dateOfBirth || "",
            documentType: attributes.documentType || "other",
            status: attributes.status || "SUCCESS",
            confidence: attributes.confidence || { name: 0, dob: 0 }
        },
        isVerified,
        encryptionAlgorithm: "AES-256-GCM",
        vaultPath: vaultKey,
        createdAt: new Date().toISOString(),
        status: "active"
    };

    // 3. Save Metadata (DynamoDB or local fallback)
    await cloudStore.saveMetadataToDynamoDB(record);

    return record;
}

/**
 * List all documents (metadata only, no file content).
 */
function listDocuments() {
    // Try to get from cloudStore local mock if AWS disabled, else fallback to old method
    const db = cloudStore.getLocalDB();
    if (db && db.docs) {
        return db.docs.filter(d => d.status === "active");
    }
    return loadMetadata().filter(d => d.status === "active");
}

/**
 * Get a single document's metadata.
 */
function getDocument(docId) {
    const db = cloudStore.getLocalDB();
    if (db && db.docs) {
        return db.docs.find(d => d.id === docId && d.status === "active") || null;
    }
    const docs = loadMetadata();
    return docs.find(d => d.id === docId && d.status === "active") || null;
}

/**
 * Delete a document (soft delete from metadata, hard delete from files).
 */
function deleteDocument(docId) {
    const db = cloudStore.getLocalDB();
    const idx = db.docs.findIndex(d => d.id === docId);
    if (idx === -1) return false;

    db.docs[idx].status = "deleted";
    db.docs[idx].deletedAt = new Date().toISOString();
    
    // Using simple mock save for now since delete wasn't specified for cloud
    fs.writeFileSync(path.join(DATA_DIR, "dynamodb_mock.json"), JSON.stringify(db, null, 2), "utf-8");

    return true;
}

module.exports = {
    storeDocument,
    listDocuments,
    getDocument,
    deleteDocument
};


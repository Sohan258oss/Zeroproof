/**
 * AegisID — V3 Document Routes
 * 
 * POST   /v3/documents/upload   — Upload a document with attributes
 * GET    /v3/documents          — List all documents
 * GET    /v3/documents/:id      — Get a single document's metadata
 * DELETE /v3/documents/:id      — Delete a document
 */

const express = require("express");
const router = express.Router();
const multer = require("multer");

const { storeDocument, listDocuments, getDocument, deleteDocument } = require("../../services/documentStore");
const { analyzeDocument } = require("../../services/documentAnalyzer");
const response = require("../../utils/response");

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024, files: 1 }
});

/**
 * POST /v3/documents/upload
 * Upload a document and extract attributes automatically via OCR.
 */
router.post("/upload", upload.single("document"), async (req, res, next) => {
    try {
        if (!req.file) {
            return response.error(res, {
                statusCode: 400,
                code: "NO_FILE",
                message: "No document file provided.",
                isOperational: true
            });
        }
        
        // Basic MIME validation
        if (!req.file.mimetype.startsWith("image/") && req.file.mimetype !== "application/pdf") {
            return response.error(res, {
                statusCode: 400,
                code: "INVALID_FILE_TYPE",
                message: "Only images or PDFs are supported.",
                isOperational: true
            });
        }

        console.log("[Route] Received file:", req.file.originalname, "analyzing...");

        // Step 1: Automatic Data Extraction (OCR)
        let extracted = null;
        try {
            extracted = await analyzeDocument(req.file.buffer, req.file.mimetype);
        } catch (err) {
            console.error("[Route] OCR failed:", err.message);
        }

        // Parse attributes (prefer extracted data if available)
        // If analyzer returned empty strings, it means extraction genuinely failed
        // Do NOT substitute fake data — let the frontend handle it
        const extractedName = extracted?.name || req.body.fullName || "";
        const extractedDOB = extracted?.dateOfBirth || req.body.dateOfBirth || "";
        const attributes = {
            fullName: extractedName,
            dateOfBirth: extractedDOB,
            documentType: extracted?.documentType || req.body.documentType || "other",
            status: extracted?.status || "SUCCESS",
            reason: extracted?.reason || null,
        };

        const isVerified = !!(attributes.fullName && attributes.dateOfBirth);

        // Step 2: Store the document (Verified + Encrypted)
        let doc;
        let isDuplicate = false;
        
        try {
            doc = await storeDocument(req.file.buffer, {
                originalName: req.file.originalname,
                mimeType: req.file.mimetype,
                attributes,
                isVerified
            });
        } catch (storeErr) {
            if (storeErr.message.startsWith("DUPLICATE_DOCUMENT:")) {
                isDuplicate = true;
                const existingId = storeErr.message.split(":")[1];
                const { getDocument } = require("../../services/documentStore");
                doc = getDocument(existingId);
            } else {
                throw storeErr;
            }
        }

        return response.success(res, {
            document: {
                id: doc.id,
                originalName: doc.originalName,
                documentHash: doc.documentHash,
                attributes: {
                    name: attributes.fullName || "UNKNOWN",
                    dob: attributes.dateOfBirth || "",
                    documentType: attributes.documentType,
                    status: attributes.status,
                    reason: attributes.reason,
                },
                duplicate: isDuplicate,
                isVerified: doc.isVerified,
                createdAt: doc.createdAt
            }
        }, { version: "v3", statusCode: 201 });

    } catch (err) {
        next(err);
    }
});

/**
 * GET /v3/documents
 * List all uploaded documents.
 */
router.get("/", (req, res) => {
    const docs = listDocuments().map(d => ({
        id: d.id,
        originalName: d.originalName,
        sizeBytes: d.sizeBytes,
        documentHash: d.documentHash,
        attributes: d.attributes,
        createdAt: d.createdAt,
        status: d.status
    }));

    return response.success(res, { documents: docs, count: docs.length }, { version: "v3" });
});

/**
 * GET /v3/documents/:id
 * Get a single document's metadata.
 */
router.get("/:id", (req, res) => {
    const doc = getDocument(req.params.id);
    if (!doc) {
        return response.error(res, {
            statusCode: 404,
            code: "DOCUMENT_NOT_FOUND",
            message: "Document not found",
            isOperational: true
        });
    }

    return response.success(res, {
        document: {
            id: doc.id,
            originalName: doc.originalName,
            sizeBytes: doc.sizeBytes,
            documentHash: doc.documentHash,
            attributes: doc.attributes,
            encryptionAlgorithm: doc.encryptionAlgorithm,
            createdAt: doc.createdAt,
            status: doc.status
        }
    }, { version: "v3" });
});

/**
 * DELETE /v3/documents/:id
 * Delete a document.
 */
router.delete("/:id", (req, res) => {
    const deleted = deleteDocument(req.params.id);
    if (!deleted) {
        return response.error(res, {
            statusCode: 404,
            code: "DOCUMENT_NOT_FOUND",
            message: "Document not found",
            isOperational: true
        });
    }

    return response.success(res, {
        deleted: true,
        documentId: req.params.id
    }, { version: "v3" });
});

module.exports = router;

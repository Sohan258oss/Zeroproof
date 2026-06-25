/**
 * AegisID — Comprehensive API Test Suite
 * 
 * Tests ALL endpoints with ALL input conditions:
 * - Health check
 * - Root info
 * - V1: proof-types, verify (valid/invalid/missing fields)
 * - V2: verify with nullifier enforcement, audit
 * - V3: document upload, list, get, delete
 * - V3: credential issue, list, get, share, revoke share
 * - V3: public verify via share token
 * - Error handling: 404, invalid content-types, rate limit headers
 * - Edge cases: empty body, wrong types, duplicate documents
 */

const API = process.env.API_URL || "http://localhost:3000";
const fs = require("fs");
const path = require("path");

let passed = 0;
let failed = 0;
let skipped = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`  ✅ ${message}`);
        passed++;
    } else {
        console.error(`  ❌ ${message}`);
        failed++;
    }
}

function skip(message) {
    console.log(`  ⏭️  ${message} (SKIPPED)`);
    skipped++;
}

// ════════════════════════════════════════════
// SECTION 1: Health & Root
// ════════════════════════════════════════════
async function testHealth() {
    console.log("\n━━━ [1] GET /health ━━━");
    const res = await fetch(`${API}/health`);
    const data = await res.json();
    assert(res.status === 200, "Status 200");
    assert(data.status === "healthy", 'status is "healthy"');
    assert(data.service === "aegisid-verifier", "Correct service name");
    assert(data.version === "3.0.0", "Version 3.0.0");
    assert(data.timestamp, "Has timestamp");
}

async function testRoot() {
    console.log("\n━━━ [2] GET / ━━━");
    const res = await fetch(`${API}/`);
    const data = await res.json();
    assert(res.status === 200, "Status 200");
    assert(data.name === "AegisID Verification API", "Correct API name");
    assert(data.versions.v1 && data.versions.v1.status === "stable", "V1 stable");
    assert(data.versions.v2 && data.versions.v2.status === "stable", "V2 stable");
    assert(data.versions.v3 && data.versions.v3.status === "stable", "V3 stable");
    assert(data.versions.v3.endpoints.length >= 6, "V3 has >= 6 endpoints listed");
}

// ════════════════════════════════════════════
// SECTION 2: V1 Routes
// ════════════════════════════════════════════
async function testV1ProofTypes() {
    console.log("\n━━━ [3] GET /v1/proof-types ━━━");
    const res = await fetch(`${API}/v1/proof-types`);
    const data = await res.json();
    assert(res.status === 200, "Status 200");
    assert(data.status === "success", "Status success");
    assert(Array.isArray(data.data.proofTypes), "proofTypes is array");
    assert(data.data.proofTypes.length >= 2, "At least 2 proof types");
    
    const names = data.data.proofTypes.map(p => p.name);
    assert(names.includes("age_check"), "Includes age_check");
    assert(names.includes("range_check"), "Includes range_check");
    assert(data.data.supported.includes("age_check"), "Supported includes age_check");
}

async function testV1VerifyMissingBody() {
    console.log("\n━━━ [4] POST /v1/verify (empty body) ━━━");
    const res = await fetch(`${API}/v1/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
    });
    const data = await res.json();
    assert(res.status === 400, "Status 400");
    assert(data.status === "error", "Status error");
    assert(data.error.code === "VALIDATION_ERROR", "VALIDATION_ERROR");
}

async function testV1VerifyMissingPublicSignals() {
    console.log("\n━━━ [5] POST /v1/verify (missing publicSignals) ━━━");
    const res = await fetch(`${API}/v1/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            proof: { A: [], B: [], C: [], Z: [], T1: [], T2: [], T3: [], Wxi: [], Wxiw: [] }
        })
    });
    const data = await res.json();
    assert(res.status === 400, "Status 400 for missing publicSignals");
    assert(data.error.code === "VALIDATION_ERROR", "VALIDATION_ERROR");
}

async function testV1VerifyInvalidProofStructure() {
    console.log("\n━━━ [6] POST /v1/verify (incomplete PLONK fields) ━━━");
    const res = await fetch(`${API}/v1/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            proof: { A: "x", B: "x" },
            publicSignals: ["1", "2", "3"]
        })
    });
    const data = await res.json();
    assert(res.status === 400, "Status 400 for incomplete PLONK");
    assert(data.error.code === "VALIDATION_ERROR", "Catches missing PLONK fields");
}

async function testV1VerifyUnsupportedProofType() {
    console.log("\n━━━ [7] POST /v1/verify (unsupported proof type) ━━━");
    const res = await fetch(`${API}/v1/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            proof: { A: [], B: [], C: [], Z: [], T1: [], T2: [], T3: [], Wxi: [], Wxiw: [] },
            publicSignals: ["1"],
            proofType: "fake_circuit"
        })
    });
    const data = await res.json();
    assert(res.status === 400, "Status 400 for unsupported proof type");
    assert(data.error.code === "VALIDATION_ERROR", "Rejects unsupported proof type");
}

async function testV1VerifyNonStringPublicSignals() {
    console.log("\n━━━ [8] POST /v1/verify (non-string publicSignals) ━━━");
    const res = await fetch(`${API}/v1/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            proof: { A: [], B: [], C: [], Z: [], T1: [], T2: [], T3: [], Wxi: [], Wxiw: [] },
            publicSignals: [1, 2, 3]  // numbers instead of strings
        })
    });
    const data = await res.json();
    assert(res.status === 400, "Status 400 for non-string signals");
    assert(data.error.code === "VALIDATION_ERROR", "Catches non-string publicSignals");
}

async function testV1VerifyProofNotObject() {
    console.log("\n━━━ [9] POST /v1/verify (proof is string) ━━━");
    const res = await fetch(`${API}/v1/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            proof: "not-an-object",
            publicSignals: ["1"]
        })
    });
    const data = await res.json();
    assert(res.status === 400, "Status 400 for string proof");
    assert(data.error.code === "VALIDATION_ERROR", "Rejects non-object proof");
}

async function testV1VerifyPublicSignalsNotArray() {
    console.log("\n━━━ [10] POST /v1/verify (publicSignals is object) ━━━");
    const res = await fetch(`${API}/v1/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            proof: { A: [], B: [], C: [], Z: [], T1: [], T2: [], T3: [], Wxi: [], Wxiw: [] },
            publicSignals: { 0: "1" }  // object instead of array
        })
    });
    const data = await res.json();
    assert(res.status === 400, "Status 400 for non-array publicSignals");
    assert(data.error.code === "VALIDATION_ERROR", "Rejects non-array publicSignals");
}

// ════════════════════════════════════════════
// SECTION 3: V2 Routes
// ════════════════════════════════════════════
async function testV2AuditInvalidNullifier() {
    console.log("\n━━━ [11] GET /v2/audit/:nullifier (invalid) ━━━");
    const res = await fetch(`${API}/v2/audit/short`);
    const data = await res.json();
    assert(res.status === 400, "Status 400 for short nullifier");
    assert(data.error.code === "VALIDATION_ERROR", "VALIDATION_ERROR for invalid nullifier");
}

async function testV2AuditValidNullifier() {
    console.log("\n━━━ [12] GET /v2/audit/:nullifier (valid unused) ━━━");
    const res = await fetch(`${API}/v2/audit/1234567890abcdef`);
    const data = await res.json();
    assert(res.status === 200, "Status 200");
    assert(data.data.nullifier === "1234567890abcdef", "Returns queried nullifier");
    assert(typeof data.data.used === "boolean", "Returns boolean 'used' field");
    assert(data.data.checkedAt, "Has checkedAt timestamp");
}

// ════════════════════════════════════════════
// SECTION 4: 404 & Error Handling
// ════════════════════════════════════════════
async function test404() {
    console.log("\n━━━ [13] GET /nonexistent ━━━");
    const res = await fetch(`${API}/nonexistent`);
    const data = await res.json();
    assert(res.status === 404, "Status 404");
    assert(data.error.code === "NOT_FOUND", "NOT_FOUND error code");
}

async function testRateLimitHeaders() {
    console.log("\n━━━ [14] Rate Limit Headers ━━━");
    const res = await fetch(`${API}/health`);
    assert(res.headers.get("x-ratelimit-limit") !== null, "Has X-RateLimit-Limit");
    assert(res.headers.get("x-ratelimit-remaining") !== null, "Has X-RateLimit-Remaining");
    assert(res.headers.get("x-request-id") !== null, "Has X-Request-ID");
}

async function testRequestIdUnique() {
    console.log("\n━━━ [15] Request ID Uniqueness ━━━");
    const res1 = await fetch(`${API}/health`);
    const res2 = await fetch(`${API}/health`);
    const id1 = res1.headers.get("x-request-id");
    const id2 = res2.headers.get("x-request-id");
    assert(id1 !== id2, "Each request gets a unique X-Request-ID");
}

async function testCORSHeaders() {
    console.log("\n━━━ [16] CORS Headers ━━━");
    const res = await fetch(`${API}/health`);
    const acao = res.headers.get("access-control-allow-origin");
    assert(acao === "*", "CORS allows all origins in dev mode");
}

// ════════════════════════════════════════════
// SECTION 5: V3 Document Upload & CRUD
// ════════════════════════════════════════════
let uploadedDocId = null;

async function testV3DocumentUploadNoFile() {
    console.log("\n━━━ [17] POST /v3/documents/upload (no file) ━━━");
    const formData = new FormData();
    const res = await fetch(`${API}/v3/documents/upload`, {
        method: "POST",
        body: formData
    });
    const data = await res.json();
    assert(res.status === 400, "Status 400 when no file");
    assert(data.error.code === "NO_FILE", "NO_FILE error code");
}

async function testV3DocumentUploadInvalidType() {
    console.log("\n━━━ [18] POST /v3/documents/upload (invalid MIME type) ━━━");
    const formData = new FormData();
    const blob = new Blob(["test data"], { type: "text/plain" });
    formData.append("document", blob, "test.txt");
    
    const res = await fetch(`${API}/v3/documents/upload`, {
        method: "POST",
        body: formData
    });
    const data = await res.json();
    assert(res.status === 400, "Status 400 for text/plain file");
    assert(data.error.code === "INVALID_FILE_TYPE", "INVALID_FILE_TYPE error code");
}

async function testV3DocumentUploadValidPDF() {
    console.log("\n━━━ [19] POST /v3/documents/upload (valid PDF) ━━━");
    const formData = new FormData();
    const testContent = `%PDF-1.4\n%\n1 0 obj\n<</Title (Test Doc)>>\nendobj\nName: John Doe\nDOB: 15/03/1995\nThis is a test identity document.`;
    const blob = new Blob([testContent], { type: "application/pdf" });
    formData.append("document", blob, "test-doc.pdf");
    formData.append("fullName", "John Doe");
    formData.append("dateOfBirth", "1995-03-15");
    formData.append("documentType", "passport");

    const res = await fetch(`${API}/v3/documents/upload`, {
        method: "POST",
        body: formData
    });
    const data = await res.json();
    assert(res.status === 201, "Status 201 for successful upload");
    assert(data.data.document.id, "Has document ID");
    assert(data.data.document.documentHash, "Has document hash");
    assert(data.data.document.isVerified === true, "Document is verified (name+dob present)");
    assert(data.data.document.attributes.name, "Has extracted name");
    assert(data.data.document.attributes.dob, "Has extracted DOB");
    
    uploadedDocId = data.data.document.id;
}

async function testV3DocumentUploadDuplicate() {
    console.log("\n━━━ [20] POST /v3/documents/upload (duplicate) ━━━");
    const formData = new FormData();
    const testContent = `%PDF-1.4\n%\n1 0 obj\n<</Title (Test Doc)>>\nendobj\nName: John Doe\nDOB: 15/03/1995\nThis is a test identity document.`;
    const blob = new Blob([testContent], { type: "application/pdf" });
    formData.append("document", blob, "test-doc.pdf");

    const res = await fetch(`${API}/v3/documents/upload`, {
        method: "POST",
        body: formData
    });
    const data = await res.json();
    assert(res.status === 201, "Status 201 even for duplicate (returns existing)");
    assert(data.data.document.duplicate === true, "Marked as duplicate");
}

async function testV3DocumentUploadImage() {
    console.log("\n━━━ [21] POST /v3/documents/upload (valid image/png) ━━━");
    const formData = new FormData();
    // Create a minimal PNG (1x1 pixel white)
    const pngHeader = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
        0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
        0xde
    ]);
    const blob = new Blob([pngHeader], { type: "image/png" });
    formData.append("document", blob, "test-image.png");
    formData.append("fullName", "Image Test User");
    formData.append("dateOfBirth", "2000-01-01");

    const res = await fetch(`${API}/v3/documents/upload`, {
        method: "POST",
        body: formData
    });
    const data = await res.json();
    // Should succeed (201) — even if OCR finds nothing, fallback attributes from body are used
    assert(res.status === 201, "Status 201 for image upload");
    assert(data.data.document.id, "Has document ID");
}

async function testV3DocumentList() {
    console.log("\n━━━ [22] GET /v3/documents ━━━");
    const res = await fetch(`${API}/v3/documents`);
    const data = await res.json();
    assert(res.status === 200, "Status 200");
    assert(Array.isArray(data.data.documents), "Documents is array");
    assert(data.data.count >= 1, "Has at least 1 document");
    
    const doc = data.data.documents.find(d => d.id === uploadedDocId);
    assert(doc !== undefined, "Uploaded doc appears in list");
}

async function testV3DocumentGetById() {
    console.log("\n━━━ [23] GET /v3/documents/:id (existing) ━━━");
    if (!uploadedDocId) { skip("No uploaded doc ID"); return; }
    
    const res = await fetch(`${API}/v3/documents/${uploadedDocId}`);
    const data = await res.json();
    assert(res.status === 200, "Status 200");
    assert(data.data.document.id === uploadedDocId, "Correct document ID");
    assert(data.data.document.encryptionAlgorithm === "AES-256-GCM", "Shows encryption algorithm");
    assert(data.data.document.documentHash, "Has document hash");
}

async function testV3DocumentGetNotFound() {
    console.log("\n━━━ [24] GET /v3/documents/:id (non-existent) ━━━");
    const res = await fetch(`${API}/v3/documents/non-existent-id`);
    const data = await res.json();
    assert(res.status === 404, "Status 404 for non-existent doc");
    assert(data.error.code === "DOCUMENT_NOT_FOUND", "DOCUMENT_NOT_FOUND code");
}

// ════════════════════════════════════════════
// SECTION 6: V3 Credential Issue & CRUD
// ════════════════════════════════════════════
let issuedCredId = null;

async function testV3CredentialIssueMissingDocId() {
    console.log("\n━━━ [25] POST /v3/credentials/issue (missing documentId) ━━━");
    const res = await fetch(`${API}/v3/credentials/issue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
    });
    const data = await res.json();
    assert(res.status === 400, "Status 400 for missing documentId");
    assert(data.error.code === "MISSING_DOCUMENT_ID", "MISSING_DOCUMENT_ID code");
}

async function testV3CredentialIssueDocNotFound() {
    console.log("\n━━━ [26] POST /v3/credentials/issue (doc not found) ━━━");
    const res = await fetch(`${API}/v3/credentials/issue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: "nonexistent-doc-id" })
    });
    const data = await res.json();
    assert(res.status === 404, "Status 404 for non-existent document");
    assert(data.error.code === "DOCUMENT_NOT_FOUND", "DOCUMENT_NOT_FOUND code");
}

async function testV3CredentialIssueSuccess() {
    console.log("\n━━━ [27] POST /v3/credentials/issue (success) ━━━");
    if (!uploadedDocId) { skip("No uploaded doc ID"); return; }

    const res = await fetch(`${API}/v3/credentials/issue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            documentId: uploadedDocId,
            credentialType: "age_verification"
        })
    });
    const data = await res.json();
    assert(res.status === 201, "Status 201 for credential issuance");
    assert(data.data.credential.id, "Has credential ID");
    assert(data.data.credential.documentId === uploadedDocId, "Bound to correct document");
    assert(data.data.credential.credentialType === "age_verification", "Correct credential type");
    assert(typeof data.data.credential.isEligible === "boolean", "Has isEligible boolean");
    assert(typeof data.data.credential.age === "number", "Has age number");
    assert(data.data.credential.status === "active", "Status is active");
    assert(data.data.credential.issuedAt, "Has issuedAt");
    assert(data.data.credential.expiresAt, "Has expiresAt");
    
    // ZK proof should be generated if circuit files exist
    if (data.data.credential.zkProof) {
        assert(data.data.credential.zkProof.verified === true, "ZK proof verified");
        assert(data.data.credential.zkProof.circuit === "age_check_v2", "Correct circuit name");
        assert(data.data.credential.zkProof.proofSystem === "PLONK", "PLONK proof system");
        assert(data.data.credential.zkProof.curve === "BN128", "BN128 curve");
    }
    
    assert(data.data.credential.binding, "Has document binding");
    
    issuedCredId = data.data.credential.id;
}

async function testV3CredentialIssueMinorAge() {
    console.log("\n━━━ [28] POST /v3/credentials/issue (minor - not eligible) ━━━");
    // First upload a doc for a minor
    const formData = new FormData();
    const testContent = `%PDF-1.4\nMinor document. Name: Young Person DOB: 01/01/2015`;
    const blob = new Blob([testContent], { type: "application/pdf" });
    formData.append("document", blob, "minor-doc.pdf");
    formData.append("fullName", "Young Person");
    formData.append("dateOfBirth", "2015-01-01");

    const uploadRes = await fetch(`${API}/v3/documents/upload`, { method: "POST", body: formData });
    const uploadData = await uploadRes.json();
    const minorDocId = uploadData.data.document.id;

    const res = await fetch(`${API}/v3/credentials/issue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: minorDocId })
    });
    const data = await res.json();
    assert(res.status === 201, "Status 201 for minor credential");
    assert(data.data.credential.isEligible === false, "Minor is NOT eligible (age < 18)");
    assert(data.data.credential.age < 18, "Age < 18 confirmed");
}

async function testV3CredentialList() {
    console.log("\n━━━ [29] GET /v3/credentials ━━━");
    const res = await fetch(`${API}/v3/credentials`);
    const data = await res.json();
    assert(res.status === 200, "Status 200");
    assert(Array.isArray(data.data.credentials), "Credentials is array");
    assert(data.data.count >= 1, "Has at least 1 credential");
}

async function testV3CredentialListByDocId() {
    console.log("\n━━━ [30] GET /v3/credentials?documentId=... ━━━");
    if (!uploadedDocId) { skip("No uploaded doc ID"); return; }
    
    const res = await fetch(`${API}/v3/credentials?documentId=${uploadedDocId}`);
    const data = await res.json();
    assert(res.status === 200, "Status 200");
    assert(data.data.credentials.every(c => c.documentId === uploadedDocId), "All creds belong to queried doc");
}

async function testV3CredentialGetById() {
    console.log("\n━━━ [31] GET /v3/credentials/:id (existing) ━━━");
    if (!issuedCredId) { skip("No credential ID"); return; }
    
    const res = await fetch(`${API}/v3/credentials/${issuedCredId}`);
    const data = await res.json();
    assert(res.status === 200, "Status 200");
    assert(data.data.credential.id === issuedCredId, "Correct credential ID");
    assert(data.data.credential.attributes, "Has attributes");
    assert(Array.isArray(data.data.shareLinks), "Has shareLinks array");
}

async function testV3CredentialGetNotFound() {
    console.log("\n━━━ [32] GET /v3/credentials/:id (non-existent) ━━━");
    const res = await fetch(`${API}/v3/credentials/nonexistent-cred-id`);
    const data = await res.json();
    assert(res.status === 404, "Status 404");
    assert(data.error.code === "CREDENTIAL_NOT_FOUND", "CREDENTIAL_NOT_FOUND code");
}

// ════════════════════════════════════════════
// SECTION 7: V3 Share & Public Verify
// ════════════════════════════════════════════
let shareToken = null;

async function testV3ShareCredentialSuccess() {
    console.log("\n━━━ [33] POST /v3/credentials/:id/share (success) ━━━");
    if (!issuedCredId) { skip("No credential ID"); return; }

    const res = await fetch(`${API}/v3/credentials/${issuedCredId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            organizationName: "Test Corp",
            expiresInHours: 48
        })
    });
    const data = await res.json();
    assert(res.status === 201, "Status 201 for share link");
    assert(data.data.shareLink.token, "Has share token");
    assert(data.data.shareLink.verifyUrl.includes("/verify/"), "Has verify URL");
    assert(data.data.shareLink.organizationName === "Test Corp", "Correct org name");
    assert(data.data.shareLink.expiresAt, "Has expiresAt");
    assert(data.data.shareLink.status === "active", "Status is active");

    shareToken = data.data.shareLink.token;
}

async function testV3ShareCredentialNotFound() {
    console.log("\n━━━ [34] POST /v3/credentials/:id/share (cred not found) ━━━");
    const res = await fetch(`${API}/v3/credentials/nonexistent-id/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationName: "Org" })
    });
    const data = await res.json();
    assert(res.status === 404, "Status 404 for non-existent credential");
    assert(data.error.code === "CREDENTIAL_NOT_FOUND", "CREDENTIAL_NOT_FOUND code");
}

async function testV3ShareDefaultExpiry() {
    console.log("\n━━━ [35] POST /v3/credentials/:id/share (default expiry) ━━━");
    if (!issuedCredId) { skip("No credential ID"); return; }

    const res = await fetch(`${API}/v3/credentials/${issuedCredId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
    });
    const data = await res.json();
    assert(res.status === 201, "Status 201");
    // Default expiry is 72 hours
    const expiresAt = new Date(data.data.shareLink.expiresAt);
    const now = new Date();
    const diffHours = (expiresAt - now) / (1000 * 60 * 60);
    assert(diffHours > 70 && diffHours <= 73, "Default expiry ~72 hours");
}

async function testV3PublicVerifyValid() {
    console.log("\n━━━ [36] GET /v3/verify/:token (valid token) ━━━");
    if (!shareToken) { skip("No share token"); return; }

    const res = await fetch(`${API}/v3/verify/${shareToken}`);
    const data = await res.json();
    assert(res.status === 200, "Status 200");
    assert(typeof data.data.verification.verified === "boolean", "Has verified boolean");
    assert(typeof data.data.verification.eligible === "boolean", "Has eligible boolean");
    assert(data.data.verification.proofHash, "Has proofHash");
    assert(data.data.verification.credentialType, "Has credentialType");
    assert(data.data.verification.documentBinding, "Has documentBinding");
    assert(data.data.verification.sharedWith === "Test Corp", "Correct sharedWith");
    assert(data.data.verification.verificationCount >= 1, "verificationCount >= 1");
    assert(data.data.verification.issuedAt, "Has issuedAt");
    assert(data.data.verification.expiresAt, "Has expiresAt");
}

async function testV3PublicVerifyInvalidToken() {
    console.log("\n━━━ [37] GET /v3/verify/:token (invalid token) ━━━");
    const res = await fetch(`${API}/v3/verify/fake-token-does-not-exist`);
    const data = await res.json();
    assert(res.status === 404, "Status 404 for invalid token");
    assert(data.error.code === "INVALID_SHARE_LINK", "INVALID_SHARE_LINK code");
}

async function testV3PublicVerifyCountIncrement() {
    console.log("\n━━━ [38] GET /v3/verify/:token (count increments) ━━━");
    if (!shareToken) { skip("No share token"); return; }

    const res1 = await fetch(`${API}/v3/verify/${shareToken}`);
    const data1 = await res1.json();
    const count1 = data1.data.verification.verificationCount;

    const res2 = await fetch(`${API}/v3/verify/${shareToken}`);
    const data2 = await res2.json();
    const count2 = data2.data.verification.verificationCount;

    assert(count2 === count1 + 1, "Verification count increments on each call");
}

// ════════════════════════════════════════════
// SECTION 8: Share Revocation
// ════════════════════════════════════════════
async function testV3RevokeShareMissingToken() {
    console.log("\n━━━ [39] DELETE /v3/credentials/:id/share (missing token) ━━━");
    if (!issuedCredId) { skip("No credential ID"); return; }
    
    const res = await fetch(`${API}/v3/credentials/${issuedCredId}/share`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
    });
    const data = await res.json();
    assert(res.status === 400, "Status 400 for missing token");
    assert(data.error.code === "MISSING_TOKEN", "MISSING_TOKEN code");
}

async function testV3RevokeShareNotFound() {
    console.log("\n━━━ [40] DELETE /v3/credentials/:id/share (not found) ━━━");
    if (!issuedCredId) { skip("No credential ID"); return; }

    const res = await fetch(`${API}/v3/credentials/${issuedCredId}/share`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: "nonexistent-token" })
    });
    const data = await res.json();
    assert(res.status === 404, "Status 404 for non-existent share");
    assert(data.error.code === "SHARE_NOT_FOUND", "SHARE_NOT_FOUND code");
}

async function testV3RevokeShareSuccess() {
    console.log("\n━━━ [41] DELETE /v3/credentials/:id/share (success) ━━━");
    if (!issuedCredId || !shareToken) { skip("No credential/share"); return; }

    const res = await fetch(`${API}/v3/credentials/${issuedCredId}/share`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: shareToken })
    });
    const data = await res.json();
    assert(res.status === 200, "Status 200 for revoke");
    assert(data.data.revoked === true, "Share marked as revoked");
    assert(data.data.token === shareToken, "Correct token returned");
}

async function testV3PublicVerifyRevokedToken() {
    console.log("\n━━━ [42] GET /v3/verify/:token (revoked token) ━━━");
    if (!shareToken) { skip("No share token"); return; }

    const res = await fetch(`${API}/v3/verify/${shareToken}`);
    const data = await res.json();
    assert(res.status === 404, "Status 404 for revoked token");
    assert(data.error.code === "INVALID_SHARE_LINK", "INVALID_SHARE_LINK code after revocation");
}

// ════════════════════════════════════════════
// SECTION 9: Document Delete
// ════════════════════════════════════════════
async function testV3DocumentDeleteNotFound() {
    console.log("\n━━━ [43] DELETE /v3/documents/:id (not found) ━━━");
    const res = await fetch(`${API}/v3/documents/nonexistent-doc`, {
        method: "DELETE"
    });
    const data = await res.json();
    assert(res.status === 404, "Status 404 for non-existent doc");
    assert(data.error.code === "DOCUMENT_NOT_FOUND", "DOCUMENT_NOT_FOUND code");
}

async function testV3DocumentDeleteSuccess() {
    console.log("\n━━━ [44] DELETE /v3/documents/:id (success) ━━━");
    if (!uploadedDocId) { skip("No doc to delete"); return; }

    const res = await fetch(`${API}/v3/documents/${uploadedDocId}`, {
        method: "DELETE"
    });
    const data = await res.json();
    assert(res.status === 200, "Status 200 for delete");
    assert(data.data.deleted === true, "Document marked as deleted");
    assert(data.data.documentId === uploadedDocId, "Correct document ID returned");
}

async function testV3DocumentGetDeleted() {
    console.log("\n━━━ [45] GET /v3/documents/:id (after delete) ━━━");
    if (!uploadedDocId) { skip("No doc"); return; }

    const res = await fetch(`${API}/v3/documents/${uploadedDocId}`);
    const data = await res.json();
    assert(res.status === 404, "Status 404 after deletion");
    assert(data.error.code === "DOCUMENT_NOT_FOUND", "Deleted doc not found");
}

// ════════════════════════════════════════════
// SECTION 10: E2E Full Flow (Upload → Issue → Share → Verify → Revoke)
// ════════════════════════════════════════════
async function testFullFlow() {
    console.log("\n━━━ [46] Full End-to-End Flow ━━━");

    // Step 1: Upload
    const formData = new FormData();
    const content = `%PDF-1.4\nFull Flow Test\nName: Alice Smith\nDOB: 1990-06-15\nThis is a full flow test document.`;
    const blob = new Blob([content], { type: "application/pdf" });
    formData.append("document", blob, "e2e-test.pdf");
    formData.append("fullName", "Alice Smith");
    formData.append("dateOfBirth", "1990-06-15");

    const uploadRes = await fetch(`${API}/v3/documents/upload`, { method: "POST", body: formData });
    const uploadData = await uploadRes.json();
    assert(uploadRes.status === 201, "[E2E] Upload succeeds");
    const docId = uploadData.data.document.id;

    // Step 2: Issue credential
    const issueRes = await fetch(`${API}/v3/credentials/issue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: docId, credentialType: "age_verification" })
    });
    const issueData = await issueRes.json();
    assert(issueRes.status === 201, "[E2E] Credential issued");
    assert(issueData.data.credential.isEligible === true, "[E2E] Adult is eligible");
    const credId = issueData.data.credential.id;

    // Step 3: Create share link
    const shareRes = await fetch(`${API}/v3/credentials/${credId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationName: "E2E Corp", expiresInHours: 24 })
    });
    const shareData = await shareRes.json();
    assert(shareRes.status === 201, "[E2E] Share link created");
    const token = shareData.data.shareLink.token;

    // Step 4: Public verification
    const verifyRes = await fetch(`${API}/v3/verify/${token}`);
    const verifyData = await verifyRes.json();
    assert(verifyRes.status === 200, "[E2E] Public verify succeeds");
    assert(verifyData.data.verification.verified === true, "[E2E] Proof is verified");
    assert(verifyData.data.verification.eligible === true, "[E2E] Person is eligible");
    assert(verifyData.data.verification.sharedWith === "E2E Corp", "[E2E] Correct org");

    // Step 5: Revoke share link
    const revokeRes = await fetch(`${API}/v3/credentials/${credId}/share`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token })
    });
    assert(revokeRes.status === 200, "[E2E] Share revoked");

    // Step 6: Verify revoked link fails
    const verifyRevokedRes = await fetch(`${API}/v3/verify/${token}`);
    assert(verifyRevokedRes.status === 404, "[E2E] Revoked link returns 404");
}

// ════════════════════════════════════════════
// RUN ALL
// ════════════════════════════════════════════
async function runAll() {
    console.log("╔══════════════════════════════════════════════╗");
    console.log("║  AegisID — Comprehensive API Test Suite      ║");
    console.log("║  Testing ALL endpoints, inputs & conditions  ║");
    console.log("╚══════════════════════════════════════════════╝");
    console.log(`Target: ${API}\n`);

    try {
        // Section 1: Health & Root
        await testHealth();
        await testRoot();
        
        // Section 2: V1 routes
        await testV1ProofTypes();
        await testV1VerifyMissingBody();
        await testV1VerifyMissingPublicSignals();
        await testV1VerifyInvalidProofStructure();
        await testV1VerifyUnsupportedProofType();
        await testV1VerifyNonStringPublicSignals();
        await testV1VerifyProofNotObject();
        await testV1VerifyPublicSignalsNotArray();
        
        // Section 3: V2 routes
        await testV2AuditInvalidNullifier();
        await testV2AuditValidNullifier();
        
        // Section 4: Error handling
        await test404();
        await testRateLimitHeaders();
        await testRequestIdUnique();
        await testCORSHeaders();
        
        // Section 5: V3 Documents
        await testV3DocumentUploadNoFile();
        await testV3DocumentUploadInvalidType();
        await testV3DocumentUploadValidPDF();
        await testV3DocumentUploadDuplicate();
        await testV3DocumentUploadImage();
        await testV3DocumentList();
        await testV3DocumentGetById();
        await testV3DocumentGetNotFound();
        
        // Section 6: V3 Credentials
        await testV3CredentialIssueMissingDocId();
        await testV3CredentialIssueDocNotFound();
        await testV3CredentialIssueSuccess();
        await testV3CredentialIssueMinorAge();
        await testV3CredentialList();
        await testV3CredentialListByDocId();
        await testV3CredentialGetById();
        await testV3CredentialGetNotFound();
        
        // Section 7: V3 Share & Public Verify
        await testV3ShareCredentialSuccess();
        await testV3ShareCredentialNotFound();
        await testV3ShareDefaultExpiry();
        await testV3PublicVerifyValid();
        await testV3PublicVerifyInvalidToken();
        await testV3PublicVerifyCountIncrement();
        
        // Section 8: Share Revocation
        await testV3RevokeShareMissingToken();
        await testV3RevokeShareNotFound();
        await testV3RevokeShareSuccess();
        await testV3PublicVerifyRevokedToken();
        
        // Section 9: Document Delete
        await testV3DocumentDeleteNotFound();
        await testV3DocumentDeleteSuccess();
        await testV3DocumentGetDeleted();
        
        // Section 10: Full E2E Flow
        await testFullFlow();
        
    } catch (e) {
        console.error("\n💥 Test runner error:", e.message);
        console.error("   Stack:", e.stack);
        failed++;
    }

    console.log("\n══════════════════════════════════════════════");
    console.log(`  Results: ${passed} passed, ${failed} failed, ${skipped} skipped`);
    console.log("══════════════════════════════════════════════");
    
    setTimeout(() => {
        process.exit(failed > 0 ? 1 : 0);
    }, 200);
}

runAll();

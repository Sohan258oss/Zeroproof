/**
 * AegisID v3.0 — End-to-End Backend Flow Test
 * 
 * Tests the full pipeline:
 * 1. Upload document (encrypted)
 * 2. Issue ZK credential (bound to hash)
 * 3. Generate share link
 * 4. Verify via public endpoint
 */

const fs = require("fs");
const path = require("path");

const API_BASE = "http://localhost:3000";

async function runTest() {
    console.log("🚀 Starting AegisID v3.0 Flow Test...");

    try {
        // 1. Upload Document
        console.log("\n[1/4] Uploading document...");
        const formData = new FormData();
        const testFile = Buffer.from("%PDF-1.4\n%\n1 0 obj\n<</Title (ID Card) /Author (AegisID)>>\nendobj\nThis is a dummy identity document for Alice Tester born 1990-01-01.");
        const blob = new Blob([testFile], { type: "application/pdf" });
        
        formData.append("document", blob, "test-id.pdf");
        formData.append("fullName", "Alice Tester");
        formData.append("dateOfBirth", "1990-01-01");
        formData.append("documentType", "passport");

        const uploadRes = await fetch(`${API_BASE}/v3/documents/upload`, {
            method: "POST",
            body: formData
        });
        const uploadData = await uploadRes.json();
        
        if (!uploadRes.ok) throw new Error(`Upload failed: ${JSON.stringify(uploadData)}`);
        const docId = uploadData.data.document.id;
        console.log(`✅ Document uploaded: ${docId}`);

        // 2. Issue Credential
        console.log("\n[2/4] Issuing ZK credential...");
        const issueRes = await fetch(`${API_BASE}/v3/credentials/issue`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                documentId: docId,
                credentialType: "age_verification"
            })
        });
        const issueData = await issueRes.json();
        
        if (!issueRes.ok) throw new Error(`Issuance failed: ${JSON.stringify(issueData)}`);
        const credId = issueData.data.credential.id;
        console.log(`✅ Credential issued: ${credId}`);
        console.log(`   Eligible: ${issueData.data.credential.isEligible}`);
        console.log(`   ZK Proof Verified: ${issueData.data.credential.zkProof?.verified}`);

        // 3. Generate Share Link
        console.log("\n[3/4] Generating share link...");
        const shareRes = await fetch(`${API_BASE}/v3/credentials/${credId}/share`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                organizationName: "Test Org",
                expiresInHours: 1
            })
        });
        const shareData = await shareRes.json();
        
        if (!shareRes.ok) throw new Error(`Sharing failed: ${JSON.stringify(shareData)}`);
        const token = shareData.data.shareLink.token;
        console.log(`✅ Share token generated: ${token}`);

        // 4. Public Verification
        console.log("\n[4/4] Verifying via public endpoint...");
        const verifyRes = await fetch(`${API_BASE}/v3/verify/${token}`);
        const verifyData = await verifyRes.json();
        
        if (!verifyRes.ok) throw new Error(`Verification failed: ${JSON.stringify(verifyData)}`);
        console.log(`✅ Public Verification Result:`);
        console.log(JSON.stringify(verifyData.data.verification, null, 2));

        console.log("\n✨ AegisID v3.0 Flow Test Passed Successfully!");

    } catch (err) {
        console.error("\n❌ Test Failed:");
        console.error(err.message);
        process.exit(1);
    }
}

runTest();

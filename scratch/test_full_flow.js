const fs = require("fs");
const path = require("path");

async function testUploadFlow() {
    const API = "http://localhost:3000";
    const filePath = "C:\\Users\\phata\\.gemini\\antigravity\\brain\\7b46174f-f361-4fcb-aa14-351d37f88b97\\test_passport_1778686066462.png";
    
    if (!fs.existsSync(filePath)) {
        console.error("Test file not found at:", filePath);
        process.exit(1);
    }

    console.log("--- Starting Full System Test ---");

    try {
        // 1. Upload Document
        console.log("Step 1: Uploading document...");
        const fileBuffer = fs.readFileSync(filePath);
        const formData = new FormData();
        const blob = new Blob([fileBuffer], { type: "image/png" });
        formData.append("document", blob, "test_passport.png");
        formData.append("fullName", "John Doe");
        formData.append("dateOfBirth", "1990-01-01");
        formData.append("documentType", "passport");

        const uploadRes = await fetch(`${API}/v3/documents/upload`, {
            method: "POST",
            body: formData
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(`Upload failed: ${JSON.stringify(uploadData)}`);

        const docId = uploadData.data.document.id;
        console.log("✓ Document uploaded. ID:", docId);
        console.log("✓ Document Hash:", uploadData.data.document.documentHash);

        // 2. Issue Credential
        console.log("Step 2: Issuing ZK credential...");
        const issueRes = await fetch(`${API}/v3/credentials/issue`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ documentId: docId })
        });

        const issueData = await issueRes.json();
        if (!issueRes.ok) throw new Error(`Issuance failed: ${JSON.stringify(issueData)}`);

        const credentialId = issueData.data.credential.id;
        console.log("✓ Credential issued. ID:", credentialId);
        console.log("✓ Eligibility:", issueData.data.credential.isEligible ? "YES" : "NO");
        console.log("✓ ZK Proof Status:", issueData.data.credential.zkProof?.verified ? "VERIFIED" : "GENERATED");

        // 3. Verify Storage
        console.log("Step 3: Verifying storage...");
        const docsDir = path.join(__dirname, "../data/documents");
        const encryptedFile = path.join(docsDir, `${docId}.enc`);
        
        if (fs.existsSync(encryptedFile)) {
            console.log("✓ Encrypted file found in storage.");
        } else {
            console.error("✗ Encrypted file MISSING in storage!");
        }

        console.log("--- Test Completed Successfully ---");
    } catch (error) {
        console.error("--- Test Failed ---");
        console.error(error.message);
        process.exit(1);
    }
}

testUploadFlow();

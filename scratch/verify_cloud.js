const fs = require("fs");
const path = require("path");

async function verifyCloudStorage() {
    const DATA_DIR = "c:\\Users\\phata\\.gemini\\antigravity\\scratch\\Zeroproof\\data";
    const VAULT_DIR = path.join(DATA_DIR, "vault");
    const VERIFIED_DIR = path.join(DATA_DIR, "verified");

    console.log("--- Verifying Cloud Implementation ---");
    
    if (fs.existsSync(VAULT_DIR)) {
        const vaultFiles = fs.readdirSync(VAULT_DIR);
        console.log(`Vault Storage (Encrypted): ${vaultFiles.length} files`);
        vaultFiles.forEach(f => console.log(` - ${f}`));
    }

    if (fs.existsSync(VERIFIED_DIR)) {
        const verifiedFiles = fs.readdirSync(VERIFIED_DIR);
        console.log(`Verified Storage (Original Backup): ${verifiedFiles.length} files`);
        verifiedFiles.forEach(f => console.log(` - ${f}`));
    }

    const metaFile = path.join(DATA_DIR, "documents.json");
    if (fs.existsSync(metaFile)) {
        const docs = JSON.parse(fs.readFileSync(metaFile, "utf-8"));
        console.log("\nDocument Metadata (Security Audit):");
        docs.forEach(d => {
            console.log(`ID: ${d.id}`);
            console.log(`Status: ${d.isVerified ? "✅ VERIFIED BY OCR" : "⚠ MANUAL REVIEW"}`);
            console.log(`Extracted Name: ${d.attributes.fullName}`);
            console.log(`Vault Path: ${d.vaultPath}`);
            console.log(`Verified Path: ${d.verifiedPath}`);
            console.log("---");
        });
    }
}

verifyCloudStorage();

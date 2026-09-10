const snarkjs = require("snarkjs");
const fs = require("fs");
const path = require("path");

// Mocking AWS CloudWatch logs to avoid actual AWS dependency crashes if credentials are not present locally.
let cloudwatchlogs = null;
try {
    const AWS = require("aws-sdk");
    cloudwatchlogs = new AWS.CloudWatchLogs({ region: "us-east-1" });
} catch {
    // aws-sdk v2 is not installed (project uses AWS SDK v3); fallback to local logging
}

/**
 * Verify a Plonk proof for the Age Check circuit
 * 
 * @param {Object} proof - Plonk proof object
 * @param {Array} publicSignals - Public signals array
 * @returns {Promise<boolean>} True if valid, false otherwise
 */
async function verifyProof(proof, publicSignals) {
    try {
        const vKeyPath = path.join(__dirname, "../keys/verification_key.json");
        const vKey = JSON.parse(fs.readFileSync(vKeyPath, "utf-8"));

        // Validate proof
        const isValid = await snarkjs.plonk.verify(vKey, publicSignals, proof);

        // Log to CloudWatch asynchronously (suppressing exact PII/proof details)
        logVerificationResult(isValid);

        return isValid;
    } catch (error) {
        console.error("Verification failed:", error);
        logVerificationResult(false);
        return false;
    }
}

function logVerificationResult(isValid) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Verification result: ${isValid}`);
    
    // In actual AWS runtime this would submit safely to CloudWatch
    // e.g., cloudwatchlogs.putLogEvents({ ... })
}

module.exports = {
    verifyProof
};

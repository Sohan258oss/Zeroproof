/**
 * AegisID — Audit Logger Service
 * 
 * Logs verification events to DynamoDB for compliance and analytics.
 * Never stores PII — only proof metadata, results, and hashed identifiers.
 * 
 * DynamoDB Schema:
 *   PK: VERIFY#<requestId>
 *   SK: <timestamp>
 *   GSI1PK: NULLIFIER#<nullifierHash>  (for nullifier lookups)
 *   TTL: auto-expire after 90 days
 */

const AWS_ENABLED = process.env.AEGISID_AWS_ENABLED === "true";
const TABLE_NAME = process.env.AEGISID_DYNAMO_TABLE || "AegisIDVerificationLogs";

let dynamoClient = null;

function getDynamoClient() {
    if (dynamoClient) return dynamoClient;

    if (AWS_ENABLED) {
        try {
            const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
            const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");
            const client = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" });
            dynamoClient = DynamoDBDocumentClient.from(client);
            return dynamoClient;
        } catch (err) {
            console.warn("[AuditLogger] AWS SDK not available, falling back to local logging");
        }
    }

    return null;
}

/**
 * Log a verification event.
 * 
 * @param {Object} params
 * @param {string} params.requestId - Unique request identifier
 * @param {string} params.proofType - Circuit type used
 * @param {boolean} params.verified - Whether proof was cryptographically valid
 * @param {boolean} params.isEligible - Whether the user met the condition
 * @param {string|null} params.nullifierHash - Nullifier (if applicable)
 * @param {string[]} params.publicSignals - Public signals (no private data)
 * @param {string} params.ipHash - SHA-256 hash of requester IP
 * @param {number} params.processingTimeMs - Time taken to verify
 */
async function logVerification({
    requestId,
    proofType,
    verified,
    isEligible,
    nullifierHash,
    publicSignals,
    ipHash,
    processingTimeMs
}) {
    const timestamp = new Date().toISOString();
    const ttl = Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60); // 90 days

    const logEntry = {
        PK: `VERIFY#${requestId}`,
        SK: timestamp,
        GSI1PK: nullifierHash ? `NULLIFIER#${nullifierHash}` : undefined,
        proofType,
        verified,
        isEligible,
        nullifierHash: nullifierHash || "N/A",
        publicSignals,
        ipHash,
        processingTimeMs,
        ttl
    };

    // Always log to console (CloudWatch in Lambda)
    console.log(`[AUDIT] ${JSON.stringify({
        requestId,
        proofType,
        verified,
        isEligible,
        nullifierUsed: !!nullifierHash,
        processingTimeMs,
        timestamp
    })}`);

    // Write to DynamoDB if available
    const client = getDynamoClient();
    if (client) {
        try {
            const { PutCommand } = require("@aws-sdk/lib-dynamodb");
            await client.send(new PutCommand({
                TableName: TABLE_NAME,
                Item: logEntry
            }));
        } catch (err) {
            // Audit logging should never crash the main flow
            console.error("[AuditLogger] DynamoDB write failed:", err.message);
        }
    }

    return logEntry;
}

module.exports = { logVerification };

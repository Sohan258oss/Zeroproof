/**
 * AegisID — Nullifier Store Service
 * 
 * Prevents replay attacks by tracking used nullifier hashes.
 * A nullifier is a deterministic hash derived from (user_secret, context).
 * If the same nullifier appears twice, the proof is being replayed.
 * 
 * Storage:
 *   - Development: In-memory Set
 *   - Production: DynamoDB with conditional writes
 */

const { NullifierReplayError } = require("../utils/errors");

const AWS_ENABLED = process.env.AEGISID_AWS_ENABLED === "true";
const TABLE_NAME = process.env.AEGISID_NULLIFIER_TABLE || "AegisIDNullifiers";

// In-memory store for development
const memoryStore = new Set();

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
            console.warn("[NullifierStore] AWS SDK not available, using in-memory store");
        }
    }
    return null;
}

/**
 * Check if a nullifier has been used, and if not, mark it as used.
 * This is an atomic check-and-set operation.
 * 
 * @param {string} nullifierHash - The nullifier hash from the proof
 * @param {string} proofType - The proof type (for audit context)
 * @returns {Promise<boolean>} true if the nullifier was fresh (first use)
 * @throws {NullifierReplayError} if the nullifier has already been used
 */
async function checkAndStoreNullifier(nullifierHash, proofType) {
    if (!nullifierHash || nullifierHash === "0") {
        // No nullifier provided — skip replay check
        return true;
    }

    const client = getDynamoClient();

    if (client) {
        // Production: DynamoDB conditional put (atomic)
        try {
            const { PutCommand } = require("@aws-sdk/lib-dynamodb");
            await client.send(new PutCommand({
                TableName: TABLE_NAME,
                Item: {
                    nullifierHash,
                    proofType,
                    usedAt: new Date().toISOString(),
                    ttl: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60) // 1 year
                },
                ConditionExpression: "attribute_not_exists(nullifierHash)"
            }));
            return true;
        } catch (err) {
            if (err.name === "ConditionalCheckFailedException") {
                throw new NullifierReplayError();
            }
            throw err;
        }
    } else {
        // Development: In-memory
        if (memoryStore.has(nullifierHash)) {
            throw new NullifierReplayError();
        }
        memoryStore.add(nullifierHash);
        return true;
    }
}

/**
 * Check if a nullifier has been used (read-only query).
 */
async function isNullifierUsed(nullifierHash) {
    const client = getDynamoClient();

    if (client) {
        try {
            const { GetCommand } = require("@aws-sdk/lib-dynamodb");
            const result = await client.send(new GetCommand({
                TableName: TABLE_NAME,
                Key: { nullifierHash }
            }));
            return !!result.Item;
        } catch (err) {
            console.error("[NullifierStore] Query failed:", err.message);
            return false;
        }
    }

    return memoryStore.has(nullifierHash);
}

module.exports = { checkAndStoreNullifier, isNullifierUsed };

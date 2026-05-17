/**
 * AegisID — Cloud Storage Layer (S3 & DynamoDB)
 * 
 * Handles encrypted document storage in S3 and metadata in DynamoDB.
 * Includes local fallback mode if AWS credentials are not provided.
 */

const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { DynamoDBClient, PutItemCommand, ScanCommand } = require("@aws-sdk/client-dynamodb");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const AWS_ENABLED = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY;
const S3_BUCKET = process.env.AWS_S3_BUCKET || "aegisid-document-vault";
const DYNAMO_TABLE_DOCS = process.env.AWS_DYNAMO_DOCS_TABLE || "AegisID_Documents";
const DYNAMO_TABLE_CREDS = process.env.AWS_DYNAMO_CREDS_TABLE || "AegisID_Credentials";

// Initialize AWS Clients (if enabled)
let s3Client, dynamoClient;
if (AWS_ENABLED) {
    const region = process.env.AWS_REGION || "us-east-1";
    s3Client = new S3Client({ region });
    dynamoClient = new DynamoDBClient({ region });
} else {
    console.warn("[CloudStore] AWS credentials not found. Using local fallback mode.");
}

// Encryption key (simulated KMS or real from env)
const ENCRYPTION_KEY = process.env.AEGISID_DOC_KEY || crypto.randomBytes(32).toString("hex");
const KEY_BUFFER = Buffer.from(ENCRYPTION_KEY.padEnd(64, "0").slice(0, 64), "hex");

// Local Fallback Directories
const DATA_DIR = path.join(__dirname, "../../data");
const VAULT_DIR = path.join(DATA_DIR, "vault");
const LOCAL_DB = path.join(DATA_DIR, "dynamodb_mock.json");

function ensureLocalDirs() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(VAULT_DIR)) fs.mkdirSync(VAULT_DIR, { recursive: true });
    if (!fs.existsSync(LOCAL_DB)) fs.writeFileSync(LOCAL_DB, JSON.stringify({ docs: [], creds: [] }), "utf-8");
}

function getLocalDB() {
    ensureLocalDirs();
    return JSON.parse(fs.readFileSync(LOCAL_DB, "utf-8"));
}

function saveLocalDB(data) {
    fs.writeFileSync(LOCAL_DB, JSON.stringify(data, null, 2), "utf-8");
}

/**
 * Encrypt buffer with AES-256-GCM.
 */
function encryptBuffer(buffer) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-gcm", KEY_BUFFER, iv);
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, encrypted]); // iv(16) + authTag(16) + encrypted
}

/**
 * Generate SHA-256 hash of document buffer.
 */
function computeDocumentHash(buffer) {
    return crypto.createHash("sha256").update(buffer).digest("hex");
}

/**
 * Upload an encrypted document to S3 (or local fallback).
 */
async function uploadToS3(buffer, key) {
    const encryptedBuffer = encryptBuffer(buffer);

    if (AWS_ENABLED) {
        const command = new PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: key,
            Body: encryptedBuffer,
            ServerSideEncryption: "AES256"
        });
        await s3Client.send(command);
        console.log(`[CloudStore] Uploaded encrypted doc to S3: s3://${S3_BUCKET}/${key}`);
    } else {
        ensureLocalDirs();
        const localPath = path.join(VAULT_DIR, key.replace(/\//g, "_"));
        fs.writeFileSync(localPath, encryptedBuffer);
        console.log(`[CloudStore] Local fallback: Saved encrypted doc to ${localPath}`);
    }
}

/**
 * Save document metadata to DynamoDB (or local fallback).
 */
async function saveMetadataToDynamoDB(item) {
    if (AWS_ENABLED) {
        // Basic DynamoDB marshalling
        const params = {
            TableName: DYNAMO_TABLE_DOCS,
            Item: {
                id: { S: item.id },
                documentHash: { S: item.documentHash },
                originalName: { S: item.originalName },
                mimeType: { S: item.mimeType },
                sizeBytes: { N: item.sizeBytes.toString() },
                attributes: { S: JSON.stringify(item.attributes) },
                isVerified: { BOOL: item.isVerified },
                status: { S: item.status || "active" },
                createdAt: { S: item.createdAt || new Date().toISOString() }
            }
        };
        await dynamoClient.send(new PutItemCommand(params));
        console.log(`[CloudStore] Metadata saved to DynamoDB table ${DYNAMO_TABLE_DOCS}`);
    } else {
        const db = getLocalDB();
        // Overwrite if exists, else append
        const idx = db.docs.findIndex(d => d.id === item.id);
        if (idx >= 0) db.docs[idx] = item;
        else db.docs.push(item);
        saveLocalDB(db);
        console.log(`[CloudStore] Local fallback: Metadata saved to mock DB`);
    }
}

/**
 * Check if a document hash already exists to prevent duplicates.
 * Returns the existing document ID if found, otherwise null.
 */
async function checkDuplicate(documentHash) {
    if (AWS_ENABLED) {
        // Simple scan for demo purposes (In prod, use Global Secondary Index on documentHash)
        const params = {
            TableName: DYNAMO_TABLE_DOCS,
            FilterExpression: "documentHash = :hash",
            ExpressionAttributeValues: {
                ":hash": { S: documentHash }
            }
        };
        const result = await dynamoClient.send(new ScanCommand(params));
        if (result.Items && result.Items.length > 0) {
            return result.Items[0].id.S;
        }
        return null;
    } else {
        const db = getLocalDB();
        const existing = db.docs.find(d => d.documentHash === documentHash);
        return existing ? existing.id : null;
    }
}

/**
 * Save ZK Proof to Credentials Table.
 */
async function saveCredentialToDynamoDB(cred) {
    if (AWS_ENABLED) {
        const params = {
            TableName: DYNAMO_TABLE_CREDS,
            Item: {
                id: { S: cred.id },
                documentId: { S: cred.documentId },
                credentialType: { S: cred.credentialType },
                isEligible: { BOOL: cred.isEligible },
                age: { N: (cred.age || 0).toString() },
                zkProof: { S: cred.zkProof ? JSON.stringify(cred.zkProof) : "" },
                status: { S: cred.status || "active" },
                issuedAt: { S: cred.issuedAt || new Date().toISOString() }
            }
        };
        await dynamoClient.send(new PutItemCommand(params));
        console.log(`[CloudStore] Credential saved to DynamoDB table ${DYNAMO_TABLE_CREDS}`);
    } else {
        const db = getLocalDB();
        const idx = db.creds.findIndex(c => c.id === cred.id);
        if (idx >= 0) db.creds[idx] = cred;
        else db.creds.push(cred);
        saveLocalDB(db);
    }
}

/**
 * Get Credential from DynamoDB.
 */
async function getCredentialFromDynamoDB(id) {
    if (AWS_ENABLED) {
        const params = {
            TableName: DYNAMO_TABLE_CREDS,
            FilterExpression: "id = :id",
            ExpressionAttributeValues: {
                ":id": { S: id }
            }
        };
        const result = await dynamoClient.send(new ScanCommand(params));
        if (result.Items && result.Items.length > 0) {
            const item = result.Items[0];
            return {
                id: item.id.S,
                documentId: item.documentId.S,
                credentialType: item.credentialType.S,
                isEligible: item.isEligible.BOOL,
                age: parseInt(item.age.N, 10),
                zkProof: item.zkProof.S ? JSON.parse(item.zkProof.S) : null,
                status: item.status.S,
                issuedAt: item.issuedAt.S
            };
        }
        return null;
    } else {
        const db = getLocalDB();
        return db.creds.find(c => c.id === id) || null;
    }
}


module.exports = {
    computeDocumentHash,
    uploadToS3,
    saveMetadataToDynamoDB,
    checkDuplicate,
    saveCredentialToDynamoDB,
    getCredentialFromDynamoDB,
    getLocalDB
};

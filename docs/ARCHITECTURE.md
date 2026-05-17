# AegisID — System Architecture v3.0

> Zero-Knowledge Identity Platform & Document Vault

## Architecture Overview

```
┌───────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                          │
│                                                                  │
│  ┌──────────┐    ┌────────────┐    ┌──────────────────────────┐  │
│  │  React   │───▶│ Web Worker │───▶│  snarkjs.plonk.fullProve │  │
│  │Dashboard │    │  (prover)  │    │  WASM + zkey from public │  │
│  └────┬─────┘    └────────────┘    └──────────────────────────┘  │
│       │                                                          │
│  ┌────▼─────┐    ┌────────────┐    ┌──────────────────────────┐  │
│  │  Vault   │───▶│ Encrypted  │───▶│    API Layer (Express)    │  │
│  │ Portal   │    │ Upload     │    │    (v3 routes)           │  │
│  └──────────┘    └────────────┘    └──────────────┬───────────┘  │
└───────────────────────────────────────────────────┼───────────────┘
                                                    │
                                                    ▼
┌───────────────────────────────────────────────────────────────────┐
│                       STORAGE LAYER                               │
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐     │
│  │ AES-256-GCM  │───▶│   Metadata   │───▶│  Share Manager   │     │
│  │  Blob Store  │    │  (JSON DB)   │    │ (Token lookup)   │     │
│  └──────────────┘    └──────────────┘    └──────────────────┘     │
└───────────────────────────────────────────────────────────────────┘
```

## Data Flow (Vault & Credentials)

1. **Upload**: User selects a document. Frontend sends raw file + attributes to `/v3/documents/upload`.
2. **Encryption**: Server computes SHA-256 hash, encrypts the file with AES-256-GCM, and stores the blob.
3. **Issuance**: `/v3/credentials/issue` takes a document ID, verifies attributes, and generates a ZK proof (PLONK) binding the attributes to the document hash.
4. **Sharing**: User generates a share token via `/v3/credentials/:id/share`.
5. **Verification**: Organization hits `/v3/verify/:token`. Server validates the token, retrieves the bound credential, and returns the ZK verification result (Never the raw doc).

## Security Layers

| Layer | Protection |
|-------|-----------|
| **At Rest** | Documents are encrypted with AES-256-GCM using a server-side master key. |
| **In Transit** | SHA-256 hashing happens immediately on upload to ensure document integrity. |
| **ZK Binding** | The document hash is a public input to the ZK circuit, preventing attribute-document decoupling. |
| **Share Layer** | Tokens are cryptographically random (base64url) and revocable. |
| **Privacy** | Public verification links reveal only "Verified/Unverified" and "Eligible/Ineligible" flags. |

## Circuit Architecture

### age_check.circom (Document-Bound)
- **Private**: `birthYear`, `secret`
- **Public**: `currentYear`, `ageLimit`, `externalNullifier`, `documentHash` (new in v3)
- **Outputs**: `isEligible` (0/1), `nullifierHash`

### range_check.circom
- **Private**: `birthYear`, `secret`
- **Public**: `currentYear`, `minAge`, `maxAge`, `externalNullifier`, `documentHash`
- **Outputs**: `inRange` (0/1), `nullifierHash`
�─────────────┐
│  DynamoDB: Audit Logs  │  │  DynamoDB: Nullifiers  │
│  PK: VERIFY#<id>       │  │  PK: nullifierHash     │
│  GSI: NULLIFIER#<hash> │  │  TTL: 1 year           │
│  TTL: 90 days          │  │  Conditional writes     │
└────────────────────────┘  └────────────────────────┘
```

## Data Flow

1. **User** enters birth year in browser (private — never transmitted)
2. **Web Worker** loads WASM circuit + proving key from CDN
3. **snarkjs** generates PLONK proof + public signals (including nullifier hash)
4. **Frontend** sends `{proof, publicSignals, proofType}` to API
5. **API Gateway** rate-limits and routes to Lambda
6. **Lambda** validates request structure → cryptographic verification → nullifier check
7. **DynamoDB** stores audit log (no PII) and records used nullifier
8. **Response** returns standardized JSON with verification result

## Security Layers

| Layer | Protection |
|-------|-----------|
| Circuit | `currentYear` is public (server-enforced), nullifier prevents replay |
| Transport | HTTPS only, CORS restricted |
| API | Rate limiting, JWT auth (v2), request validation |
| Storage | No PII stored, TTL auto-cleanup, hashed IPs |
| Proof | Mathematical soundness from PLONK, 128-bit security on BN128 |

## Circuit Architecture

### age_check.circom (v2)
- **Private**: `birthYear`, `secret`
- **Public**: `currentYear`, `ageLimit`, `externalNullifier`
- **Outputs**: `isEligible` (0/1), `nullifierHash`
- **Constraints**: ~290

### range_check.circom
- **Private**: `birthYear`, `secret`
- **Public**: `currentYear`, `minAge`, `maxAge`, `externalNullifier`
- **Outputs**: `inRange` (0/1), `nullifierHash`
- **Constraints**: ~310

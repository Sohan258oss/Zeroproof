# AegisID — API Documentation v3.0

**Base URL**: `http://localhost:3000`

## Versions
- **v1**: ZK Proof Demo (Public)
- **v2**: JWT Protected strict verification
- **v3**: Document Vault & Credential Issuance (New)

---

## v3 Endpoints (Document Vault)

### `POST /v3/documents/upload`
Upload an identity document and extract attributes. The document is encrypted with AES-256-GCM before storage.

**Form Data**:
- `document`: File blob (PDF, JPEG, PNG, WebP)
- `fullName`: string
- `dateOfBirth`: string (ISO date)
- `documentType`: string (id_card, passport, etc.)

**Response**:
```json
{
  "status": "success",
  "data": {
    "document": {
      "id": "uuid",
      "originalName": "id.jpg",
      "documentHash": "sha256-hash",
      "createdAt": "2026-05-13T12:00:00Z"
    }
  }
}
```

---

### `POST /v3/credentials/issue`
Issue a ZK credential bound to an uploaded document.

**Request Body**:
```json
{
  "documentId": "uuid",
  "credentialType": "age_verification"
}
```

**Response**:
```json
{
  "status": "success",
  "data": {
    "credential": {
      "id": "uuid",
      "isEligible": true,
      "zkProof": { "verified": true, "circuit": "age_check_v2" },
      "issuedAt": "..."
    }
  }
}
```

---

### `POST /v3/credentials/:id/share`
Generate a shareable verification link.

**Request Body**:
```json
{
  "organizationName": "Bar Tavern",
  "expiresInHours": 72
}
```

**Response**:
```json
{
  "status": "success",
  "data": {
    "shareLink": {
      "token": "base64url-token",
      "verifyUrl": "/verify/base64url-token",
      "expiresAt": "..."
    }
  }
}
```

---

### `GET /v3/verify/:token`
Public verification endpoint for organizations. **No authentication required.**
Returns only ZK-safe information.

**Response**:
```json
{
  "status": "success",
  "data": {
    "verification": {
      "status": "verified",
      "credentialType": "age_verification",
      "isEligible": true,
      "zkProof": { "verified": true, "proofSystem": "PLONK" },
      "documentBinding": { "documentHashPrefix": "abc123de..." },
      "sharedWith": "Bar Tavern"
    }
  }
}
```

---

## v1 & v2 Endpoints
(Retained for backward compatibility. See legacy docs for details.)
- `POST /v1/verify`: Proof demo
- `POST /v2/verify`: Strict verification 🔒
- `GET /v2/audit/:nullifier`: Nullifier check 🔒

---

## Error Response Format

All errors follow this structure:
```json
{
  "status": "error",
  "error": { "code": "ERROR_CODE", "message": "Human-readable message" }
}
```


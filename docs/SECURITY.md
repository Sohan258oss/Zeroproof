# AegisID — Security Model

## Threat Model

### Assets Protected
- User's birth year (private input)
- User's identity secret (private input)
- System integrity (proof soundness)

### Threat Actors
1. **Malicious User** — tries to forge proofs, replay proofs, or lie about age
2. **Network Attacker** — intercepts API traffic
3. **Compromised Server** — attempts to extract private data from proofs
4. **Spam/DoS** — floods API with verification requests

## Mitigations

### 1. Replay Protection (Nullifier System)

**Threat**: User generates one valid proof and submits it multiple times.

**Mitigation**: Each proof includes a `nullifierHash = Poseidon(secret, externalNullifier)`.
- The server stores used nullifiers in DynamoDB with conditional writes
- If a nullifier is seen again → `409 NULLIFIER_REPLAYED`
- Different contexts (different `externalNullifier`) produce different nullifiers
- Cross-context linking is computationally infeasible (Poseidon preimage resistance)

### 2. Input Tampering (Server-Enforced Public Inputs)

**Threat**: User sets `currentYear = 3000` to pass age check fraudulently.

**Mitigation**: `currentYear` is a **public input** — the server validates it matches the actual year (±1 tolerance). The proof is only valid for the claimed public inputs.

### 3. Proof Expiration (v2)

**Threat**: User generates a proof today and uses it months later.

**Mitigation**: v2 API accepts `proofTimestamp` and rejects proofs older than 5 minutes. Combined with `currentYear` being public, proofs are time-bound.

### 4. API Security

| Control | Implementation |
|---------|---------------|
| Rate Limiting | 100 req/min per IP (in-memory, upgradeable to Redis) |
| Authentication | JWT with HMAC-SHA256, scope-based access (v2) |
| CORS | Configurable origin restriction |
| Input Validation | Proof structure validation, signal count/type checking |
| Error Handling | Structured errors, no stack trace leakage |

### 5. Data Privacy

**Zero PII Policy**: The system never stores, logs, or transmits:
- Birth year
- User's identity secret
- Any personally identifiable information

**What IS stored** (audit logs):
- Request ID (random UUID)
- Proof type
- Verification result (boolean)
- Nullifier hash (one-way, unlinkable)
- Hashed IP (truncated SHA-256)
- Timestamp

## Trust Assumptions

1. **Trusted Setup**: PLONK uses a universal trusted setup (Powers of Tau). Security requires at least 1 honest participant in the ceremony.

2. **Circuit Correctness**: The Circom circuit correctly implements the intended logic. This should be verified through formal review and testing.

3. **Cryptographic Hardness**: BN128 elliptic curve provides ~128-bit security. The discrete log problem on this curve is assumed to be computationally hard.

4. **Browser Integrity**: The user's browser is not compromised. WASM execution environment is trusted.

5. **Oracle Problem**: The system proves that the user *knows* a birth year satisfying the condition — it does NOT prove that this is their *actual* birth year. Binding identity to real-world attributes requires an external oracle (e.g., government ID check during initial enrollment).

## What ZK Proofs Do NOT Protect Against

- A user sharing their secret with another person
- A user lying about their birth year during initial enrollment
- A compromised browser injecting false inputs into the circuit
- Side-channel attacks on the proving process (timing, power analysis)

## Recommendations for Production

1. Use a well-known Powers of Tau ceremony (e.g., Hermez, Zcash)
2. Audit Circom circuits with a third-party security firm
3. Deploy with WAF (Web Application Firewall) in front of API Gateway
4. Enable AWS CloudTrail for infrastructure audit trail
5. Implement key rotation for JWT secrets
6. Consider HSM-backed signing for critical operations

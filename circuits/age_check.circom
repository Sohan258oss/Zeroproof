pragma circom 2.1.0;

include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/poseidon.circom";
include "./lib/nullifier.circom";

/// @title AgeCheckV2
/// @notice Enhanced age verification with nullifier-based replay protection and
///         server-enforced currentYear. Proves (currentYear - birthYear) >= ageLimit
///         without revealing birthYear, while generating a deterministic nullifier
///         to prevent the same identity from re-proving in the same context.
///
/// @dev    Changes from V1:
///         - currentYear is now PUBLIC (server validates it matches real time)
///         - Added Poseidon-based nullifier system
///         - Added identity secret as private input
///         - Public signals: [isEligible, nullifierHash, ageLimit, currentYear, externalNullifier]
///
/// Constraint count: ~290 (GreaterEqThan: ~18, Poseidon(2): ~270, wiring: ~2)
template AgeCheckV2() {
    // --- Private Inputs ---
    signal input birthYear;            // User's year of birth (NEVER leaves the browser)
    signal input secret;               // User's long-lived identity secret (random 254-bit field element)

    // --- Public Inputs ---
    signal input currentYear;          // Current calendar year — server enforces this matches reality
    signal input ageLimit;             // Minimum required age (e.g., 18, 21, 25)
    signal input externalNullifier;    // Context identifier (e.g., hash of service name + date)

    // --- Public Outputs ---
    signal output isEligible;          // 1 if user meets age requirement, 0 otherwise
    signal output nullifierHash;       // Deterministic hash preventing replay within same context

    // ═══════════════════════════════════════════
    // 1. AGE COMPUTATION & COMPARISON
    // ═══════════════════════════════════════════

    // Compute age as difference (operates in finite field, safe for realistic year values)
    signal age <== currentYear - birthYear;

    // Check: age >= ageLimit using 16-bit comparator (supports years up to 65535)
    component gte = GreaterEqThan(16);
    gte.in[0] <== age;
    gte.in[1] <== ageLimit;

    isEligible <== gte.out;

    // ═══════════════════════════════════════════
    // 2. NULLIFIER GENERATION (Replay Protection)
    // ═══════════════════════════════════════════
    //
    // nullifierHash = Poseidon(secret, externalNullifier)
    //
    // Properties:
    //   - Deterministic: same (secret, context) → same nullifier
    //   - Unlinkable: different contexts → different nullifiers (no cross-service tracking)
    //   - One-way: nullifier cannot be reversed to recover secret
    //
    // The verifier stores used nullifiers. If a nullifier is seen again,
    // the proof is rejected (prevents one user proving multiple times).

    component nullifier = Nullifier();
    nullifier.secret <== secret;
    nullifier.externalNullifier <== externalNullifier;
    nullifierHash <== nullifier.nullifierHash;
}

// Public inputs: currentYear, ageLimit, externalNullifier
// Public outputs: isEligible, nullifierHash
component main {public [currentYear, ageLimit, externalNullifier]} = AgeCheckV2();

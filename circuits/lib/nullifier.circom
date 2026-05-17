pragma circom 2.1.0;

include "../../node_modules/circomlib/circuits/poseidon.circom";

/// @title Nullifier
/// @notice Computes a deterministic nullifier hash from a user secret and an external context.
///         Used to prevent replay attacks: the same (secret, context) pair always produces
///         the same nullifier, allowing the verifier to reject duplicate proofs.
/// @dev    Uses Poseidon hash (efficient in-circuit) with 2 inputs.
template Nullifier() {
    signal input secret;              // Private: user's long-lived identity secret
    signal input externalNullifier;   // Public: context ID (e.g., service ID, session ID)

    signal output nullifierHash;      // Public output: deterministic, unlinkable identifier

    component hasher = Poseidon(2);
    hasher.inputs[0] <== secret;
    hasher.inputs[1] <== externalNullifier;

    nullifierHash <== hasher.out;
}

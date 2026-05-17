pragma circom 2.1.0;

include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/poseidon.circom";
include "./lib/nullifier.circom";

/// @title AgeRangeCheck
/// @notice Proves that a user's age falls within [minAge, maxAge] without revealing birthYear.
///         Includes nullifier for replay protection.
/// @dev    Public inputs: currentYear, minAge, maxAge, externalNullifier
///         Public outputs: inRange (0 or 1), nullifierHash
template AgeRangeCheck() {
    // --- Inputs ---
    signal input birthYear;            // Private: user's year of birth
    signal input currentYear;          // Public: current calendar year (server-enforced)
    signal input minAge;               // Public: minimum age (inclusive)
    signal input maxAge;               // Public: maximum age (inclusive)
    signal input secret;               // Private: user identity secret
    signal input externalNullifier;    // Public: context/service identifier

    // --- Outputs ---
    signal output inRange;             // 1 if minAge <= age <= maxAge, else 0
    signal output nullifierHash;       // Deterministic replay-prevention hash

    // --- Age Computation ---
    signal age <== currentYear - birthYear;

    // --- Range Check: age >= minAge ---
    component gte = GreaterEqThan(16);
    gte.in[0] <== age;
    gte.in[1] <== minAge;

    // --- Range Check: age <= maxAge ---
    component lte = LessEqThan(16);
    lte.in[0] <== age;
    lte.in[1] <== maxAge;

    // Both conditions must hold: multiply outputs (AND gate)
    inRange <== gte.out * lte.out;

    // --- Nullifier ---
    component nullifier = Nullifier();
    nullifier.secret <== secret;
    nullifier.externalNullifier <== externalNullifier;
    nullifierHash <== nullifier.nullifierHash;
}

component main {public [currentYear, minAge, maxAge, externalNullifier]} = AgeRangeCheck();

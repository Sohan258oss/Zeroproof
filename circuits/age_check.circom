pragma circom 2.1.0;

include "../node_modules/circomlib/circuits/comparators.circom";

// Age Check Circuit
// Proves that currentYear - birthYear >= ageLimit
template AgeCheck() {
    signal input birthYear;
    signal input currentYear;
    signal input ageLimit;
    signal output isEligible;

    // Component to check if (currentYear - birthYear) >= ageLimit
    component gte = GreaterEqThan(16); // 16-bit number, accommodates years up to 65535
    
    // We calculate age
    signal age <== currentYear - birthYear;
    
    gte.in[0] <== age;
    gte.in[1] <== ageLimit;

    isEligible <== gte.out;
    
    // Constraint count explanation:
    // GreaterEqThan(16) uses:
    // - LessEqThan(16) which uses Num2Bits(17).
    // Num2Bits(17) introduces 17 constraints (one for each bit and one for the sum).
    // Plus a few constraints for signal wiring in LessEqThan and GreaterEqThan.
    // So the total constraints are roughly ~18.
}

component main {public [ageLimit]} = AgeCheck();

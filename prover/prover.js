const snarkjs = require("snarkjs");
const path = require("path");

/**
 * Generate a Plonk proof for the Age Check circuit
 * 
 * @param {number} birthYear - Private input: Year of birth
 * @param {number} currentYear - Private input: Current year
 * @param {number} ageLimit - Public input: Minimum required age
 * @returns {Promise<Object>} JSON payload ready for transmission
 */
async function generateProofPayload(birthYear, currentYear, ageLimit) {
    const inputs = {
        birthYear: birthYear,
        currentYear: currentYear,
        ageLimit: ageLimit
    };

    // The wasm file is typically generated in a folder named after the circuit + "_js"
    const wasmPath = path.join(__dirname, "../keys/age_check_js/age_check.wasm");
    const zkeyPath = path.join(__dirname, "../keys/circuit_final.zkey");

    try {
        // Generate the witness and proof
        const { proof, publicSignals } = await snarkjs.plonk.fullProve(inputs, wasmPath, zkeyPath);

        // Format payload
        const payload = {
            proof: proof,
            publicSignals: publicSignals
        };

        return payload;
    } catch (error) {
        console.error("Error generating proof:", error);
        throw error;
    }
}

// Allow CLI execution for testing
if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.length !== 3) {
        console.log("Usage: node prover.js <birthYear> <currentYear> <ageLimit>");
        process.exit(1);
    }
    
    generateProofPayload(Number(args[0]), Number(args[1]), Number(args[2]))
        .then(payload => {
            console.log(JSON.stringify(payload, null, 2));
        })
        .catch(err => {
            process.exit(1);
        });
}

module.exports = {
    generateProofPayload
};

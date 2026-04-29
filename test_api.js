const { generateProofPayload } = require("./prover/prover.js");

async function runTest() {
    console.log("Generating valid proof (Age: 25, Limit: 18)...");
    try {
        const payload = await generateProofPayload(1999, 2024, 18);
        console.log("Proof successfully generated!");
        console.log("Public Signals:", payload.publicSignals);

        console.log("\nSending proof to local API verification endpoint...");
        const response = await fetch("http://localhost:3000/v1/verify-age", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        console.log("API Response:", data);
    } catch (e) {
        console.error("Test failed:", e);
    }
}

runTest();

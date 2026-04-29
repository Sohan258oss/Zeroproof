const { verifyProof } = require("../verifier/verify");

/**
 * AWS Lambda Handler for ZeroProof Age Verification
 * 
 * IMPORTANT DEPLOYMENT NOTE:
 * When packaging this for AWS Lambda, ensure that the `keys/verification_key.json`
 * is bundled alongside your function code. The verifier module relies on it
 * strictly existing relative to the `verifier` directory.
 * 
 * You can optimize cold starts by allocating at least 512MB RAM for snarkjs operations.
 */
exports.handler = async (event, context) => {
    try {
        // Parse the body if it comes via API Gateway HTTP event
        const body = (typeof event.body === "string") ? JSON.parse(event.body) : event.body;

        if (!body || !body.proof || !body.publicSignals) {
            return {
                statusCode: 400,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ error: "Missing proof or publicSignals in payload." })
            };
        }

        const isValid = await verifyProof(body.proof, body.publicSignals);

        if (!isValid) {
            return {
                statusCode: 400,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({
                    success: false,
                    message: "Invalid cryptographic proof.",
                    isEligible: false
                })
            };
        }

        const isEligibleSignal = body.publicSignals[0] === "1";

        if (isEligibleSignal) {
            return {
                statusCode: 200,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({
                    success: true,
                    message: "Proof verified successfully. User is eligible.",
                    isEligible: true
                })
            };
        } else {
            return {
                statusCode: 200,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({
                    success: false,
                    message: "Proof is valid, but user is NOT eligible.",
                    isEligible: false
                })
            };
        }
    } catch (error) {
        console.error("Lambda Execution Error:", error);
        return {
            statusCode: 500,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ error: "Internal server error during verification." })
        };
    }
};

const express = require("express");
const cors = require("cors");
const { verifyProof } = require("../verifier/verify");

const app = express();
app.use(cors());
app.use(express.json());

// Endpoint: POST /v1/verify-age
app.post("/v1/verify-age", async (req, res) => {
    try {
        const { proof, publicSignals } = req.body;

        if (!proof || !publicSignals) {
            return res.status(400).json({
                error: "Missing proof or publicSignals in payload."
            });
        }

        const isValid = await verifyProof(proof, publicSignals);

        if (!isValid) {
            return res.status(400).json({
                success: false,
                message: "Invalid cryptographic proof.",
                isEligible: false
            });
        }

        const isEligibleSignal = publicSignals[0] === "1";

        if (isEligibleSignal) {
            return res.status(200).json({
                success: true,
                message: "Proof verified successfully. User is eligible.",
                isEligible: true
            });
        } else {
            // The proof is cryptographically valid, but the circuit outputted 0 (Not Eligible)
            return res.status(200).json({
                success: false,
                message: "Proof is valid, but user is NOT eligible.",
                isEligible: false
            });
        }
    } catch (error) {
        console.error("API Error:", error);
        return res.status(500).json({
            error: "Internal server error during verification."
        });
    }
});

const PORT = process.env.PORT || 3000;
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`ZeroProof Verification API listening on port ${PORT}`);
    });
}

module.exports = app;

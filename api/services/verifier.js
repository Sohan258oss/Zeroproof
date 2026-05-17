/**
 * AegisID — Core Verification Service
 * 
 * Handles cryptographic proof verification for multiple circuit types.
 * Each proof type has its own verification key and signal mapping.
 * 
 * Supports: age_check (v2 with nullifier), range_check
 */

const snarkjs = require("snarkjs");
const fs = require("fs");
const path = require("path");

// Verification key cache (loaded once, reused)
const vkeyCache = new Map();

/**
 * Supported proof types and their configurations
 */
const PROOF_CONFIGS = {
    age_check: {
        vkeyFile: "age_check_vkey.json",
        // Public signals order: [isEligible, nullifierHash, currentYear, ageLimit, externalNullifier]
        signalMap: {
            isEligible: 0,
            nullifierHash: 1,
            currentYear: 2,
            ageLimit: 3,
            externalNullifier: 4
        },
        validatePublicSignals(signals) {
            if (signals.length < 5) {
                throw new Error(`age_check expects 5 public signals, got ${signals.length}`);
            }
            const currentYear = Number(signals[2]);
            const now = new Date().getFullYear();
            if (Math.abs(currentYear - now) > 1) {
                throw new Error(`currentYear signal (${currentYear}) does not match real year (${now})`);
            }
        }
    },
    range_check: {
        vkeyFile: "range_check_vkey.json",
        // Public signals order: [inRange, nullifierHash, currentYear, minAge, maxAge, externalNullifier]
        signalMap: {
            inRange: 0,
            nullifierHash: 1,
            currentYear: 2,
            minAge: 3,
            maxAge: 4,
            externalNullifier: 5
        },
        validatePublicSignals(signals) {
            if (signals.length < 6) {
                throw new Error(`range_check expects 6 public signals, got ${signals.length}`);
            }
            const currentYear = Number(signals[2]);
            const now = new Date().getFullYear();
            if (Math.abs(currentYear - now) > 1) {
                throw new Error(`currentYear signal (${currentYear}) does not match real year (${now})`);
            }
        }
    }
};

/**
 * Load a verification key (cached).
 */
function loadVerificationKey(proofType) {
    if (vkeyCache.has(proofType)) {
        return vkeyCache.get(proofType);
    }

    const config = PROOF_CONFIGS[proofType];
    if (!config) {
        throw new Error(`Unknown proof type: ${proofType}`);
    }

    // Try multiple paths (local dev vs Lambda deployment)
    const possiblePaths = [
        path.join(__dirname, "../../keys", config.vkeyFile),
        path.join(__dirname, "../keys", config.vkeyFile),
        path.join(process.cwd(), "keys", config.vkeyFile)
    ];

    for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
            const vkey = JSON.parse(fs.readFileSync(p, "utf-8"));
            vkeyCache.set(proofType, vkey);
            return vkey;
        }
    }

    throw new Error(`Verification key not found for ${proofType}. Tried: ${possiblePaths.join(", ")}`);
}

/**
 * Verify a PLONK proof.
 * 
 * @param {string} proofType - Circuit type ("age_check" or "range_check")
 * @param {Object} proof - PLONK proof object
 * @param {string[]} publicSignals - Public signals array
 * @returns {Object} Verification result with parsed signals
 */
async function verifyProof(proofType, proof, publicSignals) {
    const config = PROOF_CONFIGS[proofType];
    if (!config) {
        throw new Error(`Unsupported proof type: ${proofType}`);
    }

    // Validate public signals match expected format
    config.validatePublicSignals(publicSignals);

    // Load verification key
    const vkey = loadVerificationKey(proofType);

    // Cryptographic verification
    const isValid = await snarkjs.plonk.verify(vkey, publicSignals, proof);

    if (!isValid) {
        return {
            verified: false,
            proofType,
            signals: null
        };
    }

    // Parse public signals into named fields
    const signals = {};
    for (const [name, index] of Object.entries(config.signalMap)) {
        signals[name] = publicSignals[index];
    }

    return {
        verified: true,
        proofType,
        signals
    };
}

module.exports = { verifyProof, PROOF_CONFIGS };

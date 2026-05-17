/**
 * AegisID — Web Worker for ZK Proof Generation
 * 
 * Runs snarkjs.plonk.fullProve() off the main thread so the UI never freezes.
 * Communicates with the main thread via postMessage.
 * 
 * Messages IN:
 *   { type: "generate", payload: { birthYear, currentYear, ageLimit, secret, externalNullifier, proofType } }
 * 
 * Messages OUT:
 *   { type: "status",  stage: "loading_wasm" | "computing_witness" | "generating_proof" | "complete" }
 *   { type: "progress", percent: 0-100 }
 *   { type: "result",  payload: { proof, publicSignals, duration } }
 *   { type: "error",   message: string }
 */

/* eslint-disable no-restricted-globals */
import * as snarkjs from "snarkjs";

const CIRCUIT_FILES = {
    age_check: {
        wasm: "/age_check.wasm",
        zkey: "/age_check_final.zkey"
    },
    range_check: {
        wasm: "/range_check.wasm",
        zkey: "/range_check_final.zkey"
    }
};

self.onmessage = async (e) => {
    if (e.data.type !== "generate") return;

    const { birthYear, currentYear, ageLimit, minAge, maxAge, secret, externalNullifier, proofType = "age_check" } = e.data.payload;

    try {
        const files = CIRCUIT_FILES[proofType];
        if (!files) {
            throw new Error(`Unknown proof type: ${proofType}`);
        }

        // Stage 1: Loading WASM
        self.postMessage({ type: "status", stage: "loading_wasm" });
        self.postMessage({ type: "progress", percent: 10 });

        // Stage 2: Building inputs
        self.postMessage({ type: "status", stage: "computing_witness" });
        self.postMessage({ type: "progress", percent: 30 });

        let inputs;
        if (proofType === "age_check") {
            inputs = {
                birthYear: Number(birthYear),
                currentYear: Number(currentYear),
                ageLimit: Number(ageLimit),
                secret: secret || "12345678901234567890",
                externalNullifier: externalNullifier || "1001"
            };
        } else if (proofType === "range_check") {
            inputs = {
                birthYear: Number(birthYear),
                currentYear: Number(currentYear),
                minAge: Number(minAge || ageLimit),
                maxAge: Number(maxAge || 120),
                secret: secret || "12345678901234567890",
                externalNullifier: externalNullifier || "1001"
            };
        }

        // Stage 3: Generating proof
        self.postMessage({ type: "status", stage: "generating_proof" });
        self.postMessage({ type: "progress", percent: 50 });

        const startTime = performance.now();

        const { proof, publicSignals } = await snarkjs.plonk.fullProve(
            inputs,
            files.wasm,
            files.zkey
        );

        const duration = (performance.now() - startTime).toFixed(2);

        self.postMessage({ type: "progress", percent: 90 });

        // Stage 4: Complete
        self.postMessage({ type: "status", stage: "complete" });
        self.postMessage({ type: "progress", percent: 100 });

        self.postMessage({
            type: "result",
            payload: { proof, publicSignals, duration: Number(duration) }
        });

    } catch (err) {
        self.postMessage({
            type: "error",
            message: err.message || "Unknown error during proof generation"
        });
    }
};

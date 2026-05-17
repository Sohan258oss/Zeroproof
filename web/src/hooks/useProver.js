/**
 * AegisID — useProver Hook
 * 
 * React hook that manages the proof generation lifecycle:
 *   - Spawns/reuses a Web Worker
 *   - Tracks generation stages (loading → witness → proving → complete)
 *   - Reports progress percentage
 *   - Handles errors
 *   - Sends proof to verification API
 */

import { useState, useRef, useCallback } from "react";

const STAGES = {
    idle: { label: "Ready", icon: "○", index: 0 },
    loading_wasm: { label: "Loading Circuit (WASM)", icon: "⏳", index: 1 },
    computing_witness: { label: "Computing Witness", icon: "⏳", index: 2 },
    generating_proof: { label: "Generating ZK Proof", icon: "⏳", index: 3 },
    sending: { label: "Sending to Verifier", icon: "⏳", index: 4 },
    complete: { label: "Complete", icon: "✓", index: 5 },
    error: { label: "Error", icon: "✗", index: -1 }
};

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export function useProver() {
    const [stage, setStage] = useState("idle");
    const [progress, setProgress] = useState(0);
    const [proofTime, setProofTime] = useState(null);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [rawProof, setRawProof] = useState(null);
    const [isProving, setIsProving] = useState(false);
    const workerRef = useRef(null);

    const getWorker = useCallback(() => {
        if (!workerRef.current) {
            workerRef.current = new Worker(
                new URL("../workers/prover.worker.js", import.meta.url),
                { type: "module" }
            );
        }
        return workerRef.current;
    }, []);

    const generateAndVerify = useCallback(async ({
        birthYear,
        currentYear,
        ageLimit,
        minAge,
        maxAge,
        secret,
        externalNullifier,
        proofType = "age_check"
    }) => {
        setIsProving(true);
        setStage("loading_wasm");
        setProgress(0);
        setResult(null);
        setError(null);
        setRawProof(null);
        setProofTime(null);

        return new Promise((resolve, reject) => {
            const worker = getWorker();

            worker.onmessage = async (e) => {
                const msg = e.data;

                if (msg.type === "status") {
                    setStage(msg.stage);
                } else if (msg.type === "progress") {
                    setProgress(msg.percent);
                } else if (msg.type === "result") {
                    setRawProof(msg.payload.proof);
                    setProofTime(msg.payload.duration);
                    setStage("sending");
                    setProgress(92);

                    // Send to API
                    try {
                        const res = await fetch(`${API_URL}/v1/verify`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                proof: msg.payload.proof,
                                publicSignals: msg.payload.publicSignals,
                                proofType
                            })
                        });

                        const data = await res.json();
                        setResult(data);
                        setStage("complete");
                        setProgress(100);
                        setIsProving(false);
                        resolve(data);
                    } catch (apiErr) {
                        setError(`API Error: ${apiErr.message}`);
                        setStage("error");
                        setIsProving(false);
                        reject(apiErr);
                    }
                } else if (msg.type === "error") {
                    setError(msg.message);
                    setStage("error");
                    setIsProving(false);
                    reject(new Error(msg.message));
                }
            };

            worker.onerror = (err) => {
                setError(err.message);
                setStage("error");
                setIsProving(false);
                reject(err);
            };

            worker.postMessage({
                type: "generate",
                payload: { birthYear, currentYear, ageLimit, minAge, maxAge, secret, externalNullifier, proofType }
            });
        });
    }, [getWorker]);

    const reset = useCallback(() => {
        setStage("idle");
        setProgress(0);
        setProofTime(null);
        setResult(null);
        setError(null);
        setRawProof(null);
        setIsProving(false);
    }, []);

    return {
        stage,
        stageInfo: STAGES[stage] || STAGES.idle,
        progress,
        proofTime,
        result,
        error,
        rawProof,
        isProving,
        generateAndVerify,
        reset,
        STAGES
    };
}

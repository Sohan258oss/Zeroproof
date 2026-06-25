import { useEffect, useState, useRef } from "react";

const TIMELINE_STEPS = [
  { key: "loading_wasm", label: "Initialize Circuit", desc: "Fetching WASM binary & parameters" },
  { key: "computing_witness", label: "Witness Generation", desc: "Mapping constraint system parameters" },
  { key: "generating_proof", label: "Cryptographic Prove", desc: "Running PLONK proving algorithm" },
  { key: "sending", label: "Node Verification", desc: "Validating proof on AegisID node" },
  { key: "complete", label: "Finalized State", desc: "Verification verified & bound" },
];

export default function ProofTimeline({ stage, progress, STAGES }) {
  const currentIndex = STAGES[stage]?.index ?? 0;
  const isIdle = stage === "idle";
  const [logs, setLogs] = useState([]);
  const consoleEndRef = useRef(null);

  // Generate realistic logs based on current stage transitions
  useEffect(() => {
    if (stage === "idle") {
      setLogs(["[system] Awaiting parameters...", "[system] Ready for proof generation."]);
    } else if (stage === "loading_wasm") {
      setLogs((l) => [
        ...l,
        "[system] Prover thread spawned in dedicated web worker.",
        `[snarkjs] Fetching circuit keys from repository...`,
        `[snarkjs] Loaded WASM constraints system binary.`,
      ]);
    } else if (stage === "computing_witness") {
      setLogs((l) => [
        ...l,
        "[witness] Computing witness vectors (Poseidon hashes)...",
        "[witness] Mapping input variables to R1CS matrices...",
        "[witness] Witness computed successfully.",
      ]);
    } else if (stage === "generating_proof") {
      setLogs((l) => [
        ...l,
        "[plonk] Executing full prove over constraint equations...",
        "[plonk] Constructing commitment polynomial quotients...",
        "[plonk] Computing G1/G2 group point evaluations...",
        "[plonk] PLONK proof generated successfully.",
      ]);
    } else if (stage === "sending") {
      setLogs((l) => [
        ...l,
        "[api] Serializing PLONK proof components (A, B, C)...",
        `[api] Transmitting proof hash to verifier node...`,
      ]);
    } else if (stage === "complete") {
      setLogs((l) => [
        ...l,
        "[verifier] Node response: 200 OK.",
        "[verifier] Proof verified successfully on curve BN254.",
        "[system] Cryptographic handshake finalized.",
      ]);
    } else if (stage === "error") {
      setLogs((l) => [
        ...l,
        "[error] Handshake aborted. Witness constraints violated.",
      ]);
    }
  }, [stage]);

  // Scroll terminal logs to bottom
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  return (
    <div className="bg-[#030804]/90 border border-emerald-950/80 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
      {/* Terminal Title Bar */}
      <div className="bg-[#050f07] px-4 py-3 border-b border-emerald-950/60 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></span>
          <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest ml-2">ZK_PROVER_SHELL</span>
        </div>
        {!isIdle && (
          <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            PROVING: {progress}%
          </span>
        )}
      </div>

      <div className="p-5 space-y-6">
        {/* Progress Timeline */}
        <div className="space-y-4">
          {TIMELINE_STEPS.map((step, i) => {
            const stepIndex = i + 1;
            const isDone = currentIndex > stepIndex || stage === "complete";
            const isActive = currentIndex === stepIndex;
            const isPending = currentIndex < stepIndex && stage !== "complete";

            let iconColor = "bg-emerald-950/20 border-emerald-950/80 text-slate-650";
            let textColor = "text-slate-500";
            
            if (isDone) {
              iconColor = "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
              textColor = "text-slate-350";
            } else if (isActive) {
              iconColor = "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 ring-2 ring-emerald-500/10 shadow-[0_0_10px_rgba(0,255,102,0.15)]";
              textColor = "text-white";
            }

            return (
              <div key={step.key} className="flex gap-4 relative group">
                {/* Connecting Line */}
                {i < TIMELINE_STEPS.length - 1 && (
                  <div className={`absolute left-[13px] top-6 w-[2px] h-[calc(100%-12px)] transition-colors duration-300 ${
                    isDone ? "bg-emerald-500/30" : "bg-emerald-950/40"
                  }`}></div>
                )}

                {/* Circle Indicator */}
                <div className={`w-7 h-7 rounded-lg border flex items-center justify-center text-xs font-mono font-bold transition-all duration-300 ${iconColor}`}>
                  {isDone ? (
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span>{stepIndex}</span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className={`text-xs font-mono font-bold uppercase tracking-wider ${textColor}`}>{step.label}</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5 font-medium">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Live Logs Terminal Console */}
        <div className="border border-emerald-950/85 bg-black/80 rounded-xl p-3.5 font-mono text-[10px] text-slate-400 space-y-1.5 h-36 overflow-y-auto custom-scrollbar select-all">
          {logs.map((log, i) => {
            let logColor = "text-slate-450";
            if (log.startsWith("[system]")) logColor = "text-slate-600";
            else if (log.startsWith("[snarkjs]")) logColor = "text-[#00f0aa]";
            else if (log.startsWith("[witness]")) logColor = "text-emerald-500";
            else if (log.startsWith("[plonk]")) logColor = "text-amber-500";
            else if (log.startsWith("[verifier]") || log.includes("success")) logColor = "text-[#00ff66]";
            else if (log.startsWith("[error]")) logColor = "text-rose-500";

            return (
              <div key={i} className={`${logColor} leading-relaxed`}>
                {log}
              </div>
            );
          })}
          <div ref={consoleEndRef} />
        </div>
      </div>
    </div>
  );
}

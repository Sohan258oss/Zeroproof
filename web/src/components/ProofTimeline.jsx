const TIMELINE_STEPS = [
  { key: "loading_wasm", label: "Loading Circuit", desc: "Fetching WASM binary" },
  { key: "computing_witness", label: "Computing Witness", desc: "Building constraint system" },
  { key: "generating_proof", label: "Generating Proof", desc: "PLONK proving algorithm" },
  { key: "sending", label: "Verifying on Server", desc: "Cryptographic verification" },
  { key: "complete", label: "Verification Result", desc: "Proof validated" },
];

function getStepState(stepIndex, currentStageIndex) {
  if (currentStageIndex < 0) return "error";
  if (stepIndex < currentStageIndex) return "done";
  if (stepIndex === currentStageIndex) return "active";
  return "pending";
}

export default function ProofTimeline({ stage, progress, STAGES }) {
  const currentIndex = STAGES[stage]?.index ?? 0;
  const isIdle = stage === "idle";

  return (
    <div className="glass-panel rounded-2xl p-6 relative overflow-hidden">
      <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10"></div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white tracking-tight">Proof Pipeline</h2>
          {!isIdle && (
            <span className="text-xs font-mono text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full">
              {progress}%
            </span>
          )}
        </div>

        {/* Progress bar */}
        {!isIdle && (
          <div className="w-full h-1 bg-slate-800 rounded-full mb-6 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        )}

        {/* Steps */}
        <div className="space-y-1">
          {TIMELINE_STEPS.map((step, i) => {
            const state = isIdle ? "pending" : getStepState(i + 1, currentIndex);

            return (
              <div key={step.key} className="flex items-start gap-3 py-2">
                {/* Step indicator */}
                <div className="flex flex-col items-center mt-0.5">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                      state === "done"
                        ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30"
                        : state === "active"
                        ? "bg-sky-500/20 text-sky-400 ring-2 ring-sky-500/50 animate-pulse"
                        : state === "error"
                        ? "bg-red-500/20 text-red-400 ring-1 ring-red-500/30"
                        : "bg-slate-800 text-slate-600 ring-1 ring-slate-700"
                    }`}
                  >
                    {state === "done" ? (
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : state === "active" ? (
                      <div className="w-2 h-2 rounded-full bg-sky-400"></div>
                    ) : state === "error" ? (
                      "!"
                    ) : (
                      <span className="text-[10px]">{i + 1}</span>
                    )}
                  </div>
                  {i < TIMELINE_STEPS.length - 1 && (
                    <div className={`w-px h-4 mt-1 transition-colors duration-300 ${
                      state === "done" ? "bg-emerald-500/30" : "bg-slate-800"
                    }`}></div>
                  )}
                </div>

                {/* Step content */}
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium transition-colors duration-300 ${
                    state === "done"
                      ? "text-emerald-400"
                      : state === "active"
                      ? "text-sky-400"
                      : state === "error"
                      ? "text-red-400"
                      : "text-slate-600"
                  }`}>
                    {step.label}
                  </div>
                  <div className="text-[11px] text-slate-600 mt-0.5">{step.desc}</div>
                </div>

                {/* Duration placeholder */}
                {state === "done" && (
                  <span className="text-[10px] text-slate-600 font-mono mt-0.5">✓</span>
                )}
              </div>
            );
          })}
        </div>

        {isIdle && (
          <div className="mt-4 text-center text-xs text-slate-600 italic">
            Enter your birth year and click generate to begin
          </div>
        )}
      </div>
    </div>
  );
}

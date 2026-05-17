export default function VerificationBadge({ result, error, proofTime, stage }) {
  if (stage === "idle") return null;

  // Error state
  if (error || stage === "error") {
    return (
      <div className="glass-panel rounded-2xl p-6 border-red-500/20 animate-fade-in">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
            <svg className="w-7 h-7 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path strokeLinecap="round" d="M15 9l-6 6M9 9l6 6" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-red-400">Error</h3>
            <p className="text-xs text-slate-500 mt-0.5">{error || "An unexpected error occurred"}</p>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (stage !== "complete" && stage !== "error") {
    return (
      <div className="glass-panel rounded-2xl p-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-sky-500/10 flex items-center justify-center flex-shrink-0">
            <svg className="animate-spin h-7 w-7 text-sky-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-sky-400">Processing...</h3>
            <p className="text-xs text-slate-500 mt-0.5">Zero-knowledge proof is being generated and verified</p>
          </div>
        </div>
      </div>
    );
  }

  // Result state
  const isEligible = result?.data?.isEligible ?? result?.isEligible ?? false;
  const verified = result?.data?.verified ?? result?.success ?? false;

  return (
    <div className={`glass-panel rounded-2xl p-6 animate-fade-in ${
      isEligible && verified
        ? "ring-1 ring-emerald-500/20"
        : "ring-1 ring-amber-500/20"
    }`}>
      <div className="flex items-center gap-4">
        {/* Badge icon */}
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${
          isEligible && verified
            ? "bg-emerald-500/10"
            : "bg-amber-500/10"
        }`}>
          {isEligible && verified ? (
            <svg className="w-7 h-7 text-emerald-400 animate-badge-pop" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
            </svg>
          ) : (
            <svg className="w-7 h-7 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"/>
            </svg>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className={`text-base font-semibold ${
            isEligible && verified ? "text-emerald-400" : "text-amber-400"
          }`}>
            {isEligible && verified ? "Verified — Eligible ✓" : verified ? "Verified — Not Eligible" : "Verification Failed"}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {isEligible && verified
              ? "Zero-knowledge proof is cryptographically valid. Identity condition met."
              : verified
              ? "Proof is valid but the identity condition was not satisfied."
              : "The cryptographic proof could not be verified."
            }
          </p>
        </div>
      </div>

      {/* Metadata chips */}
      {result && (
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/5">
          {proofTime && (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded-lg bg-slate-800/80 text-sky-400 border border-sky-500/10">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
              </svg>
              {proofTime}ms
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded-lg bg-slate-800/80 text-indigo-400 border border-indigo-500/10">
            PLONK
          </span>
          {(result?.data?.proofType || result?.proofType) && (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded-lg bg-slate-800/80 text-slate-400 border border-slate-700/50">
              {result.data?.proofType || result.proofType}
            </span>
          )}
          {(result?.data?.nullifierUsed || result?.data?.nullifierRegistered) && (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded-lg bg-slate-800/80 text-emerald-400 border border-emerald-500/10">
              🔒 Nullifier
            </span>
          )}
        </div>
      )}
    </div>
  );
}

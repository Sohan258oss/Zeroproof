export default function VerificationBadge({ result, error, proofTime, stage }) {
  if (stage === "idle") return null;

  // Error state
  if (error || stage === "error") {
    return (
      <div className="glass-panel rounded-2xl p-5 border-rose-500/20 bg-rose-500/5 shadow-[0_0_15px_rgba(255,0,60,0.05)] animate-fade-in">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center flex-shrink-0 text-rose-500">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path strokeLinecap="round" d="M15 9l-6 6M9 9l6 6" />
            </svg>
          </div>
          <div>
            <h3 className="text-xs font-mono font-bold text-rose-500 uppercase tracking-widest">TRANSACTION_ERROR</h3>
            <p className="text-[11px] text-slate-400 mt-1 font-mono">{error || "Witness generation constraints violated."}</p>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (stage !== "complete" && stage !== "error") {
    return (
      <div className="glass-panel rounded-2xl p-5 border-emerald-500/20 bg-emerald-950/10 shadow-[0_0_15px_rgba(0,255,102,0.05)] animate-fade-in">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 text-emerald-400">
            <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <div>
            <h3 className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest">PROVING_HANDSHAKE</h3>
            <p className="text-[11px] text-slate-400 mt-1 font-mono">Generating PLONK proof polynomials in sandboxed web worker...</p>
          </div>
        </div>
      </div>
    );
  }

  // Result state
  const isEligible = result?.data?.isEligible ?? result?.isEligible ?? false;
  const verified = result?.data?.verified ?? result?.success ?? false;

  return (
    <div className={`glass-panel rounded-2xl p-5 animate-fade-in ${
      isEligible && verified
        ? "border-emerald-500/20 bg-emerald-500/5 shadow-[0_0_20px_rgba(0,255,102,0.05)]"
        : "border-amber-500/20 bg-amber-500/5 shadow-[0_0_20px_rgba(162,168,50,0.05)]"
    }`}>
      <div className="flex items-center gap-4">
        {/* Badge icon */}
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border ${
          isEligible && verified
            ? "bg-[#00ff66]/10 border-[#00ff66]/20 text-[#00ff66]"
            : "bg-amber-500/10 border-amber-500/20 text-amber-400"
        }`}>
          {isEligible && verified ? (
            <svg className="w-6 h-6 animate-badge-pop" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
            </svg>
          ) : (
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"/>
            </svg>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className={`text-xs font-mono font-bold uppercase tracking-wider ${
            isEligible && verified ? "text-[#00ff66]" : "text-amber-400"
          }`}>
            {isEligible && verified ? "PROOF_VERIFIED_ELIGIBLE" : verified ? "PROOF_VERIFIED_INELIGIBLE" : "VERIFICATION_FAILED"}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1 font-mono">
            {isEligible && verified
              ? "Zero-knowledge proof is valid. Identity criteria mathematically satisfied."
              : verified
              ? "ZK calculations are valid, but holder claims do not satisfy constraints."
              : "Witness vectors failed mathematical equation checks."
            }
          </p>
        </div>
      </div>

      {/* Metadata chips */}
      {result && (
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-emerald-950/60">
          {proofTime && (
            <span className="inline-flex items-center gap-1.5 text-[9px] font-mono px-2.5 py-0.5 rounded border border-emerald-500/20 bg-emerald-950/10 text-emerald-400">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
              </svg>
              {proofTime}MS
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-[9px] font-mono px-2.5 py-0.5 rounded border border-emerald-500/20 bg-emerald-950/10 text-emerald-500">
            SYSTEM_PLONK
          </span>
          {(result?.data?.proofType || result?.proofType) && (
            <span className="inline-flex items-center gap-1 text-[9px] font-mono px-2.5 py-0.5 rounded border border-emerald-500/20 bg-emerald-950/10 text-slate-400 uppercase">
              {result.data?.proofType || result.proofType}
            </span>
          )}
          {(result?.data?.nullifierUsed || result?.data?.nullifierRegistered || result?.nullifierUsed) && (
            <span className="inline-flex items-center gap-1.5 text-[9px] font-mono px-2.5 py-0.5 rounded border border-emerald-500/20 bg-emerald-950/10 text-emerald-400">
              🔒 NULLIFIER_BOUND
            </span>
          )}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

const API = "http://localhost:3000";

export default function PublicVerify() {
  const { token } = useParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function verify() {
      try {
        const res = await fetch(`${API}/v3/verify/${token}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || "Verification failed");
        setResult(data.data.verification);
      } catch (err) { setError(err.message); }
      finally { setLoading(false); }
    }
    verify();
  }, [token]);

  return (
    <div className="min-h-screen bg-[#020204] text-[#e2fce8] flex items-center justify-center px-4 relative">
      {/* Radial ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden bg-[linear-gradient(to_right,#00ff6606_1px,transparent_1px),linear-gradient(to_bottom,#00ff6606_1px,transparent_1px)] bg-[size:32px_32px]">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-600 rounded-full mix-blend-screen filter blur-[200px] opacity-[0.05] animate-float" />
      </div>

      <div className="relative max-w-md w-full z-10">
        {/* Logo */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl border border-emerald-500/30 bg-emerald-950/40 flex items-center justify-center text-[#00ff66] font-mono font-bold shadow-[0_0_10px_rgba(0,255,102,0.15)]">
              [Æ]
            </div>
            <span className="text-xl font-mono font-bold tracking-[0.2em] text-slate-100">
              AEGIS<span className="text-emerald-400">ID</span>
            </span>
          </div>
          <p className="text-[10px] text-slate-500 font-mono mt-2 uppercase tracking-widest">Credential Verification Portal</p>
        </div>

        {loading ? (
          <div className="glass-panel rounded-2xl p-12 text-center animate-fade-in shadow-2xl">
            <div className="w-10 h-10 border border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">Verifying ZK proof...</p>
          </div>
        ) : error ? (
          <div className="glass-panel border-rose-500/30 bg-rose-500/5 rounded-2xl p-8 text-center animate-fade-in shadow-2xl">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-4 text-rose-505 animate-badge-pop">
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            </div>
            <h2 className="text-sm font-mono font-bold text-white uppercase tracking-widest mb-2">Verification Failed</h2>
            <p className="text-xs font-mono text-slate-400">{error}</p>
          </div>
        ) : result ? (
          <div className="glass-panel rounded-2xl overflow-hidden animate-fade-in shadow-2xl border-emerald-950/80">
            {/* Status banner */}
            <div className={`px-6 py-5 ${result.isEligible ? "bg-gradient-to-r from-emerald-500/5 to-emerald-500/5 border-b border-emerald-500/20" : "bg-gradient-to-r from-rose-500/5 to-rose-500/5 border-b border-rose-500/30"}`}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center animate-badge-pop border ${result.isEligible ? "bg-emerald-500/10 border-emerald-500/20 text-[#00ff66]" : "bg-rose-500/10 border-rose-500/20 text-rose-550"}`}>
                  {result.isEligible ? (
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  ) : (
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  )}
                </div>
                <div>
                  <h2 className={`text-sm font-mono font-bold uppercase tracking-wider ${result.isEligible ? "text-[#00ff66]" : "text-rose-500"}`}>
                    {result.isEligible ? "PROOF_ELIGIBLE_VERIFIED" : "PROOF_INELIGIBLE"}
                  </h2>
                  <p className="text-[10px] font-mono text-slate-400 uppercase mt-1 leading-normal">
                    {result.isEligible ? "Condition criteria mathematically met." : "Claims do not satisfy constraints."}
                  </p>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="p-6 space-y-1">
              {[
                ["Credential Type", result.credentialType === "age_verification" ? "Age Verification" : result.credentialType],
                ["ZK Proof", result.zkProof?.verified ? `Verified — ${result.zkProof.proofSystem}` : "Not available"],
                ["Document Binding", result.documentBinding?.documentHashPrefix ? `${result.documentBinding.documentHashPrefix}...` : "—"],
                ["Binding Method", result.documentBinding?.bindingMethod || "—"],
                ["Shared With", result.sharedWith || "Public"],
                ["Issued", new Date(result.issuedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })],
                ["Expires", new Date(result.expiresAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })],
                ["Verification Checks", result.verificationCount],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between items-center py-2.5 px-3 rounded-lg border-b border-emerald-950/40 last:border-0 hover:bg-emerald-950/20 transition-colors">
                  <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider font-semibold">{label}</span>
                  <span className="text-xs font-mono font-bold text-slate-100 text-right">{value}</span>
                </div>
              ))}
            </div>

            {/* Privacy notice */}
            <div className="px-6 py-4 bg-[#020502] border-t border-emerald-950/80">
              <div className="flex items-start gap-3">
                <svg className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                <p className="text-[9px] text-slate-500 leading-relaxed font-mono uppercase tracking-wide">
                  Performed under ZK-privacy protocol. Raw personal attributes (e.g. DOB) are never transmitted or evaluated by verifier.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-6 flex gap-3">
              <button onClick={() => window.print()} className="flex-1 px-4 py-2.5 rounded-xl btn-cyber-primary text-xs font-mono tracking-widest flex items-center justify-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                SAVE_REPORT
              </button>
              <button onClick={() => window.location.href = "/"} className="px-5 py-2.5 rounded-xl btn-cyber-secondary text-xs font-mono tracking-widest">
                DISMISS
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

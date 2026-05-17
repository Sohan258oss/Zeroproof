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
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500 rounded-full mix-blend-multiply filter blur-[200px] opacity-[0.04]" />
      </div>

      <div className="relative max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <span className="text-xl font-bold"><span className="gradient-text">Aegis</span>ID</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">Credential Verification Portal</p>
        </div>

        {loading ? (
          <div className="glass-panel rounded-2xl p-12 text-center animate-fade-in">
            <div className="w-12 h-12 border-2 border-sky-500/30 border-t-sky-400 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-slate-400">Verifying credential...</p>
          </div>
        ) : error ? (
          <div className="glass-panel rounded-2xl p-8 text-center animate-fade-in">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-red-500/10 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            </div>
            <h2 className="text-lg font-bold text-white mb-2">Verification Failed</h2>
            <p className="text-sm text-slate-400">{error}</p>
          </div>
        ) : result ? (
          <div className="glass-panel rounded-2xl overflow-hidden animate-fade-in">
            {/* Status banner */}
            <div className={`px-6 py-4 ${result.isEligible ? "bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-b border-emerald-500/10" : "bg-gradient-to-r from-red-500/10 to-orange-500/10 border-b border-red-500/10"}`}>
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center animate-badge-pop ${result.isEligible ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                  {result.isEligible ? (
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  ) : (
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  )}
                </div>
                <div>
                  <h2 className={`text-lg font-bold ${result.isEligible ? "text-emerald-400" : "text-red-400"}`}>
                    {result.isEligible ? "Credential Verified" : "Not Eligible"}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {result.isEligible ? "This individual meets the age requirement." : "This individual does not meet the age requirement."}
                  </p>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="p-6 space-y-0">
              {[
                ["Credential Type", result.credentialType === "age_verification" ? "Age Verification" : result.credentialType],
                ["ZK Proof", result.zkProof?.verified ? `Verified — ${result.zkProof.proofSystem}` : "Not available"],
                ["Document Binding", result.documentBinding?.documentHashPrefix],
                ["Binding Method", result.documentBinding?.bindingMethod],
                ["Shared With", result.sharedWith],
                ["Issued", new Date(result.issuedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })],
                ["Expires", new Date(result.expiresAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })],
                ["Verification Count", result.verificationCount],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between py-3 border-b border-white/5 last:border-0">
                  <span className="text-xs text-slate-500">{label}</span>
                  <span className="text-xs text-white font-medium text-right">{value}</span>
                </div>
              ))}
            </div>

            {/* Privacy notice */}
            <div className="px-6 py-4 bg-slate-900/30 border-t border-white/5">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  This verification was performed using zero-knowledge cryptography. No personal data, documents, or date of birth were shared. Only the credential's validity and eligibility status are revealed.
                </p>
              </div>
            </div>
            {/* Actions */}
            <div className="px-6 py-6 flex gap-3">
              <button onClick={() => window.print()} className="flex-1 px-4 py-2.5 text-xs font-bold text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all flex items-center justify-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                Save Report
              </button>
              <button onClick={() => window.location.href = "/"} className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-white transition-all">
                Dismiss
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

const API = "http://localhost:3000";

export default function CredentialDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [credential, setCredential] = useState(null);
  const [shareLinks, setShareLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sharing, setSharing] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [copied, setCopied] = useState(null);

  useEffect(() => { fetchCredential(); }, [id]);

  async function fetchCredential() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/v3/credentials/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Not found");
      setCredential(data.data.credential);
      setShareLinks(data.data.shareLinks || []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function handleShare(e) {
    e.preventDefault();
    setSharing(true);
    try {
      const res = await fetch(`${API}/v3/credentials/${id}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationName: orgName, expiresInHours: 72 })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message);
      setOrgName("");
      fetchCredential();
    } catch (err) { setError(err.message); }
    finally { setSharing(false); }
  }

  async function handleRevoke(token) {
    try {
      await fetch(`${API}/v3/credentials/${id}/share`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token })
      });
      fetchCredential();
    } catch (err) { console.error(err); }
  }

  function copyLink(token) {
    const url = `${window.location.origin}/verify/${token}`;
    navigator.clipboard.writeText(url);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-sky-500/30 border-t-sky-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !credential) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
        <div className="glass-panel rounded-2xl p-8 text-center max-w-md">
          <p className="text-red-400 font-medium mb-2">Credential Not Found</p>
          <p className="text-xs text-slate-500 mb-4">{error}</p>
          <button onClick={() => navigate("/vault")} className="px-4 py-2 text-xs text-white bg-white/5 border border-white/10 rounded-xl">Back to Vault</button>
        </div>
      </div>
    );
  }

  const c = credential;
  const rows = [
    ["Credential ID", c.id],
    ["Type", c.credentialType],
    ["Status", c.status],
    ["Holder", c.attributes?.fullName || "—"],
    ["Document Type", c.attributes?.documentType || "—"],
    ["Age", c.age],
    ["Eligible", c.isEligible ? "Yes ✓" : "No ✗"],
    ["Issued", new Date(c.issuedAt).toLocaleString()],
    ["Expires", new Date(c.expiresAt).toLocaleString()],
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-violet-500 rounded-full mix-blend-multiply filter blur-[150px] opacity-[0.03] animate-float" />
      </div>

      <section className="relative pt-28 pb-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <button onClick={() => navigate("/vault")} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-white transition-colors mb-6">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          Back to Vault
        </button>

        {/* Header */}
        <div className="flex items-start gap-4 mb-8 animate-fade-in-up">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${c.isEligible ? "bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-400" : "bg-gradient-to-br from-red-500/20 to-orange-500/20 text-red-400"}`}>
            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>{c.isEligible && <polyline points="9 12 11 14 15 10"/>}</svg>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Credential Details</h1>
            <p className="text-xs text-slate-500 font-mono mt-1">{c.id}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Details */}
          <div className="glass-panel rounded-2xl p-6 animate-fade-in">
            <h3 className="text-sm font-semibold text-white mb-4">Metadata</h3>
            <div className="space-y-0">
              {rows.map(([label, value]) => (
                <div key={label} className="flex justify-between py-2.5 border-b border-white/5 last:border-0">
                  <span className="text-xs text-slate-500">{label}</span>
                  <span className={`text-xs font-medium ${label === "Eligible" ? (c.isEligible ? "text-emerald-400" : "text-red-400") : "text-white"}`}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ZK Proof & Binding */}
          <div className="space-y-6">
            <div className="glass-panel rounded-2xl p-6 animate-fade-in">
              <h3 className="text-sm font-semibold text-white mb-4">ZK Proof</h3>
              {c.zkProof ? (
                <div className="space-y-2">
                  {[["Status", c.zkProof.verified ? "Verified ✓" : "Invalid"], ["System", c.zkProof.proofSystem], ["Circuit", c.zkProof.circuit], ["Curve", c.zkProof.curve]].map(([l,v]) => (
                    <div key={l} className="flex justify-between py-2 border-b border-white/5 last:border-0">
                      <span className="text-xs text-slate-500">{l}</span>
                      <span className={`text-xs font-medium ${l === "Status" && c.zkProof.verified ? "text-emerald-400" : "text-sky-400"}`}>{v}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">No ZK proof generated (circuit files may be missing).</p>
              )}
            </div>

            <div className="glass-panel rounded-2xl p-6 animate-fade-in">
              <h3 className="text-sm font-semibold text-white mb-4">Document Binding</h3>
              <div className="space-y-2">
                <div className="py-2 border-b border-white/5">
                  <p className="text-xs text-slate-500 mb-1">Document Hash</p>
                  <p className="text-xs text-sky-400 font-mono break-all">{c.binding?.documentHash}</p>
                </div>
                <div className="py-2 border-b border-white/5">
                  <p className="text-xs text-slate-500 mb-1">Attribute Hash</p>
                  <p className="text-xs text-violet-400 font-mono break-all">{c.binding?.attributeHash}</p>
                </div>
                <div className="py-2">
                  <p className="text-xs text-slate-500 mb-1">Method</p>
                  <p className="text-xs text-slate-300">{c.binding?.method}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Share Links */}
        <div className="mt-8 glass-panel rounded-2xl p-6 animate-fade-in">
          <h3 className="text-sm font-semibold text-white mb-4">Share Links</h3>
          <p className="text-xs text-slate-500 mb-4">Generate a shareable link for organizations to verify this credential without seeing any personal data.</p>

          <form onSubmit={handleShare} className="flex gap-3 mb-6">
            <input type="text" value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="Organization name (optional)"
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900/50 border border-white/5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-500/30 transition-all" />
            <button type="submit" disabled={sharing}
              className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-sky-500 to-indigo-600 rounded-xl hover:from-sky-400 hover:to-indigo-500 transition-all disabled:opacity-50">
              {sharing ? "..." : "Generate Link"}
            </button>
          </form>

          {shareLinks.length > 0 ? (
            <div className="space-y-3">
              {shareLinks.map(s => (
                <div key={s.token} className="flex items-center gap-3 py-3 px-4 rounded-xl bg-slate-900/30 border border-white/5">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white font-mono truncate">{window.location.origin}/verify/{s.token}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {s.organizationName || "Public"} · Expires {new Date(s.expiresAt).toLocaleDateString()} · {s.verificationCount} checks
                    </p>
                  </div>
                  <button onClick={() => copyLink(s.token)} className="px-3 py-1.5 text-[10px] font-medium text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 rounded-lg transition-all">
                    {copied === s.token ? "Copied!" : "Copy"}
                  </button>
                  <button onClick={() => handleRevoke(s.token)} className="px-3 py-1.5 text-[10px] font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg transition-all">
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-600 text-center py-4">No share links yet. Generate one above.</p>
          )}
        </div>
      </section>
    </div>
  );
}

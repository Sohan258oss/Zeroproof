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
      <div className="min-h-screen bg-[#020204] flex items-center justify-center">
        <div className="w-8 h-8 border border-emerald-500/20 border-t-emerald-450 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !credential) {
    return (
      <div className="min-h-screen bg-[#020204] text-[#e2fce8] flex items-center justify-center px-4">
        <div className="glass-panel border-rose-500/20 bg-rose-500/5 rounded-2xl p-8 text-center max-w-md shadow-2xl">
          <p className="text-xs font-mono font-bold text-rose-500 mb-2 uppercase tracking-widest">CREDENTIAL_NOT_FOUND</p>
          <p className="text-[11px] text-slate-400 font-mono mb-6">{error}</p>
          <button onClick={() => navigate("/vault")} className="px-5 py-2.5 rounded-xl btn-cyber-secondary text-xs font-mono tracking-widest">
            RETURN_TO_VAULT
          </button>
        </div>
      </div>
    );
  }

  const c = credential;
  const rows = [
    ["Credential ID", c.id],
    ["Type", c.credentialType === "age_verification" ? "Age Verification" : c.credentialType],
    ["Status", c.status],
    ["Holder", c.attributes?.fullName || "Hidden (ZK-secured)"],
    ["Document Type", c.attributes?.documentType || "Hidden (ZK-secured)"],
    ["Age", c.age || "18+ (ZK-proven)"],
    ["Eligible", c.isEligible ? "YES ✓" : "NO ✗"],
    ["Issued", new Date(c.issuedAt).toLocaleString()],
    ["Expires", new Date(c.expiresAt).toLocaleString()],
  ];

  return (
    <div className="min-h-screen bg-[#020204] text-[#e2fce8] relative">
      {/* Background Grids */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden bg-[linear-gradient(to_right,#00ff6606_1px,transparent_1px),linear-gradient(to_bottom,#00ff6606_1px,transparent_1px)] bg-[size:32px_32px]">
        <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-emerald-600 rounded-full mix-blend-screen filter blur-[180px] opacity-[0.05] animate-float" />
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-[#00ff66] rounded-full mix-blend-screen filter blur-[180px] opacity-[0.03]" />
      </div>

      <section className="relative pt-28 pb-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <button onClick={() => navigate("/vault")} className="inline-flex items-center gap-1.5 text-[10px] font-mono text-emerald-300 hover:text-emerald-400 bg-emerald-950/20 border border-emerald-950 hover:border-emerald-500/20 px-3 py-1.5 rounded-lg mb-6 transition-all cursor-pointer">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          RETURN_TO_VAULT
        </button>

        {/* Header */}
        <div className="flex items-start gap-4 mb-8 animate-fade-in-up">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 border ${
            c.isEligible 
              ? "bg-[#00ff66]/10 border-[#00ff66]/20 text-[#00ff66]" 
              : "bg-rose-500/10 border-rose-500/20 text-rose-500"
          }`}>
            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>{c.isEligible && <polyline points="9 12 11 14 15 10"/>}</svg>
          </div>
          <div>
            <h1 className="text-xl font-mono font-extrabold tracking-widest text-slate-100 uppercase">CREDENTIAL_DETAILS</h1>
            <p className="text-[10px] text-emerald-500/60 font-mono mt-1">{c.id}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Details */}
          <div className="lg:col-span-7 glass-panel rounded-2xl p-6 animate-fade-in shadow-2xl">
            <h3 className="text-xs font-mono font-bold text-[#00ff66] uppercase tracking-widest mb-4">METADATA_REGISTRY</h3>
            <div className="space-y-1">
              {rows.map(([label, value]) => (
                <div key={label} className="flex justify-between items-center py-2.5 px-3 rounded-lg border-b border-emerald-950/40 last:border-0 hover:bg-emerald-950/20 transition-colors">
                  <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider font-semibold">{label}</span>
                  <span className={`text-xs font-mono font-bold text-right truncate max-w-[200px] ${
                    label === "Eligible" 
                      ? (c.isEligible ? "text-[#00ff66]" : "text-rose-500") 
                      : (label === "Status" && c.status === "active" ? "text-[#00ff66]" : "text-slate-100")
                  }`}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ZK Proof & Binding */}
          <div className="lg:col-span-5 space-y-6">
            <div className="glass-panel rounded-2xl p-6 animate-fade-in shadow-2xl">
              <h3 className="text-xs font-mono font-bold text-[#00ff66] uppercase tracking-widest mb-4">CRYPTOGRAPHIC_PROOF</h3>
              {c.zkProof ? (
                <div className="space-y-1.5">
                  {[["Status", c.zkProof.verified ? "Verified ✓" : "Invalid"], ["System", c.zkProof.proofSystem], ["Circuit", c.zkProof.circuit], ["Curve", c.zkProof.curve]].map(([l,v]) => (
                    <div key={l} className="flex justify-between items-center py-2 px-3 border-b border-emerald-950/40 last:border-0 hover:bg-emerald-950/25 transition-colors">
                      <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider font-semibold">{l}</span>
                      <span className={`text-xs font-mono font-bold ${l === "Status" && c.zkProof.verified ? "text-[#00ff66]" : "text-emerald-500"}`}>{v}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] font-mono text-slate-500 bg-emerald-950/10 p-3 rounded-xl border border-emerald-950/40">No ZK proof generated (circuit files may be missing).</p>
              )}
            </div>

            <div className="glass-panel rounded-2xl p-6 animate-fade-in shadow-2xl">
              <h3 className="text-xs font-mono font-bold text-[#00ff66] uppercase tracking-widest mb-4">DOCUMENT_BINDING</h3>
              <div className="space-y-3.5">
                <div className="py-1">
                  <p className="text-[9px] text-slate-500 font-mono uppercase tracking-widest font-semibold mb-1.5">Document Hash</p>
                  <p className="text-[10px] text-[#00ff66] font-mono break-all bg-black/40 p-2.5 border border-emerald-950 rounded-lg">{c.binding?.documentHash}</p>
                </div>
                <div className="py-1">
                  <p className="text-[9px] text-slate-500 font-mono uppercase tracking-widest font-semibold mb-1.5">Attribute Hash</p>
                  <p className="text-[10px] text-emerald-500 font-mono break-all bg-black/40 p-2.5 border border-emerald-950 rounded-lg">{c.binding?.attributeHash}</p>
                </div>
                <div className="flex justify-between items-center py-2 px-3 hover:bg-emerald-950/25 rounded-lg transition-colors">
                  <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest font-semibold">Method</span>
                  <span className="text-xs font-mono font-bold text-slate-300">{c.binding?.method}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Share Links */}
        <div className="mt-8 glass-panel rounded-2xl p-6 animate-fade-in shadow-2xl">
          <h3 className="text-xs font-mono font-bold text-[#00ff66] uppercase tracking-widest mb-2">REVOCABLE_SHARE_KEYS</h3>
          <p className="text-slate-400 text-xs mb-5 font-medium">Generate a temporary verification signature link. Third-parties verify parameters without viewing raw attributes.</p>

          <form onSubmit={handleShare} className="flex flex-col sm:flex-row gap-3 mb-6">
            <input type="text" value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="Organization / Verifier name"
              className="input-cyber flex-1 px-4 py-2.5 rounded-xl text-xs placeholder:text-slate-700" />
            <button type="submit" disabled={sharing}
              className="px-5 py-2.5 rounded-xl btn-cyber-primary text-xs font-mono tracking-widest active:scale-[0.98]">
              {sharing ? "..." : "GENERATE_KEY"}
            </button>
          </form>

          {shareLinks.length > 0 ? (
            <div className="space-y-3">
              {shareLinks.map(s => (
                <div key={s.token} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3.5 px-4 rounded-xl bg-emerald-950/10 border border-emerald-950/60 shadow-lg">
                  <div className="flex-1 min-w-0">
                    <a href={`${window.location.origin}/verify/${s.token}`} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-400 font-mono truncate underline hover:text-emerald-355 block">
                      {window.location.origin}/verify/{s.token}
                    </a>
                    <p className="text-[10px] font-mono text-slate-500 mt-1 uppercase tracking-wider">
                      {s.organizationName || "Public"} · Expires {new Date(s.expiresAt).toLocaleDateString()} · {s.verificationCount} checks
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <button onClick={() => copyLink(s.token)} className="px-3.5 py-1.5 text-[9px] font-mono font-bold text-emerald-450 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg cursor-pointer transition-all uppercase tracking-wider">
                      {copied === s.token ? "Copied" : "Copy"}
                    </button>
                    <button onClick={() => handleRevoke(s.token)} className="px-3.5 py-1.5 text-[9px] font-mono font-bold text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg cursor-pointer transition-all uppercase tracking-wider">
                      Revoke
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[10px] font-mono text-slate-500 text-center py-4 bg-emerald-950/5 border border-emerald-950/20 rounded-xl">No active verification links. Issue one above.</p>
          )}
        </div>
      </section>
    </div>
  );
}

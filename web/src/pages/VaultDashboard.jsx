import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import CredentialCard from "../components/CredentialCard";

const API = "http://localhost:3000";

export default function VaultDashboard() {
  const [documents, setDocuments] = useState([]);
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const [dR, cR] = await Promise.all([
        fetch(`${API}/v3/documents`), fetch(`${API}/v3/credentials`)
      ]);
      const dD = await dR.json(), cD = await cR.json();
      setDocuments(dD.data?.documents || []);
      setCredentials(cD.data?.credentials || []);
    } catch { setError("Cannot connect to API on port 3000."); }
    finally { setLoading(false); }
  }

  const fmtDate = (iso) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const fmtSize = (b) => b < 1024 ? b+" B" : b < 1048576 ? (b/1024).toFixed(1)+" KB" : (b/1048576).toFixed(2)+" MB";

  const stats = [
    { label: "SECURED_DOCS", value: documents.length, color: "text-emerald-450", bgColor: "bg-emerald-500/5", borderColor: "border-emerald-500/10" },
    { label: "ZK_CREDENTIALS", value: credentials.length, color: "text-[#00ff66]", bgColor: "bg-[#00ff66]/5", borderColor: "border-[#00ff66]/10" },
    { label: "ZK_VERIFIED", value: credentials.filter(c => c.zkProofVerified).length, color: "text-[#00f0aa]", bgColor: "bg-[#00f0aa]/5", borderColor: "border-[#00f0aa]/10" },
    { label: "ELIGIBLE_USERS", value: credentials.filter(c => c.isEligible).length, color: "text-amber-500", bgColor: "bg-amber-500/5", borderColor: "border-amber-500/10" },
  ];

  const isEmpty = documents.length === 0 && credentials.length === 0;

  return (
    <div className="min-h-screen bg-[#020204] text-[#e2fce8] relative">
      {/* Background radial effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden bg-[linear-gradient(to_right,#00ff6606_1px,transparent_1px),linear-gradient(to_bottom,#00ff6606_1px,transparent_1px)] bg-[size:32px_32px]">
        <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-[#00ff66] rounded-full mix-blend-screen filter blur-[180px] opacity-[0.05] animate-float" />
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-emerald-600 rounded-full mix-blend-screen filter blur-[180px] opacity-[0.03]" />
        <div className="absolute top-1/3 left-1/3 w-[500px] h-[500px] bg-teal-600 rounded-full mix-blend-screen filter blur-[160px] opacity-[0.02]" />
      </div>

      <section className="relative pt-28 pb-4 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-950/20 border border-emerald-500/15 text-emerald-400 text-[10px] font-mono uppercase tracking-wider mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              SECURE CRYPTOGRAPHIC REGISTRY
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-mono uppercase">
              CREDENTIAL_VAULT
            </h1>
            <p className="text-slate-400 text-xs mt-1.5 max-w-xl leading-relaxed font-medium">
              Manage local identity credentials, upload verified parameter files, and configure secure time-bounded verifier keys.
            </p>
          </div>
          <Link to="/vault/upload" id="upload-document-btn"
            className="px-4 py-2.5 rounded-xl btn-cyber-primary text-xs font-mono tracking-widest hover:shadow-[0_0_15px_rgba(0,255,102,0.2)] flex items-center gap-2 active:scale-[0.97]">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            UPLOAD_DOCUMENT
          </Link>
        </div>

        {!loading && !error && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {stats.map(s => (
              <div key={s.label} className="glass-panel rounded-2xl p-5 hover:scale-[1.01] transition-all">
                <p className={`text-2xl font-mono font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-slate-500 font-mono tracking-widest mt-1.5 uppercase font-semibold">{s.label}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="relative px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pb-16">
        {loading ? (
          <div className="flex items-center justify-center py-20 animate-fade-in">
            <div className="w-8 h-8 border border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="glass-panel border-rose-500/20 bg-rose-500/5 rounded-2xl p-8 text-center animate-fade-in max-w-md mx-auto shadow-2xl">
            <p className="text-xs font-mono font-bold text-rose-450 mb-1 uppercase tracking-widest">CONNECTION_ERROR</p>
            <p className="text-[11px] text-slate-400 font-mono mt-2">{error}</p>
            <button onClick={fetchData} className="mt-5 px-4 py-2 text-[10px] font-mono font-bold text-emerald-450 bg-emerald-950/40 border border-emerald-500/20 hover:border-emerald-500/40 rounded-lg cursor-pointer transition-all">RETRY_HANDSHAKE</button>
          </div>
        ) : isEmpty ? (
          <div className="glass-panel border-emerald-950 rounded-2xl p-12 text-center animate-fade-in max-w-lg mx-auto shadow-2xl">
            <div className="w-12 h-12 mx-auto rounded-xl border border-emerald-500/15 bg-emerald-950/40 flex items-center justify-center mb-5 text-emerald-400">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            </div>
            <h3 className="text-xs font-mono font-bold text-white uppercase tracking-widest mb-1.5">REGISTRY_EMPTY</h3>
            <p className="text-[11px] text-slate-400 max-w-md mx-auto mb-6 leading-relaxed">No cryptographic identity parameters found on this client node registry.</p>
            <Link to="/vault/upload" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl btn-cyber-primary text-xs font-mono tracking-widest">
              INITIALIZE_VAULT
            </Link>
          </div>
        ) : (
          <div className="space-y-10">
            {documents.length > 0 && (
              <div className="animate-fade-in">
                <h2 className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest mb-5 flex items-center gap-2.5">
                  <span>📄 ACTIVE_DOCUMENTS</span>
                  <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">{documents.length}</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {documents.map(doc => (
                    <div key={doc.id} className="glass-panel rounded-2xl p-5 hover:border-emerald-500/20 transition-all duration-300 group shadow-lg">
                      <div className="flex items-start gap-4">
                        <div className="w-9 h-9 rounded-xl border border-emerald-500/15 bg-emerald-950/40 flex items-center justify-center text-slate-500 group-hover:text-[#00ff66] group-hover:border-[#00ff66]/25 transition-all flex-shrink-0">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-mono font-bold text-slate-200 group-hover:text-white truncate transition-colors">{doc.originalName}</p>
                          <p className="text-[10px] font-mono text-slate-500 mt-1">{fmtSize(doc.sizeBytes)} · {fmtDate(doc.createdAt)}</p>
                          <p className="text-[9.5px] text-slate-600 font-mono mt-2 truncate bg-emerald-950/10 px-2 py-0.5 rounded border border-emerald-950/45">SHA256: {doc.documentHash.slice(0, 16)}...</p>
                        </div>
                      </div>
                      <div className="mt-4 pt-3 border-t border-emerald-950/60 flex items-center justify-between">
                        <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">{doc.attributes?.documentType || "document"}</span>
                        <div className="flex items-center gap-1.5 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span className="text-[9px] font-mono text-emerald-400 font-bold uppercase tracking-wider">ENCRYPTED_AES_256</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {credentials.length > 0 && (
              <div className="animate-fade-in">
                <h2 className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest mb-5 flex items-center gap-2.5">
                  <span>🛡️ SIGNED_CREDENTIALS</span>
                  <span className="text-[9px] font-mono font-bold text-[#00ff66] bg-[#00ff66]/10 px-2.5 py-0.5 rounded border border-[#00ff66]/20">{credentials.length}</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {credentials.map(c => <CredentialCard key={c.id} credential={c} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

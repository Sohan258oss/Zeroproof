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
    { label: "Documents", value: documents.length },
    { label: "Credentials", value: credentials.length },
    { label: "ZK Verified", value: credentials.filter(c => c.zkProofVerified).length },
    { label: "Eligible", value: credentials.filter(c => c.isEligible).length },
  ];

  const isEmpty = documents.length === 0 && credentials.length === 0;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-indigo-500 rounded-full mix-blend-multiply filter blur-[150px] opacity-[0.03] animate-float" />
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-violet-600 rounded-full mix-blend-multiply filter blur-[150px] opacity-[0.04] animate-float-delayed" />
      </div>

      <section className="relative pt-28 pb-4 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium mb-3 animate-fade-in">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              Document Vault
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight animate-fade-in-up">
              Your <span className="gradient-text">Credential Vault</span>
            </h1>
            <p className="text-slate-500 text-sm mt-2 max-w-xl animate-fade-in-up-delayed">
              Upload identity documents, issue ZK credentials, and share verification links — all encrypted and private.
            </p>
          </div>
          <Link to="/vault/upload" id="upload-document-btn"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-sky-500 to-indigo-600 rounded-xl hover:from-sky-400 hover:to-indigo-500 transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.97] animate-fade-in">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Upload Document
          </Link>
        </div>

        {!loading && !error && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8 animate-fade-in">
            {stats.map(s => (
              <div key={s.label} className="glass-panel rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-white">{s.value}</p>
                <p className="text-[11px] text-slate-500 uppercase tracking-wider mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="relative px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pb-16">
        {loading ? (
          <div className="flex items-center justify-center py-20 animate-fade-in">
            <div className="w-10 h-10 border-2 border-sky-500/30 border-t-sky-400 rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="glass-panel rounded-2xl p-8 text-center animate-fade-in">
            <p className="text-sm text-red-400 font-medium mb-2">Connection Error</p>
            <p className="text-xs text-slate-500">{error}</p>
            <button onClick={fetchData} className="mt-4 px-4 py-2 text-xs text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all">Retry</button>
          </div>
        ) : isEmpty ? (
          <div className="glass-panel rounded-2xl p-12 text-center animate-fade-in">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-sky-500/10 to-indigo-500/10 border border-sky-500/10 flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-sky-400/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Your vault is empty</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">Upload your first identity document to get started.</p>
            <Link to="/vault/upload" className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-sky-500 to-indigo-600 rounded-xl transition-all shadow-lg shadow-indigo-500/20">
              Upload First Document
            </Link>
          </div>
        ) : (
          <>
            {documents.length > 0 && (
              <div className="mb-10 animate-fade-in">
                <h2 className="text-lg font-bold text-white mb-4">📄 Documents <span className="text-xs font-mono text-slate-600 bg-slate-800/50 px-2 py-0.5 rounded-full ml-2">{documents.length}</span></h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {documents.map(doc => (
                    <div key={doc.id} className="glass-panel rounded-xl p-4 hover:bg-slate-800/40 transition-all">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400 flex-shrink-0">
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{doc.originalName}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{fmtSize(doc.sizeBytes)} · {fmtDate(doc.createdAt)}</p>
                          <p className="text-[10px] text-slate-600 font-mono mt-1 truncate">SHA-256: {doc.documentHash?.slice(0, 16)}...</p>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                        <span className="text-[10px] text-slate-600 uppercase tracking-wider">{doc.attributes?.documentType || "document"}</span>
                        <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400"/><span className="text-[10px] text-emerald-400">Encrypted</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {credentials.length > 0 && (
              <div className="animate-fade-in">
                <h2 className="text-lg font-bold text-white mb-4">🛡️ ZK Credentials <span className="text-xs font-mono text-slate-600 bg-slate-800/50 px-2 py-0.5 rounded-full ml-2">{credentials.length}</span></h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {credentials.map(c => <CredentialCard key={c.id} credential={c} />)}
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

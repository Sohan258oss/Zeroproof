import { useState } from "react";
import { useNavigate } from "react-router-dom";
import FileDropzone from "../components/FileDropzone";

const API = "http://localhost:3000";

export default function DocumentUpload() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [stage, setStage] = useState("idle"); // idle | analyzing | confirming | issuing | done | error
  const [error, setError] = useState(null);
  
  // Editable fields for confirmation
  const [name, setName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [documentType, setDocumentType] = useState("id_card");
  
  const [extractedDocId, setExtractedDocId] = useState(null);
  const [result, setResult] = useState(null);
  const [shareLink, setShareLink] = useState(null);
  const [copied, setCopied] = useState(false);

  // Auto-scan document
  async function handleScan(e) {
    if (e) e.preventDefault();
    if (!file || uploading) return;

    setUploading(true);
    setError(null);
    setStage("analyzing");

    try {
      const formData = new FormData();
      formData.append("document", file);

      const res = await fetch(`${API}/v3/documents/upload`, { method: "POST", body: formData });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error?.message || "Analysis failed.");

      const doc = data.data.document;
      setExtractedDocId(doc.id);
      setName(doc.attributes.name || "");
      setDateOfBirth(doc.attributes.dob || "");
      setDocumentType(doc.attributes.documentType || "id_card");
      
      setStage("confirming");
    } catch (err) {
      setError(err.message);
      setStage("error");
    } finally {
      setUploading(false);
    }
  }

  // Issue ZK Credential after confirmation/edit
  async function handleIssue() {
    if (!extractedDocId || uploading) return;
    if (!name || !dateOfBirth) {
        setError("Please ensure Name and DOB are filled correctly.");
        return;
    }

    setUploading(true);
    setStage("issuing");

    try {
      // 1. Update document attributes if they were edited
      // (For this prototype, we'll just pass them to the issue endpoint or assume they are bound)
      // In a real system, we'd update the document record first.
      
      // 2. Issue Credential
      const issueRes = await fetch(`${API}/v3/credentials/issue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            documentId: extractedDocId,
            overrides: { fullName: name, dateOfBirth, documentType } // In case user edited
        })
      });
      const issueData = await issueRes.json();
      if (!issueRes.ok) throw new Error(issueData.error?.message || "Credential issuance failed.");

      const cred = issueData.data.credential;

      // 3. Auto-generate Share Link
      const shareRes = await fetch(`${API}/v3/credentials/${cred.id}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationName: "General Verification", expiresInHours: 720 })
      });
      const shareData = await shareRes.json();

      setResult({ 
        document: { attributes: { name, dateOfBirth } }, 
        credential: cred 
      });
      if (shareRes.ok) setShareLink(shareData.data.shareLink);
      
      setStage("done");
    } catch (err) {
      setError(err.message);
      setStage("error");
    } finally {
      setUploading(false);
    }
  }

  function copyLink() {
    if (!shareLink) return;
    const url = `${window.location.origin}${shareLink.verifyUrl}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Success View
  if (stage === "done" && result) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
        <div className="max-w-xl w-full glass-panel rounded-3xl p-8 text-center animate-fade-in relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <div className="w-20 h-20 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6 animate-badge-pop shadow-lg shadow-emerald-500/10">
            <svg className="w-10 h-10 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <h2 className="text-2xl font-extrabold text-white mb-2">Zero-Proof Ready!</h2>
          <p className="text-sm text-slate-400 mb-8 max-w-sm mx-auto">Your identity is cryptographically secured. You can now share this verification link.</p>
          
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-white/5 rounded-2xl p-4 border border-white/5 text-left">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Subject</p>
              <p className="text-sm font-bold text-white truncate">{result.document.attributes.name}</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-4 border border-white/5 text-left">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Status</p>
              <p className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">Verified</p>
            </div>
          </div>

          {shareLink && (
            <div className="bg-slate-900/50 rounded-2xl p-5 border border-sky-500/20 mb-8 text-left animate-fade-in-up">
              <label className="text-[10px] text-sky-400 font-bold uppercase tracking-widest block mb-3">Shareable Verification Link</label>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-slate-950/50 px-4 py-2.5 rounded-xl border border-white/5 text-xs font-mono text-slate-400 truncate">
                  {window.location.origin}{shareLink.verifyUrl}
                </div>
                <button onClick={copyLink} className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${copied ? "bg-emerald-500 text-white" : "bg-sky-500/10 text-sky-400 hover:bg-sky-500/20"}`}>
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <button onClick={() => navigate(`/vault/credential/${result.credential.id}`)} className="flex-1 px-6 py-3 text-sm font-bold text-white bg-gradient-to-r from-sky-500 to-indigo-600 rounded-2xl hover:from-sky-400 hover:to-indigo-500 shadow-lg shadow-indigo-500/20">
              Manage
            </button>
            <button onClick={() => navigate("/vault")} className="px-6 py-3 text-sm font-bold text-slate-400 bg-white/5 border border-white/10 rounded-2xl">
              Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-sky-500 rounded-full mix-blend-multiply filter blur-[150px] opacity-[0.03] animate-float" />
      </div>

      <section className="relative pt-28 pb-16 px-4 sm:px-6 lg:px-8 max-w-2xl mx-auto">
        <button onClick={() => navigate("/vault")} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-white transition-colors mb-6">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          Back to Vault
        </button>

        <div className="mb-10 animate-fade-in-up text-center sm:text-left">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Identity <span className="gradient-text">Vault</span>
          </h1>
          <p className="text-slate-500 text-sm mt-3 leading-relaxed">
            Upload your ID. Our AI will read it automatically and issue a private ZK credential.
          </p>
        </div>

        {/* --- STAGE: ERROR --- */}
        {stage === "error" && (
          <div className="glass-panel rounded-2xl p-8 text-center mb-10 animate-shake">
            <div className="w-12 h-12 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <p className="text-sm font-bold text-white mb-2">Process Interrupted</p>
            <p className="text-xs text-slate-400 mb-6">{error}</p>
            <button onClick={() => { setStage("idle"); setError(null); }} className="px-6 py-2.5 text-xs font-bold text-white bg-slate-800 rounded-xl border border-white/5 hover:bg-slate-700 transition-all">
              Try Again
            </button>
          </div>
        )}

        {/* --- STAGE: PROCESSING --- */}
        {uploading && (
          <div className="glass-panel rounded-2xl p-12 text-center mb-10 animate-fade-in">
            <div className="w-12 h-12 border-2 border-sky-500/30 border-t-sky-400 rounded-full animate-spin mx-auto mb-6" />
            <p className="text-sm text-white font-medium">
              {stage === "analyzing" ? "Reading Document..." : "Securing Credential..."}
            </p>
            <p className="text-[10px] text-slate-500 mt-2 uppercase tracking-widest font-bold">Privacy Guaranteed</p>
          </div>
        )}

        {/* --- STAGE: IDLE (Upload) --- */}
        {!uploading && stage === "idle" && (
          <div className="space-y-8 animate-fade-in">
            <div className="glass-panel rounded-3xl p-2">
              <FileDropzone onFileSelect={setFile} disabled={uploading} />
            </div>
            <button onClick={handleScan} disabled={!file || uploading}
              className="w-full py-4 text-sm font-extrabold text-white bg-gradient-to-r from-sky-500 to-indigo-600 rounded-2xl hover:from-sky-400 hover:to-indigo-500 shadow-xl shadow-indigo-500/20 disabled:opacity-40 active:scale-[0.98] transition-all">
              Scan & Verify Automatically
            </button>
          </div>
        )}

        {/* --- STAGE: CONFIRMING --- */}
        {!uploading && stage === "confirming" && extractedDocId && (
          <div className="glass-panel rounded-3xl p-8 animate-fade-in">
            <h2 className="text-xl font-bold text-white mb-2">Extracted Details</h2>
            
            <div className="space-y-6 mb-8">
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-500 uppercase tracking-widest ml-1">Full Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-white/5 text-sm text-white focus:border-sky-500/30 focus:ring-1 focus:ring-sky-500/20 transition-all" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest ml-1">Date of Birth</label>
                  <input type="text" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} placeholder="YYYY-MM-DD"
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-white/5 text-sm text-white focus:border-sky-500/30 focus:ring-1 focus:ring-sky-500/20 transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest ml-1">ID Type</label>
                  <select value={documentType} onChange={e => setDocumentType(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-white/5 text-sm text-white focus:border-sky-500/30 transition-all">
                    <option value="id_card">National ID</option>
                    <option value="passport">Passport</option>
                    <option value="drivers_license">Driver's License</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={handleIssue} disabled={!name || !dateOfBirth}
                className="flex-1 py-4 text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl hover:from-emerald-400 hover:to-teal-500 shadow-lg shadow-emerald-500/10 active:scale-[0.98] transition-all">
                Confirm & Secure
              </button>
              <button onClick={() => setStage("idle")} className="px-6 py-4 text-sm font-bold text-slate-400 bg-white/5 hover:bg-white/10 rounded-2xl transition-all">
                Back
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

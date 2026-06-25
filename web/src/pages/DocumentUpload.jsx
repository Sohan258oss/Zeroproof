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
  const [extractionStatus, setExtractionStatus] = useState(null);
  const [extractionReason, setExtractionReason] = useState(null);

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
      setName(doc.attributes.name && doc.attributes.name !== "UNKNOWN" ? doc.attributes.name : "");
      setDateOfBirth(doc.attributes.dob || "");
      setDocumentType(doc.attributes.documentType || "id_card");
      setExtractionStatus(doc.attributes.status || "SUCCESS");
      setExtractionReason(doc.attributes.reason || null);
      
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
      // 1. Issue Credential
      const issueRes = await fetch(`${API}/v3/credentials/issue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            documentId: extractedDocId,
            overrides: { fullName: name, dateOfBirth, documentType }
        })
      });
      const issueData = await issueRes.json();
      if (!issueRes.ok) throw new Error(issueData.error?.message || "Credential issuance failed.");

      const cred = issueData.data.credential;

      // 2. Auto-generate Share Link
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
      <div className="min-h-screen bg-[#020204] text-[#e2fce8] flex items-center justify-center px-4 relative">
        <div className="fixed inset-0 pointer-events-none overflow-hidden bg-[linear-gradient(to_right,#00ff6606_1px,transparent_1px),linear-gradient(to_bottom,#00ff6606_1px,transparent_1px)] bg-[size:32px_32px]">
          <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-emerald-655 rounded-full mix-blend-screen filter blur-[180px] opacity-[0.04]" />
        </div>

        <div className="max-w-md w-full glass-panel rounded-2xl p-6 text-center animate-fade-in relative overflow-hidden shadow-2xl border-emerald-500/20">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-600 via-emerald-400 to-[#00ff66]" />
          <div className="w-12 h-12 mx-auto rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center mb-4 text-[#00ff66]">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
            </svg>
          </div>
          <h2 className="text-xs font-mono font-bold text-white uppercase tracking-widest mb-1">ZK_CREDENTIAL_ISSUED</h2>
          <p className="text-slate-500 text-[10px] font-medium mb-6">Identity parameters cryptographically signed and stored in client vault.</p>
          
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-[#020502] border border-emerald-950/80 rounded-xl p-3.5 text-left">
              <p className="text-[9px] text-slate-500 font-mono uppercase tracking-wider mb-1">CREDENTIAL_HOLDER</p>
              <p className="text-[11px] font-mono font-bold text-slate-100 truncate">{result.document.attributes.name}</p>
            </div>
            <div className="bg-[#020502] border border-emerald-950/80 rounded-xl p-3.5 text-left">
              <p className="text-[9px] text-slate-500 font-mono uppercase tracking-wider mb-1">STATUS</p>
              <p className="text-[11px] font-mono font-bold text-emerald-400 uppercase tracking-widest">ACTIVE</p>
            </div>
          </div>

          {shareLink && (
            <div className="bg-[#020502] border border-emerald-950/80 rounded-xl p-4 mb-6 text-left">
              <label className="text-[9px] text-slate-500 font-mono font-bold uppercase tracking-wider block mb-2">VERIFICATION_LINK</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-[#030804] px-3 py-2.5 rounded-lg border border-emerald-950 text-[10px] font-mono text-[#e2fce8] truncate">
                  {window.location.origin}{shareLink.verifyUrl}
                </div>
                <button onClick={copyLink} className={`px-4 py-2.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                  copied ? "bg-emerald-600 text-white font-extrabold" : "btn-cyber-secondary"
                }`}>
                  {copied ? "COPIED" : "COPY_LINK"}
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => navigate(`/vault/credential/${result.credential.id}`)} className="flex-1 py-2.5 rounded-xl btn-cyber-primary text-xs font-mono tracking-widest">
              MANAGE_CREDENTIAL
            </button>
            <button onClick={() => navigate("/vault")} className="px-5 py-2.5 rounded-xl btn-cyber-secondary text-xs font-mono tracking-widest">
              DASHBOARD
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020204] text-[#e2fce8] relative">
      <div className="fixed inset-0 pointer-events-none overflow-hidden bg-[linear-gradient(to_right,#00ff6606_1px,transparent_1px),linear-gradient(to_bottom,#00ff6606_1px,transparent_1px)] bg-[size:32px_32px]">
        <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-[#00ff66] rounded-full mix-blend-screen filter blur-[180px] opacity-[0.05] animate-float" />
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-emerald-600 rounded-full mix-blend-screen filter blur-[180px] opacity-[0.03]" />
      </div>

      <section className="relative pt-28 pb-16 px-4 sm:px-6 lg:px-8 max-w-xl mx-auto">
        <button onClick={() => navigate("/vault")} className="inline-flex items-center gap-1.5 text-[10px] font-mono text-emerald-300 hover:text-emerald-400 bg-emerald-950/20 border border-emerald-950 hover:border-emerald-500/20 px-3 py-1.5 rounded-lg mb-6 transition-all cursor-pointer">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          RETURN_TO_VAULT
        </button>

        <div className="mb-8 text-center sm:text-left">
          <h1 className="text-xl font-extrabold tracking-widest font-mono uppercase text-white">
            SECURE_UPLOAD_VAULT
          </h1>
          <p className="text-slate-400 text-xs mt-1.5 leading-relaxed font-medium">
            Upload identity document parameters to extract verification credentials. Scanning computations run locally.
          </p>
        </div>

        {/* --- STAGE: ERROR --- */}
        {stage === "error" && (
          <div className="glass-panel border-rose-500/30 bg-rose-500/5 rounded-2xl p-5 text-center mb-6 animate-fade-in shadow-2xl">
            <div className="w-10 h-10 bg-rose-500/10 text-rose-455 rounded-xl border border-rose-500/20 flex items-center justify-center mx-auto mb-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M15 9l-6 6M9 9l6 6"/></svg>
            </div>
            <p className="text-xs font-mono font-bold text-white uppercase tracking-widest mb-1">TRANSACTION_ABORTED</p>
            <p className="text-[10px] text-slate-400 font-mono mb-4">{error}</p>
            <button onClick={() => { setStage("idle"); setError(null); }} className="px-4 py-2 rounded-lg text-[10px] font-mono font-bold btn-cyber-secondary cursor-pointer">
              RESET_STAGE
            </button>
          </div>
        )}

        {/* --- STAGE: PROCESSING --- */}
        {uploading && (
          <div className="glass-panel border-emerald-500/15 bg-emerald-950/10 rounded-2xl p-10 text-center mb-6 animate-fade-in shadow-2xl">
            <div className="w-8 h-8 border border-emerald-500/20 border-t-emerald-455 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-xs font-mono font-bold text-[#00ff66] uppercase tracking-widest">
              {stage === "analyzing" ? "READING_DOCUMENT_OCR" : "PROVING_IDENTITY_STATE"}
            </p>
            <p className="text-[9px] text-slate-500 mt-2.5 font-mono tracking-widest uppercase font-semibold">LOCAL_SANDBOX_ISOLATED</p>
          </div>
        )}

        {/* --- STAGE: IDLE (Upload) --- */}
        {!uploading && stage === "idle" && (
          <div className="space-y-4 animate-fade-in-up">
            <div className="bg-emerald-950/10 border border-emerald-950/80 rounded-2xl p-2">
              <FileDropzone onFileSelect={setFile} disabled={uploading} />
            </div>
            <button onClick={handleScan} disabled={!file || uploading}
              className="w-full py-3 rounded-xl btn-cyber-primary text-xs font-mono tracking-widest active:scale-[0.98]">
              SCAN_AND_EXTRACT_PARAMETERS
            </button>
          </div>
        )}

        {/* --- STAGE: CONFIRMING --- */}
        {!uploading && stage === "confirming" && extractedDocId && (
          <div className="glass-panel border-emerald-500/15 rounded-2xl p-6 animate-fade-in-up shadow-2xl">
            <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-[#00ff66] mb-5">EXTRACTED_CLAIMS_VERIFICATION</h2>
            
            {extractionStatus && extractionStatus !== "SUCCESS" && (
              <div className="mb-5 p-3.5 rounded-xl border border-amber-500/25 bg-amber-500/5 text-amber-300 font-mono text-[10px] leading-relaxed shadow-lg animate-pulse-slow">
                <div className="flex gap-2.5 items-start">
                  <svg className="w-4 h-4 flex-shrink-0 text-amber-400 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <span className="font-bold text-amber-200 block uppercase mb-1">SCANNING_WARNING</span>
                    {extractionReason || "We couldn't extract all parameters automatically. The document image may be blurry, inverted, or poorly cropped. Please verify or input details manually."}
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-4 mb-6">
              <div className="space-y-1">
                <label className="text-[9px] text-slate-500 font-mono uppercase tracking-widest font-semibold ml-0.5">FULL_NAME</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  className="input-cyber w-full rounded-xl px-3 py-2.5 text-xs" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 font-mono uppercase tracking-widest font-semibold ml-0.5">DATE_OF_BIRTH</label>
                  <input type="text" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} placeholder="YYYY-MM-DD"
                    className="input-cyber w-full rounded-xl px-3 py-2.5 text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 font-mono uppercase tracking-widest font-semibold ml-0.5">DOCUMENT_TYPE</label>
                  <select value={documentType} onChange={e => setDocumentType(e.target.value)}
                    className="input-cyber w-full rounded-xl px-3 py-2.5 text-xs cursor-pointer">
                    <option value="id_card">National ID</option>
                    <option value="passport">Passport</option>
                    <option value="drivers_license">Driver's License</option>
                    <option value="grade_card">Grade Card</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={handleIssue} disabled={!name || !dateOfBirth}
                className="flex-1 py-2.5 rounded-xl btn-cyber-primary text-xs font-mono tracking-widest">
                CONFIRM_AND_SIGN
              </button>
              <button onClick={() => setStage("idle")} className="px-5 py-2.5 rounded-xl btn-cyber-secondary text-xs font-mono tracking-widest">
                BACK
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

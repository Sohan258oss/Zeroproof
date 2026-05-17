import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import ProofGenerator from "./components/ProofGenerator";
import ProofTimeline from "./components/ProofTimeline";
import VerificationBadge from "./components/VerificationBadge";
import StatsPanel from "./components/StatsPanel";
import ProofExplorer from "./components/ProofExplorer";
import { useProver } from "./hooks/useProver";

// Vault pages
import VaultDashboard from "./pages/VaultDashboard";
import DocumentUpload from "./pages/DocumentUpload";
import CredentialDetail from "./pages/CredentialDetail";
import PublicVerify from "./pages/PublicVerify";

function ZKDemo() {
  const {
    stage, stageInfo, progress, proofTime, result,
    error, rawProof, isProving, generateAndVerify, reset, STAGES
  } = useProver();

  const [proofCount, setProofCount] = useState(0);
  const [showExplorer, setShowExplorer] = useState(false);

  const handleGenerate = async (params) => {
    try {
      await generateAndVerify(params);
      setProofCount((c) => c + 1);
    } catch {
      // Error is already handled by useProver
    }
  };

  return (
    <>
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-sky-500 rounded-full mix-blend-multiply filter blur-[150px] opacity-[0.03] animate-float"></div>
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-600 rounded-full mix-blend-multiply filter blur-[150px] opacity-[0.04] animate-float-delayed"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-violet-600 rounded-full mix-blend-multiply filter blur-[200px] opacity-[0.02]"></div>
      </div>

      {/* Hero Section */}
      <section className="relative pt-28 pb-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-medium mb-6 animate-fade-in">
            <div className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse"></div>
            Zero-Knowledge Identity Protocol
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] mb-4 animate-fade-in-up">
            Prove who you are.
            <br />
            <span className="gradient-text">Reveal nothing.</span>
          </h1>
          <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed animate-fade-in-up-delayed">
            AegisID uses zero-knowledge proofs to verify your identity attributes
            without exposing personal data. The cryptography runs entirely in your browser.
          </p>
        </div>
      </section>

      {/* Main Dashboard */}
      <section className="relative px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pb-12">
        {/* Stats */}
        <div className="mb-6 animate-fade-in">
          <StatsPanel proofTime={proofTime} proofCount={proofCount} stage={stage} />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="animate-fade-in">
            <ProofGenerator onGenerate={handleGenerate} isProving={isProving} />
          </div>
          <div className="space-y-6 animate-fade-in">
            <ProofTimeline stage={stage} progress={progress} STAGES={STAGES} />
            <VerificationBadge result={result} error={error} proofTime={proofTime} stage={stage} />
          </div>
        </div>

        {/* Proof Explorer Toggle */}
        {(rawProof || result) && (
          <div className="animate-fade-in">
            <button
              id="toggle-explorer-btn"
              onClick={() => setShowExplorer(!showExplorer)}
              className="text-xs text-slate-500 hover:text-sky-400 font-medium tracking-wide flex items-center gap-1.5 transition-colors mb-4 group"
            >
              <svg className={`w-3 h-3 transition-transform ${showExplorer ? "rotate-90" : ""}`} viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
              <span className="group-hover:underline underline-offset-2">
                {showExplorer ? "Hide" : "Show"} Cryptographic Details
              </span>
            </button>
            {showExplorer && <ProofExplorer rawProof={rawProof} result={result} />}
          </div>
        )}

        {/* Reset Button */}
        {stage === "complete" || stage === "error" ? (
          <div className="mt-6 text-center animate-fade-in">
            <button
              id="reset-btn"
              onClick={reset}
              className="px-6 py-2 text-xs font-medium text-slate-400 hover:text-white border border-slate-700/50 hover:border-slate-600 rounded-xl transition-all hover:bg-white/5"
            >
              New Verification
            </button>
          </div>
        ) : null}
      </section>

      {/* Architecture Section */}
      <section id="arch" className="relative px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto py-16 border-t border-white/5">
        <h2 className="text-2xl font-bold text-white mb-8 tracking-tight">
          How It <span className="gradient-text">Works</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              step: "01",
              title: "Client-Side Proving",
              desc: "Your birth year stays in the browser. A PLONK proof is generated using WebAssembly — no data is sent to any server.",
              color: "from-sky-500 to-cyan-500"
            },
            {
              step: "02",
              title: "Server-Side Verification",
              desc: "Only the mathematical proof reaches our API. The verifier checks cryptographic validity in <50ms without knowing your age.",
              color: "from-indigo-500 to-violet-500"
            },
            {
              step: "03",
              title: "Nullifier Protection",
              desc: "A Poseidon hash prevents replay attacks. Each proof context generates a unique nullifier — no double-spending identity.",
              color: "from-violet-500 to-purple-500"
            }
          ].map((item) => (
            <div key={item.step} className="glass-panel rounded-2xl p-6 group hover:bg-slate-800/40 transition-all">
              <div className={`text-3xl font-black bg-gradient-to-r ${item.color} bg-clip-text text-transparent mb-3 opacity-40 group-hover:opacity-70 transition-opacity`}>
                {item.step}
              </div>
              <h3 className="text-base font-semibold text-white mb-2">{item.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span className="gradient-text font-bold">AegisID</span>
            <span>·</span>
            <span>Zero-Knowledge Identity Protocol</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-600">
            <span>PLONK · BN128 · Poseidon</span>
            <a href="https://github.com/Sohan258oss/Zeroproof" className="hover:text-sky-400 transition-colors" target="_blank" rel="noopener noreferrer">
              GitHub ↗
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}

function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      <Routes>
        <Route path="/" element={<ZKDemo />} />
        <Route path="/vault" element={<VaultDashboard />} />
        <Route path="/vault/upload" element={<DocumentUpload />} />
        <Route path="/vault/credential/:id" element={<CredentialDetail />} />
        <Route path="/verify/:token" element={<PublicVerify />} />
      </Routes>
    </div>
  );
}

export default App;

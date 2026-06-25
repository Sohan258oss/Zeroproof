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
      // Error is handled by useProver
    }
  };

  return (
    <div className="relative">
      {/* Sleek cryptographic mesh grid background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden bg-[linear-gradient(to_right,#00ff6606_1px,transparent_1px),linear-gradient(to_bottom,#00ff6606_1px,transparent_1px)] bg-[size:32px_32px]">
        <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-emerald-600 rounded-full mix-blend-screen filter blur-[180px] opacity-[0.05] animate-float" />
        <div className="absolute bottom-10 left-1/4 w-[700px] h-[700px] bg-emerald-500 rounded-full mix-blend-screen filter blur-[200px] opacity-[0.03]" />
        <div className="absolute top-1/3 left-1/3 w-[500px] h-[500px] bg-teal-600 rounded-full mix-blend-screen filter blur-[170px] opacity-[0.02]" />
      </div>

      {/* Hero Section */}
      <section className="relative pt-28 pb-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-b border-emerald-950/60">
        <div className="text-center sm:text-left flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 pb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-950/20 border border-emerald-500/15 text-emerald-400 text-[10px] font-mono uppercase tracking-wider mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Decentralized Identity Node
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-mono">
              AegisID <span className="text-emerald-400 font-sans">Prover</span>
            </h1>
            <p className="text-slate-400 text-xs mt-1.5 max-w-xl leading-relaxed">
              Verify identity criteria locally using PLONK ZK-SNARKs. Zero private data is sent to the verifier node; equations are evaluated client-side via browser WebAssembly.
            </p>
          </div>
          <div className="flex items-center gap-3.5 self-start sm:self-center">
            <span className="text-[10px] font-mono text-slate-500 tracking-wider">ENGINE STATE:</span>
            <span className="text-[10px] font-mono bg-emerald-950/20 border border-emerald-500/30 px-3 py-1 rounded text-emerald-400 uppercase tracking-widest shadow-[0_0_10px_rgba(0,255,102,0.08)]">
              {stageInfo.label}
            </span>
          </div>
        </div>
      </section>

      {/* Main Dashboard Grid */}
      <section className="relative px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto py-8">
        {/* Top Stats Banner */}
        <div className="mb-8">
          <StatsPanel proofTime={proofTime} proofCount={proofCount} stage={stage} />
        </div>

        {/* Proving Panel Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Proving Controller */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-black border border-emerald-950/85 rounded-2xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
              <ProofGenerator onGenerate={handleGenerate} isProving={isProving} />
            </div>

            {/* Verification status output */}
            <VerificationBadge result={result} error={error} proofTime={proofTime} stage={stage} />
          </div>

          {/* Cryptographic Pipeline Console */}
          <div className="lg:col-span-5 space-y-6">
            <ProofTimeline stage={stage} progress={progress} STAGES={STAGES} />
          </div>
        </div>

        {/* Monospace Proof Explorer */}
        {(rawProof || result) && (
          <div className="mt-8 pt-8 border-t border-emerald-950/60">
            <div className="flex items-center justify-between mb-4">
              <button
                id="toggle-explorer-btn"
                onClick={() => setShowExplorer(!showExplorer)}
                className="text-[10px] font-mono text-emerald-400/80 hover:text-emerald-355 uppercase tracking-widest flex items-center gap-2 transition-all group bg-emerald-950/25 border border-emerald-950/60 hover:border-emerald-500/20 px-3 py-1.5 rounded-lg cursor-pointer"
              >
                <svg className={`w-3 h-3 transition-transform duration-200 ${showExplorer ? "rotate-90 text-emerald-400" : "text-emerald-500"}`} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z"/>
                </svg>
                {showExplorer ? "Collapse" : "Expand"} Cryptographic Proof Payload
              </button>
            </div>
            {showExplorer && (
              <div className="animate-fade-in-up">
                <ProofExplorer rawProof={rawProof} result={result} />
              </div>
            )}
          </div>
        )}

        {/* Reset Action */}
        {(stage === "complete" || stage === "error") && (
          <div className="mt-8 text-center animate-fade-in">
            <button
              id="reset-btn"
              onClick={reset}
              className="btn-cyber-secondary px-6 py-2.5 rounded-xl text-xs"
            >
              RESET_PROVER_ENGINE
            </button>
          </div>
        )}
      </section>

      {/* Tech Specifications */}
      <section id="arch" className="relative px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto py-12 border-t border-emerald-950/60 mt-8">
        <h2 className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest mb-6">CRYPTOGRAPHIC ARCHITECTURE</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              step: "01",
              title: "Client-Side WASM Proofs",
              desc: "Proving calculations are computed within a background web worker context. Circuit configurations (wasm/zkey) run completely sandboxed inside the client's browser memory context."
            },
            {
              step: "02",
              title: "Zero-Knowledge Verify",
              desc: "AegisID verifier checks the mathematical proof polynomials under 50ms. The verifier confirms correctness without learning the underlying year value."
            },
            {
              step: "03",
              title: "Poseidon Hash Replay Protection",
              desc: "Nullifiers are deterministically derived from inputs using Poseidon constraints. Replaying verification logs is prevented by matching used nullifier states dynamically."
            }
          ].map((item) => (
            <div key={item.step} className="glass-panel p-6 rounded-2xl hover:border-emerald-500/20 transition-all duration-300 group shadow-lg">
              <div className="text-[10px] font-mono text-emerald-400 mb-2 font-bold">{item.step} / SECURE_NODE</div>
              <h3 className="text-xs font-mono font-bold text-slate-200 group-hover:text-white uppercase tracking-wider mb-2">{item.title}</h3>
              <p className="text-slate-400 text-[11px] leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-emerald-950/60 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[10px] text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-400">AegisID Node</span>
            <span>·</span>
            <span>Zero-Knowledge Identity verification system</span>
          </div>
          <div className="flex items-center gap-4">
            <span>PLONK · BN254 · POSEIDON</span>
            <a href="https://github.com/Sohan258oss/Zeroproof" className="hover:text-emerald-400 transition-colors" target="_blank" rel="noopener noreferrer">
              REPOSITORY ↗
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <div className="min-h-screen bg-[#020204] text-[#e2fce8] selection:bg-emerald-950/50 selection:text-emerald-300">
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

import { useState, useEffect } from 'react';
import * as snarkjs from 'snarkjs';

function App() {
  const [birthYear, setBirthYear] = useState('');
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [ageLimit, setAgeLimit] = useState(18);
  const [status, setStatus] = useState('Idle');
  const [proofTime, setProofTime] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [isProving, setIsProving] = useState(false);
  const [rawProof, setRawProof] = useState(null);
  const [showProof, setShowProof] = useState(false);

  const generateProof = async () => {
    setIsProving(true);
    setStatus('Generating Zero-Knowledge Proof (locally)...');
    setVerificationResult(null);
    setProofTime(null);
    
    try {
      if (!birthYear) throw new Error("Please enter your birth year");
      
      const startTime = performance.now();
      
      // Proving entirely in the browser using the WASM and zkey in public folder
      const { proof, publicSignals } = await snarkjs.plonk.fullProve(
        { 
          birthYear: Number(birthYear),
          currentYear: Number(currentYear),
          ageLimit: Number(ageLimit)
        }, 
        "/age_check.wasm", 
        "/circuit_final.zkey"
      );
      
      const endTime = performance.now();
      setProofTime((endTime - startTime).toFixed(2));
      setRawProof(proof);
      setStatus('Proof generated! Sending to Verifier API...');

      // Send to local Express backend (assuming it's running on 3000)
      const res = await fetch("http://localhost:3000/v1/verify-age", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proof, publicSignals })
      });

      const data = await res.json();
      setVerificationResult(data);
      setStatus(data.success ? 'Verification Successful!' : 'Verification Failed!');
      
    } catch (err) {
      console.error(err);
      setStatus('Error: ' + err.message);
    } finally {
      setIsProving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 to-slate-950 font-sans">
      <div className="w-full max-w-lg glass-panel rounded-3xl p-8 relative overflow-hidden">
        
        {/* Decorative background glow */}
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-sky-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>

        <div className="relative z-10">
          <h1 className="text-4xl font-extrabold mb-2 tracking-tight text-white mb-8">
            <span className="gradient-text">ZeroProof</span> Portal
          </h1>
          
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            Prove your age without revealing your birth year. The math happens locally in your browser, and only the proof is sent to the server.
          </p>

          <div className="space-y-5 mb-8">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Birth Year (Private Input)</label>
              <input
                type="number"
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
                placeholder="e.g. 1995"
                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all placeholder:text-slate-600"
              />
            </div>
            
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-500 mb-1">Current Year</label>
                <input
                  type="number"
                  value={currentYear}
                  disabled
                  className="w-full bg-slate-900/30 border border-transparent rounded-xl px-4 py-3 text-slate-500 cursor-not-allowed"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-400 mb-1">Age Required (Pub)</label>
                <input
                  type="number"
                  value={ageLimit}
                  onChange={(e) => setAgeLimit(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>
          </div>

          <button
            onClick={generateProof}
            disabled={isProving}
            className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all transform active:scale-[0.98] ${
              isProving 
                ? 'bg-slate-700 cursor-wait' 
                : 'bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 hover:shadow-indigo-500/25'
            }`}
          >
            {isProving ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing Cryptography...
              </span>
            ) : 'Generate & Verify ZK Proof'}
          </button>

          {/* Status Console */}
          <div className="mt-8 bg-slate-950 rounded-xl p-4 border border-slate-800 font-mono text-xs text-slate-400 h-32 overflow-y-auto">
            <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-800">
              <span className="text-slate-500 font-semibold tracking-wider">TERMINAL</span>
              {proofTime && <span className="text-sky-400">Proof time: {proofTime}ms</span>}
            </div>
            
            <div className={`mt-2 ${status.includes('Error') ? 'text-red-400' : 'text-emerald-400'}`}>
              &gt; {status}
            </div>

            {verificationResult && (
              <div className="mt-3 text-slate-300 whitespace-pre-wrap break-all">
                {JSON.stringify(verificationResult, null, 2)}
              </div>
            )}
          </div>

          {/* Cryptography Keys / Raw Proof Viewer */}
          {rawProof && (
            <div className="mt-4">
              <button 
                onClick={() => setShowProof(!showProof)}
                className="text-xs text-slate-400 hover:text-sky-400 font-medium tracking-wide flex items-center gap-1 transition-colors"
              >
                {showProof ? '▼ Hide' : '▶ Show'} Raw Cryptographic Proof
              </button>
              
              {showProof && (
                <div className="mt-2 bg-slate-950/80 rounded-xl p-4 border border-slate-700/50 overflow-hidden relative group">
                  <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => navigator.clipboard.writeText(JSON.stringify(rawProof, null, 2))}
                      className="bg-slate-800 hover:bg-slate-700 text-xs text-white px-2 py-1 rounded"
                    >
                      Copy
                    </button>
                  </div>
                  <pre className="text-[10px] text-emerald-400/80 font-mono tracking-tighter whitespace-pre-wrap break-all max-h-48 overflow-y-auto custom-scrollbar">
                    {JSON.stringify(rawProof, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default App;

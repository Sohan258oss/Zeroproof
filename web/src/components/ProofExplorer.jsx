import { useState } from "react";

export default function ProofExplorer({ rawProof, result }) {
  const [activeTab, setActiveTab] = useState("proof");

  if (!rawProof && !result) return null;

  const tabs = [
    { key: "proof", label: "Raw Proof" },
    { key: "signals", label: "Public Signals" },
    { key: "response", label: "API Response" },
  ];

  const getContent = () => {
    switch (activeTab) {
      case "proof":
        return rawProof ? JSON.stringify(rawProof, null, 2) : "No proof generated yet";
      case "signals":
        const signals = result?.data?.signals || result?.signals || {};
        return JSON.stringify(signals, null, 2);
      case "response":
        return result ? JSON.stringify(result, null, 2) : "No response yet";
      default:
        return "";
    }
  };

  const content = getContent();

  return (
    <div className="glass-panel rounded-2xl overflow-hidden animate-fade-in border-emerald-950/80">
      {/* Tab bar */}
      <div className="flex border-b border-emerald-950/60 bg-[#050f07]/30">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-4 py-3 text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === tab.key
                ? "text-emerald-400 bg-emerald-500/5 border-b-2 border-emerald-500"
                : "text-slate-500 hover:text-slate-350 hover:bg-emerald-950/20"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="relative group bg-[#020402]">
        {/* Copy button */}
        <button
          onClick={() => navigator.clipboard.writeText(content)}
          className="absolute top-3 right-3 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/30 text-[10px] font-mono text-emerald-400 px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all z-10 cursor-pointer"
        >
          COPY_DATA
        </button>

        <pre className="p-4 text-[10.5px] text-emerald-400/80 font-mono whitespace-pre-wrap break-all max-h-64 overflow-y-auto custom-scrollbar leading-relaxed">
          {content}
        </pre>
      </div>
    </div>
  );
}

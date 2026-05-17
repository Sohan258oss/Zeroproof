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
    <div className="glass-panel rounded-2xl overflow-hidden animate-fade-in">
      {/* Tab bar */}
      <div className="flex border-b border-white/5">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-4 py-3 text-xs font-medium tracking-wide transition-all ${
              activeTab === tab.key
                ? "text-sky-400 bg-sky-500/5 border-b-2 border-sky-500"
                : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.02]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="relative group">
        {/* Copy button */}
        <button
          onClick={() => navigator.clipboard.writeText(content)}
          className="absolute top-3 right-3 bg-slate-800 hover:bg-slate-700 text-xs text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all z-10 border border-slate-700/50"
        >
          Copy
        </button>

        <pre className="p-4 text-[11px] text-emerald-400/70 font-mono whitespace-pre-wrap break-all max-h-64 overflow-y-auto custom-scrollbar leading-relaxed">
          {content}
        </pre>
      </div>
    </div>
  );
}

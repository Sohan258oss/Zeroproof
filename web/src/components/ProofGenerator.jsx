import { useState } from "react";

export default function ProofGenerator({ onGenerate, isProving }) {
  const [birthYear, setBirthYear] = useState("");
  const [ageLimit, setAgeLimit] = useState(18);
  const [proofType, setProofType] = useState("age_check");
  const [maxAge, setMaxAge] = useState(65);
  const currentYear = new Date().getFullYear();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!birthYear) return;
    onGenerate({
      birthYear,
      currentYear,
      ageLimit,
      minAge: ageLimit,
      maxAge,
      proofType,
      secret: String(Math.floor(Math.random() * 1e18)),
      externalNullifier: String(Date.now())
    });
  };

  return (
    <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group" id="prove">
      {/* Decorative accent blur */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-emerald-600 rounded-full mix-blend-screen filter blur-3xl opacity-10 group-hover:opacity-20 transition-opacity duration-700"></div>
      <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-[#00ff66] rounded-full mix-blend-screen filter blur-3xl opacity-5 group-hover:opacity-10 transition-opacity duration-700"></div>

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
          <h2 className="text-base font-mono font-bold text-white tracking-wider uppercase">GENERATE_PROOF</h2>
        </div>
        <p className="text-xs text-slate-500 mb-5 font-medium">Identity claims are evaluated locally. Secret parameters never leave your memory context.</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Proof Type Selector */}
          <div>
            <label className="block text-[10px] font-mono font-bold text-slate-500 mb-2 tracking-widest uppercase">PROVING_SCHEME</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: "age_check", label: "Age Check", desc: "threshold verification" },
                { value: "range_check", label: "Range Check", desc: "bounded verification" },
              ].map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setProofType(type.value)}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    proofType === type.value
                      ? "border-emerald-500/40 bg-emerald-500/5 shadow-[0_0_15px_rgba(0,255,102,0.08)]"
                      : "border-emerald-950/80 bg-emerald-950/10 hover:border-emerald-500/20 text-slate-400"
                  }`}
                >
                  <div className={`text-xs font-mono font-bold uppercase ${proofType === type.value ? "text-emerald-400" : "text-slate-300"}`}>
                    {type.label}
                  </div>
                  <div className="text-[9px] font-mono text-slate-500 mt-1 uppercase tracking-wider">{type.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Birth Year */}
          <div>
            <label className="block text-[10px] font-mono font-bold text-slate-500 mb-2 tracking-widest uppercase" htmlFor="birth-year-input">
              Birth Year
              <span className="ml-1 text-emerald-400/80 text-[9px] font-mono lowercase tracking-wider">(private - stays local)</span>
            </label>
            <input
              id="birth-year-input"
              type="number"
              value={birthYear}
              onChange={(e) => setBirthYear(e.target.value)}
              placeholder="e.g. 1995"
              min="1900"
              max={currentYear}
              required
              className="input-cyber w-full rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-emerald-500/30 placeholder:text-slate-700"
            />
          </div>

          {/* Age Limit / Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-mono font-bold text-slate-500 mb-2 tracking-widest uppercase" htmlFor="age-limit-input">
                {proofType === "range_check" ? "Min Age" : "Age Required"}
                <span className="ml-1 text-emerald-400/80 text-[9px] font-mono lowercase tracking-wider">(public)</span>
              </label>
              <input
                id="age-limit-input"
                type="number"
                value={ageLimit}
                onChange={(e) => setAgeLimit(Number(e.target.value))}
                min="1"
                max="150"
                className="input-cyber w-full rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-emerald-500/30"
              />
            </div>
            {proofType === "range_check" ? (
              <div>
                <label className="block text-[10px] font-mono font-bold text-slate-500 mb-2 tracking-widest uppercase" htmlFor="max-age-input">
                  Max Age
                  <span className="ml-1 text-emerald-400/80 text-[9px] font-mono lowercase tracking-wider">(public)</span>
                </label>
                <input
                  id="max-age-input"
                  type="number"
                  value={maxAge}
                  onChange={(e) => setMaxAge(Number(e.target.value))}
                  min={ageLimit}
                  max="150"
                  className="input-cyber w-full rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-emerald-500/30"
                />
              </div>
            ) : (
              <div>
                <label className="block text-[10px] font-mono font-bold text-slate-500 mb-2 tracking-widest uppercase">Current Year</label>
                <input
                  type="number"
                  value={currentYear}
                  disabled
                  className="w-full bg-emerald-950/10 border border-transparent rounded-xl px-4 py-3 text-slate-600 text-sm cursor-not-allowed font-mono"
                />
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            id="generate-proof-btn"
            type="submit"
            disabled={isProving || !birthYear}
            className={`w-full py-3.5 rounded-xl font-mono text-xs font-bold uppercase tracking-widest transition-all ${
              isProving
                ? "bg-emerald-950/50 border border-emerald-900/60 text-emerald-500 cursor-wait"
                : !birthYear
                ? "bg-emerald-950/20 border border-emerald-950 text-slate-650 cursor-not-allowed"
                : "btn-cyber-primary shadow-[0_0_20px_rgba(0,255,102,0.15)] hover:shadow-[0_0_25px_rgba(0,255,102,0.25)]"
            }`}
          >
            {isProving ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4 text-emerald-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                COMPUTING_CONSTRAINTS...
              </span>
            ) : (
              "COMPILE_AND_PROVE"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

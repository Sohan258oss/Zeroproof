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
      {/* Decorative accent */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-sky-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 group-hover:opacity-20 transition-opacity duration-700"></div>

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></div>
          <h2 className="text-lg font-semibold text-white tracking-tight">Generate Proof</h2>
        </div>
        <p className="text-xs text-slate-500 mb-5">Your birth year never leaves this browser.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Proof Type Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 tracking-wide uppercase">Proof Type</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "age_check", label: "Age Check", desc: "≥ threshold" },
                { value: "range_check", label: "Range Check", desc: "min ≤ age ≤ max" },
              ].map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setProofType(type.value)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    proofType === type.value
                      ? "border-sky-500/50 bg-sky-500/10 shadow-lg shadow-sky-500/5"
                      : "border-slate-700/50 bg-slate-900/30 hover:border-slate-600"
                  }`}
                >
                  <div className={`text-sm font-medium ${proofType === type.value ? "text-sky-400" : "text-slate-300"}`}>
                    {type.label}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{type.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Birth Year */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 tracking-wide uppercase" htmlFor="birth-year-input">
              Birth Year
              <span className="ml-1 text-emerald-500/80 text-[9px] font-normal normal-case">(private — stays local)</span>
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
              className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50 transition-all placeholder:text-slate-600"
            />
          </div>

          {/* Age Limit / Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 tracking-wide uppercase" htmlFor="age-limit-input">
                {proofType === "range_check" ? "Min Age" : "Age Required"}
                <span className="ml-1 text-amber-500/80 text-[9px] font-normal normal-case">(public)</span>
              </label>
              <input
                id="age-limit-input"
                type="number"
                value={ageLimit}
                onChange={(e) => setAgeLimit(Number(e.target.value))}
                min="1"
                max="150"
                className="w-full bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
              />
            </div>
            {proofType === "range_check" ? (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 tracking-wide uppercase" htmlFor="max-age-input">
                  Max Age
                  <span className="ml-1 text-amber-500/80 text-[9px] font-normal normal-case">(public)</span>
                </label>
                <input
                  id="max-age-input"
                  type="number"
                  value={maxAge}
                  onChange={(e) => setMaxAge(Number(e.target.value))}
                  min={ageLimit}
                  max="150"
                  className="w-full bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5 tracking-wide uppercase">Current Year</label>
                <input
                  type="number"
                  value={currentYear}
                  disabled
                  className="w-full bg-slate-900/30 border border-transparent rounded-xl px-4 py-3 text-slate-600 text-sm cursor-not-allowed"
                />
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            id="generate-proof-btn"
            type="submit"
            disabled={isProving || !birthYear}
            className={`w-full py-3.5 rounded-xl font-semibold text-sm text-white shadow-lg transition-all transform active:scale-[0.98] ${
              isProving
                ? "bg-slate-700 cursor-wait"
                : !birthYear
                ? "bg-slate-800 cursor-not-allowed opacity-50"
                : "bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 hover:shadow-indigo-500/25 cursor-pointer"
            }`}
          >
            {isProving ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing Cryptography...
              </span>
            ) : (
              "Generate & Verify ZK Proof"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function StatsPanel({ proofTime, proofCount, stage }) {
  const stats = [
    {
      label: "Proof System",
      value: "PLONK",
      sub: "Universal Setup",
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      ),
      color: "text-sky-400"
    },
    {
      label: "Curve",
      value: "BN128",
      sub: "254-bit field",
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/><path d="M2 12h20"/>
          <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
        </svg>
      ),
      color: "text-indigo-400"
    },
    {
      label: "Last Proof",
      value: proofTime ? `${proofTime}ms` : "—",
      sub: proofTime ? "client-side" : "no proofs yet",
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
        </svg>
      ),
      color: "text-emerald-400"
    },
    {
      label: "Session Proofs",
      value: String(proofCount),
      sub: "this session",
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
        </svg>
      ),
      color: "text-amber-400"
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="glass-panel rounded-xl p-4 group hover:bg-slate-800/60 transition-colors"
        >
          <div className={`${stat.color} mb-2 opacity-60 group-hover:opacity-100 transition-opacity`}>
            {stat.icon}
          </div>
          <div className="text-lg font-bold text-white tracking-tight">{stat.value}</div>
          <div className="text-[11px] text-slate-400 font-medium">{stat.label}</div>
          <div className="text-[10px] text-slate-600 mt-0.5">{stat.sub}</div>
        </div>
      ))}
    </div>
  );
}

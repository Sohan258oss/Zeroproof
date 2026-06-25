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
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/5",
      borderColor: "border-emerald-500/10"
    },
    {
      label: "Curve",
      value: "BN254",
      sub: "Pairing-friendly",
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/><path d="M2 12h20"/>
          <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
        </svg>
      ),
      color: "text-emerald-500",
      bgColor: "bg-emerald-600/5",
      borderColor: "border-emerald-500/10"
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
      color: "text-cyan-400",
      bgColor: "bg-cyan-500/5",
      borderColor: "border-cyan-500/10"
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
      color: "text-[#00ff66]",
      bgColor: "bg-[#00ff66]/5",
      borderColor: "border-[#00ff66]/10"
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="glass-panel rounded-2xl p-5 group transition-all duration-300 hover:scale-[1.01]"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-mono text-slate-500 tracking-wider uppercase font-semibold">{stat.label}</span>
            <div className={`w-8 h-8 rounded-lg ${stat.bgColor} border ${stat.borderColor} ${stat.color} flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform`}>
              {stat.icon}
            </div>
          </div>
          <div className={`text-xl font-mono font-bold text-white tracking-tight ${stat.color}`}>{stat.value}</div>
          <div className="text-[10px] text-slate-500 mt-1 font-medium tracking-wide uppercase">{stat.sub}</div>
        </div>
      ))}
    </div>
  );
}

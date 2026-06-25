import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { label: "ZK PROVER", to: "/" },
    { label: "SECURE VAULT", to: "/vault" },
    { label: "DOCUMENTATION", to: "https://github.com/Sohan258oss/Zeroproof", external: true },
  ];

  const isActive = (to) => {
    if (to === "/") return location.pathname === "/";
    return location.pathname.startsWith(to);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#010204]/80 backdrop-blur-md border-b border-emerald-950/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded border border-emerald-500/30 bg-emerald-950/40 flex items-center justify-center text-emerald-400 font-mono font-bold text-sm tracking-tighter shadow-[0_0_10px_rgba(0,255,102,0.15)]">
              [Æ]
            </div>
            <span className="text-sm font-mono font-bold tracking-[0.2em] text-slate-100 group-hover:text-white transition-colors">
              AEGIS<span className="text-emerald-400">ID</span>
            </span>
            <span className="hidden sm:inline-block text-[9px] font-mono px-2 py-0.5 rounded border border-emerald-950/80 bg-emerald-950/20 text-emerald-500/70 uppercase tracking-widest">
              node-v3.0
            </span>
          </Link>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-2">
            {navLinks.map((item) =>
              item.external ? (
                <a key={item.label} href={item.to} target="_blank" rel="noopener noreferrer"
                  className="px-3 py-1 text-[11px] font-mono text-slate-400 hover:text-emerald-400 transition-colors tracking-wider">
                  {item.label}
                </a>
              ) : (
                <Link key={item.label} to={item.to}
                  className={`px-3 py-1 text-[11px] font-mono tracking-wider transition-all border-b-2 ${
                    isActive(item.to)
                      ? "text-emerald-400 border-emerald-500 font-bold"
                      : "text-slate-400 border-transparent hover:text-emerald-300 hover:border-emerald-900/40"
                  }`}>
                  {item.label}
                </Link>
              )
            )}
            <div className="ml-2 h-4 w-px bg-emerald-950/60"></div>
            <Link to="/vault/upload"
              className="ml-4 px-4 py-1.5 text-[11px] rounded-lg btn-cyber-primary active:scale-[0.97]">
              UPLOAD_DOC
            </Link>
          </div>

          {/* Mobile menu button */}
          <button onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-slate-400 hover:text-white rounded hover:bg-emerald-950/20 border border-transparent hover:border-emerald-950/60" aria-label="Toggle menu">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden pb-4 space-y-1 animate-fade-in border-t border-emerald-950/60 mt-1 pt-3">
            {navLinks.map((item) =>
              item.external ? (
                <a key={item.label} href={item.to} target="_blank" rel="noopener noreferrer"
                  className="block px-3 py-2 text-xs font-mono text-slate-400 hover:text-emerald-400 rounded hover:bg-emerald-950/10">
                  {item.label}
                </a>
              ) : (
                <Link key={item.label} to={item.to} onClick={() => setMobileOpen(false)}
                  className={`block px-3 py-2 text-xs font-mono rounded ${
                    isActive(item.to) ? "text-emerald-400 bg-emerald-950/20 font-bold" : "text-slate-400 hover:text-emerald-300 hover:bg-emerald-950/10"
                  }`}>
                  {item.label}
                </Link>
              )
            )}
            <Link to="/vault/upload" onClick={() => setMobileOpen(false)}
              className="block w-full mt-3 px-4 py-2 text-center text-xs font-mono rounded-lg btn-cyber-primary">
              UPLOAD DOCUMENT
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}

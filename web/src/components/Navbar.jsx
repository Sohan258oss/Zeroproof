import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { label: "ZK Demo", to: "/" },
    { label: "Vault", to: "/vault" },
    { label: "Docs", to: "https://github.com/Sohan258oss/Zeroproof", external: true },
  ];

  const isActive = (to) => {
    if (to === "/") return location.pathname === "/";
    return location.pathname.startsWith(to);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-slate-950/60 border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/30 transition-shadow">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              <span className="gradient-text">Aegis</span>ID
            </span>
            <span className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 tracking-wider">
              v3.0
            </span>
          </Link>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((item) =>
              item.external ? (
                <a key={item.label} href={item.to} target="_blank" rel="noopener noreferrer"
                  className="px-3 py-2 text-sm text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5">
                  {item.label}
                </a>
              ) : (
                <Link key={item.label} to={item.to}
                  className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                    isActive(item.to)
                      ? "text-white bg-white/5 font-medium"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}>
                  {item.label}
                </Link>
              )
            )}
            <div className="ml-3 h-6 w-px bg-white/10"></div>
            <Link to="/vault/upload"
              className="ml-3 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-sky-500 to-indigo-600 rounded-xl hover:from-sky-400 hover:to-indigo-500 transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 active:scale-[0.97]">
              Upload Doc
            </Link>
          </div>

          {/* Mobile menu button */}
          <button onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5" aria-label="Toggle menu">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
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
          <div className="md:hidden pb-4 space-y-1 animate-fade-in">
            {navLinks.map((item) =>
              item.external ? (
                <a key={item.label} href={item.to} target="_blank" rel="noopener noreferrer"
                  className="block px-3 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-white/5">
                  {item.label}
                </a>
              ) : (
                <Link key={item.label} to={item.to} onClick={() => setMobileOpen(false)}
                  className={`block px-3 py-2 text-sm rounded-lg ${
                    isActive(item.to) ? "text-white bg-white/5 font-medium" : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}>
                  {item.label}
                </Link>
              )
            )}
            <Link to="/vault/upload" onClick={() => setMobileOpen(false)}
              className="block w-full mt-2 px-4 py-2 text-sm font-medium text-center text-white bg-gradient-to-r from-sky-500 to-indigo-600 rounded-xl">
              Upload Document
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}

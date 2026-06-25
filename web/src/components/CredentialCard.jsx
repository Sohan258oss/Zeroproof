import { Link } from "react-router-dom";

export default function CredentialCard({ credential }) {
  const {
    id,
    credentialType,
    isEligible,
    hasZkProof,
    zkProofVerified,
    issuedAt,
    expiresAt,
    status,
    attributes
  } = credential;

  const isExpired = new Date(expiresAt) < new Date();
  const effectiveStatus = isExpired ? "expired" : status;

  const statusStyles = {
    active: {
      label: "Active",
      badgeClass: "bg-[#00ff66]/5 text-[#00ff66] border border-[#00ff66]/20",
      dotClass: "bg-[#00ff66] animate-pulse"
    },
    expired: {
      label: "Expired",
      badgeClass: "bg-amber-500/5 text-amber-400 border border-amber-500/20",
      dotClass: null
    },
    revoked: {
      label: "Revoked",
      badgeClass: "bg-rose-500/5 text-rose-500 border border-rose-500/20",
      dotClass: null
    }
  };

  const currentStyle = statusStyles[effectiveStatus] || statusStyles.active;

  const typeLabels = {
    age_verification: "Age Verification",
    identity: "Identity Document",
    address: "Address Verification"
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <Link
      to={`/vault/credential/${id}`}
      className="credential-card glass-panel rounded-2xl p-5 block group transition-all duration-300 hover:scale-[1.01] hover:border-[#00ff66]/25 hover:shadow-[0_0_20px_rgba(0,255,102,0.06)]"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          {/* Credential type icon */}
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
            isEligible
              ? "bg-emerald-500/10 border-emerald-500/20 text-[#00ff66]"
              : "bg-rose-500/10 border-rose-500/20 text-rose-500"
          }`}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              {isEligible && <polyline points="9 12 11 14 15 10" />}
              {!isEligible && <><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></>}
            </svg>
          </div>
          <div>
            <p className="text-xs font-mono font-bold text-white group-hover:text-[#00ff66] transition-colors uppercase tracking-wider">
              {typeLabels[credentialType] || credentialType}
            </p>
            <p className="text-[10px] text-emerald-500/60 font-mono mt-0.5">{id.slice(0, 8)}</p>
          </div>
        </div>

        {/* Status badge */}
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-mono font-bold tracking-wider uppercase ${currentStyle.badgeClass}`}>
          {currentStyle.dotClass && <span className={`w-1.5 h-1.5 rounded-full ${currentStyle.dotClass}`} />}
          {currentStyle.label}
        </span>
      </div>

      {/* Attributes */}
      <div className="space-y-2 mb-4 bg-emerald-950/10 p-3 rounded-xl border border-emerald-950/30">
        {attributes?.fullName && (
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest font-semibold">Holder</span>
            <span className="text-xs text-slate-350 font-medium">{attributes.fullName}</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest font-semibold">Eligible</span>
          <span className={`text-xs font-mono font-bold ${isEligible ? "text-[#00ff66]" : "text-rose-550"}`}>
            {isEligible ? "YES ✓" : "NO ✗"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest font-semibold">ZK Proof</span>
          <span className={`text-xs font-mono font-semibold ${hasZkProof && zkProofVerified ? "text-[#00ff66]" : "text-slate-500"}`}>
            {hasZkProof ? (zkProofVerified ? "VERIFIED ✓" : "INVALID") : "PENDING"}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-emerald-950/60 flex items-center justify-between">
        <span className="text-[9px] font-mono text-slate-500 uppercase">ISSUED {formatDate(issuedAt)}</span>
        <span className="text-[9.5px] font-mono font-bold text-[#00ff66] group-hover:text-emerald-450 tracking-wider uppercase transition-colors flex items-center gap-1.5">
          VIEW_DETAILS
          <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </span>
      </div>
    </Link>
  );
}

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

  const statusConfig = {
    active: { label: "Active", color: "emerald", dot: true },
    expired: { label: "Expired", color: "amber", dot: false },
    revoked: { label: "Revoked", color: "red", dot: false }
  };

  const { label: statusLabel, color: statusColor, dot: showDot } =
    statusConfig[effectiveStatus] || statusConfig.active;

  const typeLabels = {
    age_verification: "Age Verification",
    identity: "Identity",
    address: "Address Proof"
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <Link
      to={`/vault/credential/${id}`}
      className="credential-card glass-panel rounded-2xl p-5 block group hover:bg-slate-800/40 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/5 hover:border-white/10"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Credential type icon */}
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isEligible
              ? "bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-400"
              : "bg-gradient-to-br from-red-500/20 to-orange-500/20 text-red-400"
          }`}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              {isEligible && <polyline points="9 12 11 14 15 10" />}
              {!isEligible && <><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></>}
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-white group-hover:text-sky-100 transition-colors">
              {typeLabels[credentialType] || credentialType}
            </p>
            <p className="text-[11px] text-slate-500 font-mono">{id.slice(0, 8)}...</p>
          </div>
        </div>

        {/* Status badge */}
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-${statusColor}-500/10 text-${statusColor}-400 border border-${statusColor}-500/20`}>
          {showDot && <span className={`w-1.5 h-1.5 rounded-full bg-${statusColor}-400 animate-pulse`} />}
          {statusLabel}
        </span>
      </div>

      {/* Attributes */}
      <div className="space-y-2 mb-4">
        {attributes?.fullName && (
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-600 uppercase tracking-wider">Holder</span>
            <span className="text-xs text-slate-300 font-medium">{attributes.fullName}</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-600 uppercase tracking-wider">Eligible</span>
          <span className={`text-xs font-semibold ${isEligible ? "text-emerald-400" : "text-red-400"}`}>
            {isEligible ? "Yes ✓" : "No ✗"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-600 uppercase tracking-wider">ZK Proof</span>
          <span className={`text-xs font-medium ${hasZkProof && zkProofVerified ? "text-sky-400" : "text-slate-500"}`}>
            {hasZkProof ? (zkProofVerified ? "Verified ✓" : "Invalid") : "Pending"}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-white/5 flex items-center justify-between">
        <span className="text-[10px] text-slate-600">Issued {formatDate(issuedAt)}</span>
        <span className="text-[10px] text-sky-500 font-medium group-hover:text-sky-400 transition-colors flex items-center gap-1">
          View Details
          <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </span>
      </div>
    </Link>
  );
}

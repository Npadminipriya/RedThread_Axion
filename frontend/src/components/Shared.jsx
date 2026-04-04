import { Clock, AlertTriangle, CheckCircle, XCircle, PhoneCall, Loader } from 'lucide-react';

const statusConfig = {
  pending: { icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/30', label: 'Pending' },
  matching: { icon: Loader, color: 'text-sky-400', bg: 'bg-sky-500/20', border: 'border-sky-500/30', label: 'Matching' },
  matched: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', label: 'Matched' },
  fulfilled: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', label: 'Fulfilled' },
  escalated: { icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/30', label: 'Escalated' },
  cancelled: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30', label: 'Cancelled' },
  called: { icon: PhoneCall, color: 'text-sky-400', bg: 'bg-sky-500/20', border: 'border-sky-500/30', label: 'Called' },
  accepted: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', label: 'Accepted' },
  rejected: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30', label: 'Rejected' },
  no_response: { icon: Clock, color: 'text-gray-400', bg: 'bg-gray-500/20', border: 'border-gray-500/30', label: 'No Response' },
  approved: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', label: 'Approved' },
};

export function StatusBadge({ status }) {
  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.color} border ${config.border}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

export function UrgencyBadge({ urgency }) {
  const configs = {
    normal: { color: 'text-sky-400', bg: 'bg-sky-500/20', border: 'border-sky-500/30' },
    urgent: { color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/30' },
    critical: { color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30' },
  };
  const c = configs[urgency] || configs.normal;
  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${c.bg} ${c.color} border ${c.border} uppercase tracking-wider`}>
      {urgency === 'critical' && <AlertTriangle className="w-3 h-3" />}
      {urgency}
    </span>
  );
}

export function BloodGroupBadge({ group }) {
  const isRare = ['AB-', 'B-', 'A-', 'O-'].includes(group);
  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-bold
      ${isRare ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30' : 'bg-dark-700 text-dark-200 border border-dark-600'}`}>
      🩸 {group}
      {isRare && <span className="text-[10px] ml-1 opacity-70">RARE</span>}
    </span>
  );
}

export function BlockchainBadge({ hash }) {
  if (!hash) return null;
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-violet-500/20 text-violet-400 border border-violet-500/30">
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      </svg>
      Blockchain Verified
    </span>
  );
}

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-dark-700 rounded-full" />
        <div className="absolute inset-0 w-16 h-16 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-dark-800 border border-dark-700 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-dark-500" />
      </div>
      <h3 className="text-lg font-semibold text-dark-300 mb-1">{title}</h3>
      <p className="text-sm text-dark-500 max-w-sm">{description}</p>
    </div>
  );
}

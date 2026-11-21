import { ReactNode } from "react";
export const Spinner = ({ label = "Loading" }: { label?: string }) => (
  <div className="flex items-center justify-center gap-3 py-16 text-sm text-ink-500" role="status">
    <span className="h-5 w-5 animate-spin rounded-full border-2 border-ink-200 border-t-ink" aria-hidden />{label}
  </div>
);
export const ErrorBox = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <div className="card mx-auto max-w-lg p-6 text-center" role="alert">
    <p className="font-display text-lg font-bold">Something is not working</p>
    <p className="mt-1 text-sm text-ink-500">{message}</p>
    {onRetry && <button className="btn-primary mt-4" onClick={onRetry}>Try again</button>}
  </div>
);
export const Empty = ({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) => (
  <div className="card mx-auto max-w-lg p-8 text-center">
    <p className="font-display text-lg font-bold">{title}</p>
    {hint && <p className="mt-1 text-sm text-ink-500">{hint}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);
export const Skeleton = ({ className = "" }: { className?: string }) => <div className={`animate-pulse rounded-lg bg-ink-100 ${className}`} />;
export const StatusBadge = ({ status }: { status: string }) => {
  const tone: Record<string, string> = {
    placed: "bg-[#ECEAE2] text-[#B84A27] border-[#B84A27]/30",
    confirmed: "bg-[#ECEAE2] text-[#1B4332] border-[#1B4332]/30",
    shipped: "bg-[#ECEAE2] text-[#5A5852] border-[#E4E2DA]",
    delivered: "bg-[#ECEAE2] text-[#1B4332] border-[#1B4332]/30",
    cancelled: "bg-[#ECEAE2] text-[#8E8A82] border-[#E4E2DA]",
  };
  return <span className={`inline-block rounded-[2px] border px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wider ${tone[status] || "bg-[#ECEAE2] text-ink-secondary border-paper-grid"}`}>{status}</span>;
};

import { useEffect, useState } from "react";
import { api, inrPaise, when } from "../../api";
import { ErrorBox, Spinner } from "../../components/ui";

const Tile = ({ label, value, hint }: { label: string; value: string | number; hint?: string }) => (
  <div className="card p-4"><p className="text-xs font-semibold text-ink-500">{label}</p><p className="mt-1 font-display text-3xl font-bold">{value}</p>{hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}</div>
);
const Svc = ({ name, s }: { name: string; s?: any }) => (
  <li className="flex items-start justify-between gap-3 py-2.5 text-sm">
    <span className="font-semibold">{name}</span>
    {!s ? <span className="text-ink-500">Checking…</span> : s.ok
      ? <span className="font-semibold text-stock-ok">Connected{s.topics ? ` · ${s.topics.length} topics` : ""}{s.documents != null ? ` · ${s.documents} indexed` : ""}{s.status ? ` · ${s.status}` : ""}</span>
      : <span className="max-w-xs text-right font-semibold text-stock-out" title={s.error}>Not reachable</span>}
  </li>
);

export default function Dashboard() {
  const [s, setS] = useState<any>(null), [h, setH] = useState<any>(null), [alerts, setAlerts] = useState<any[]>([]), [err, setErr] = useState<string | null>(null);
  const load = () => {
    api("/admin/stats").then(setS).catch((e) => setErr(e.message));
    api("/admin/health").then(setH).catch(() => setH(null));
    api("/admin/alerts").then(setAlerts).catch(() => {});
  };
  useEffect(() => { load(); const t = setInterval(load, 8000); return () => clearInterval(t); }, []);
  if (err) return <ErrorBox message={err} onRetry={load} />;
  if (!s) return <Spinner />;
  const maxRev = Math.max(1, ...s.daily.map((d: any) => d.revenue_paise));
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Overview</h1>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tile label="Orders (excl. cancelled)" value={s.orders} />
        <Tile label="Revenue" value={inrPaise(s.revenuePaise)} />
        <Tile label="Low or empty stock lines" value={s.lowStock} hint="10 units or fewer in a city" />
        <Tile label="Events waiting for Kafka" value={s.outbox.pending} hint={`${s.outbox.total} events written in total`} />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-2">
          <h2 className="text-lg font-bold">Daily revenue</h2><p className="mb-4 text-xs text-ink-500">Built by the analytics consumer from Kafka order events</p>
          {s.daily.length === 0 ? <p className="py-8 text-center text-sm text-ink-500">No analytics yet. Place an order with the worker running.</p> : (
            <div className="flex h-40 items-end gap-2">{s.daily.map((d: any) => (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-1" title={`${d.day}: ${inrPaise(d.revenue_paise)}, ${d.orders} orders`}>
                <div className="w-full rounded-t bg-ink" style={{ height: `${Math.max(4, (d.revenue_paise / maxRev) * 100)}%` }} /><span className="text-[10px] text-ink-500">{d.day.slice(5)}</span></div>))}</div>)}
        </section>
        <section className="card p-5">
          <h2 className="text-lg font-bold">Service connections</h2>
          <ul className="divide-y divide-ink-100"><Svc name="PostgreSQL" s={h?.postgres} /><Svc name="Kafka" s={h?.kafka} /><Svc name="OpenSearch" s={h?.opensearch} /></ul>
          <button className="btn-ghost mt-3 w-full" onClick={async () => { const r = await api("/admin/reindex", { method: "POST" }); alert(`${r.queued} products queued for re-indexing via Kafka.`); }}>Rebuild search index</button>
        </section>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card p-5"><h2 className="mb-2 text-lg font-bold">Top products</h2>
          {s.topProducts.length ? <ol className="space-y-2 text-sm">{s.topProducts.map((p: any) => <li key={p.name} className="flex justify-between gap-3"><span className="truncate">{p.name}</span><b>{p.units}</b></li>)}</ol> : <p className="text-sm text-ink-500">No sales yet.</p>}</section>
        <section className="card p-5"><h2 className="mb-2 text-lg font-bold">Orders by status</h2>
          <ul className="space-y-2 text-sm">{s.byStatus.map((r: any) => <li key={r.status} className="flex justify-between capitalize"><span>{r.status}</span><b>{r.count}</b></li>)}</ul></section>
        <section className="card p-5"><h2 className="mb-2 text-lg font-bold">Stock alerts</h2>
          {alerts.length ? <ul className="space-y-2 text-sm">{alerts.slice(0, 6).map((a) => <li key={a.id}><b className={a.level === "out" ? "text-stock-out" : "text-stock-low"}>{a.level === "out" ? "Sold out" : `${a.quantity} left`}</b> · {a.name}, {a.city}<span className="block text-xs text-ink-500">{when(a.created_at)}</span></li>)}</ul> : <p className="text-sm text-ink-500">Alerts appear when the inventory consumer sees stock running low.</p>}</section>
      </div>
    </div>
  );
}

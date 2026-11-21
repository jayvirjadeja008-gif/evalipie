import { useEffect, useState } from "react";
import { api, when } from "../../api";
import { ErrorBox, Spinner } from "../../components/ui";

export default function AdminEvents() {
  const [d, setD] = useState<any>(null), [err, setErr] = useState<string | null>(null);
  const load = () => api("/admin/events").then(setD).catch((e) => setErr(e.message));
  useEffect(() => { load(); const t = setInterval(load, 4000); return () => clearInterval(t); }, []);
  if (err) return <ErrorBox message={err} onRetry={load} />;
  if (!d) return <Spinner />;
  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold">Event pipeline</h1><p className="text-sm text-ink-500">Every change is written to the outbox in the same database transaction, published to Kafka, then handled by each consumer. Refreshes every 4 seconds.</p></div>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {["order-confirmation", "inventory-alerts", "search-sync", "order-analytics"].map((c) => {
          const r = d.perConsumer.find((x: any) => x.consumer === c);
          return <div key={c} className="card p-4"><p className="text-xs font-semibold text-ink-500">{c}</p><p className="font-display text-3xl font-bold">{r?.processed ?? 0}</p><p className="text-xs text-ink-500">events processed{r ? ` · last #${r.last_event}` : ""}</p></div>;
        })}
      </section>
      <section><h2 className="mb-2 text-lg font-bold">Outbox (published to Kafka)</h2>
        <div className="card overflow-x-auto"><table className="w-full"><thead className="border-b border-ink-100"><tr><th className="th">#</th><th className="th">Event</th><th className="th">Topic</th><th className="th">Key</th><th className="th">Created</th><th className="th">Kafka</th></tr></thead>
          <tbody className="divide-y divide-ink-100">{d.outbox.map((e: any) => (
            <tr key={e.id}><td className="td">{e.id}</td><td className="td font-semibold">{e.type}</td><td className="td text-ink-500">{e.topic}</td><td className="td">{e.key}</td><td className="td text-ink-500">{when(e.created_at)}</td>
              <td className="td">{e.published_at ? <span className="font-semibold text-stock-ok">Published</span> : <span className="font-semibold text-stock-low" title={e.last_error || ""}>Waiting{e.attempts ? ` · ${e.attempts} failed tries` : ""}</span>}</td></tr>))}</tbody></table></div></section>
      <section><h2 className="mb-2 text-lg font-bold">Consumer activity</h2>
        <div className="card overflow-x-auto"><table className="w-full"><thead className="border-b border-ink-100"><tr><th className="th">Processed</th><th className="th">Consumer</th><th className="th">Event</th><th className="th">Event #</th></tr></thead>
          <tbody className="divide-y divide-ink-100">{d.processed.map((e: any, i: number) => <tr key={i}><td className="td text-ink-500">{when(e.processed_at)}</td><td className="td font-semibold">{e.consumer}</td><td className="td">{e.type}</td><td className="td">{e.eventId}</td></tr>)}
            {d.processed.length === 0 && <tr><td className="td text-ink-500" colSpan={4}>No consumer has processed an event yet. Start the worker (npm run worker) with Kafka reachable.</td></tr>}</tbody></table></div></section>
    </div>
  );
}

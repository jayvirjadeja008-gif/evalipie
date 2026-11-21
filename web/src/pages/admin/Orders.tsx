import { useEffect, useState } from "react";
import { api, inrPaise, when } from "../../api";
import { useApp } from "../../store";
import { Empty, ErrorBox, Spinner, StatusBadge } from "../../components/ui";

export default function AdminOrders() {
  const { toast } = useApp();
  const [rows, setRows] = useState<any[] | null>(null), [err, setErr] = useState<string | null>(null), [status, setStatus] = useState("");
  const load = () => api<any[]>(`/admin/orders${status ? `?status=${status}` : ""}`).then(setRows).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, [status]); // eslint-disable-line
  const set = async (id: number, s: string) => {
    if (s === "cancelled" && !confirm(`Cancel order #${id} and return its stock?`)) return;
    try { await api(`/admin/orders/${id}/status`, { method: "PUT", body: { status: s } }); toast(`Order #${id} marked ${s}`); load(); } catch (e: any) { toast(e.message, "error"); }
  };
  if (err) return <ErrorBox message={err} onRetry={load} />;
  if (!rows) return <Spinner />;
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between"><h1 className="text-3xl font-bold">Orders</h1>
        <select className="input !w-auto" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status"><option value="">All statuses</option>{["placed", "confirmed", "shipped", "delivered", "cancelled"].map((s) => <option key={s}>{s}</option>)}</select></div>
      {rows.length === 0 ? <Empty title="No orders" hint="Orders show up here as soon as customers check out." /> : (
        <div className="card overflow-x-auto"><table className="w-full"><thead className="border-b border-ink-100"><tr><th className="th">Order</th><th className="th">Customer</th><th className="th">Items</th><th className="th">Total</th><th className="th">Status</th><th className="th">Update</th></tr></thead>
          <tbody className="divide-y divide-ink-100">{rows.map((o) => (
            <tr key={o.id}><td className="td"><b>#{o.id}</b><p className="text-xs text-ink-500">{when(o.created_at)} · {o.city}</p></td><td className="td">{o.customer}<p className="text-xs text-ink-500">{o.email}</p></td>
              <td className="td max-w-xs text-ink-700">{o.items.map((i: any) => `${i.quantity}× ${i.name}`).join(", ")}</td><td className="td font-semibold">{inrPaise(o.total_paise)}</td><td className="td"><StatusBadge status={o.status} /></td>
              <td className="td">{o.status !== "cancelled" && <select className="input !w-auto !py-1.5" value="" onChange={(e) => e.target.value && set(o.id, e.target.value)} aria-label={`Update order ${o.id}`}><option value="">Change…</option>{["confirmed", "shipped", "delivered", "cancelled"].filter((s) => s !== o.status).map((s) => <option key={s}>{s}</option>)}</select>}</td></tr>))}</tbody></table></div>)}
    </div>
  );
}

import { useEffect, useState } from "react";
import { api, when } from "../../api";
import { useApp } from "../../store";
import { Empty, ErrorBox, Spinner } from "../../components/ui";
import { StockMeter } from "../../components/StockMeter";

export default function AdminInventory() {
  const { toast } = useApp();
  const [rows, setRows] = useState<any[] | null>(null), [mov, setMov] = useState<any[]>([]), [err, setErr] = useState<string | null>(null), [low, setLow] = useState(false);
  const [edit, setEdit] = useState<Record<string, string>>({});
  const [prods, setProds] = useState<any[]>([]), [add, setAdd] = useState({ productId: 0, city: "Bengaluru", quantity: 10 });
  const load = () => {
    api<any[]>(`/admin/inventory${low ? "?lowOnly=1" : ""}`).then(setRows).catch((e) => setErr(e.message));
    api<any[]>("/admin/inventory/movements").then(setMov).catch(() => {});
    api<any[]>("/admin/products").then((p) => { setProds(p.filter((x) => x.active)); setAdd((a) => ({ ...a, productId: a.productId || p[0]?.id || 0 })); });
  };
  useEffect(load, [low]); // eslint-disable-line
  const put = async (productId: number, city: string, quantity: number) => {
    try { await api("/admin/inventory", { method: "PUT", body: { productId, city, quantity } }); toast("Stock updated"); setEdit({}); load(); } catch (e: any) { toast(e.message, "error"); }
  };
  if (err) return <ErrorBox message={err} onRetry={load} />;
  if (!rows) return <Spinner />;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-3xl font-bold">Inventory</h1>
        <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={low} onChange={(e) => setLow(e.target.checked)} />Only low stock (10 or fewer)</label></div>
      <form className="card flex flex-wrap items-end gap-3 p-4" onSubmit={(e) => { e.preventDefault(); put(add.productId, add.city, add.quantity); }}>
        <label className="min-w-48 flex-1 text-sm font-medium">Product<select className="input mt-1" value={add.productId} onChange={(e) => setAdd({ ...add, productId: Number(e.target.value) })}>{prods.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <label className="text-sm font-medium">City<select className="input mt-1" value={add.city} onChange={(e) => setAdd({ ...add, city: e.target.value })}>{["Bengaluru", "Mumbai", "Delhi", "Chennai", "Hyderabad", "Pune"].map((c) => <option key={c}>{c}</option>)}</select></label>
        <label className="w-28 text-sm font-medium">Units<input className="input mt-1" type="number" min={0} value={add.quantity} onChange={(e) => setAdd({ ...add, quantity: Number(e.target.value) })} /></label>
        <button className="btn-primary">Set stock</button></form>
      {rows.length === 0 ? <Empty title="Nothing to show" hint="No inventory lines match this filter." /> : (
        <div className="card overflow-x-auto"><table className="w-full"><thead className="border-b border-ink-100"><tr><th className="th">Product</th><th className="th">City</th><th className="th">Level</th><th className="th">Units</th><th className="th">Updated</th></tr></thead>
          <tbody className="divide-y divide-ink-100">{rows.map((r) => { const k = `${r.productId}-${r.city}`; return (
            <tr key={k}><td className="td font-semibold">{r.name}</td><td className="td">{r.city}</td><td className="td"><StockMeter qty={r.quantity} city={r.city} compact /></td>
              <td className="td"><div className="flex items-center gap-2">
                <input className="input !w-20 !py-1.5" type="number" min={0} aria-label={`Units for ${r.name} in ${r.city}`} value={edit[k] ?? r.quantity} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} />
                {edit[k] !== undefined && Number(edit[k]) !== r.quantity && <button className="btn-accent !px-3 !py-1.5" onClick={() => put(r.productId, r.city, Number(edit[k]))}>Save</button>}</div></td>
              <td className="td text-ink-500">{when(r.updated_at)}</td></tr>); })}</tbody></table></div>)}
      <section><h2 className="mb-2 text-lg font-bold">Recent inventory changes</h2>
        <div className="card overflow-x-auto"><table className="w-full"><thead className="border-b border-ink-100"><tr><th className="th">When</th><th className="th">Product</th><th className="th">City</th><th className="th">Change</th><th className="th">After</th><th className="th">Reason</th></tr></thead>
          <tbody className="divide-y divide-ink-100">{mov.slice(0, 25).map((m) => <tr key={m.id}><td className="td text-ink-500">{when(m.created_at)}</td><td className="td">{m.name}</td><td className="td">{m.city}</td>
            <td className={`td font-semibold ${m.delta < 0 ? "text-stock-out" : "text-stock-ok"}`}>{m.delta > 0 ? "+" : ""}{m.delta}</td><td className="td">{m.quantityAfter}</td><td className="td">{m.reason.replace("_", " ")}{m.orderId ? ` · order #${m.orderId}` : ""}</td></tr>)}</tbody></table></div></section>
    </div>
  );
}

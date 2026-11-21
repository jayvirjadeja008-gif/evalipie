import { FormEvent, useEffect, useState } from "react";
import { api, inr } from "../../api";
import { useApp } from "../../store";
import { Empty, ErrorBox, Spinner } from "../../components/ui";
import type { Category } from "../../types";

interface Row { id: number; sku: string; name: string; brand: string; description: string; category_id: number; category_name: string; price: number; image_url: string; active: boolean; total_stock: number }
const blank = { id: 0, sku: "", name: "", brand: "", description: "", categoryId: 0, price: 0, imageUrl: "" };

export default function AdminProducts() {
  const { toast } = useApp();
  const [rows, setRows] = useState<Row[] | null>(null), [cats, setCats] = useState<Category[]>([]), [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState<typeof blank | null>(null), [newCat, setNewCat] = useState("");
  const load = () => { api<Row[]>("/admin/products").then(setRows).catch((e) => setErr(e.message)); api<Category[]>("/categories").then(setCats); };
  useEffect(load, []);

  async function save(e: FormEvent) {
    e.preventDefault(); if (!form) return;
    const body = { sku: form.sku, name: form.name, brand: form.brand, description: form.description, categoryId: Number(form.categoryId), price: Number(form.price), imageUrl: form.imageUrl || null };
    try {
      await api(form.id ? `/admin/products/${form.id}` : "/admin/products", { method: form.id ? "PUT" : "POST", body });
      toast(form.id ? "Product updated" : "Product added"); setForm(null); load();
    } catch (e: any) { toast(e.message, "error"); }
  }
  const act = async (path: string, method: string, msg: string) => { try { await api(path, { method }); toast(msg); load(); } catch (e: any) { toast(e.message, "error"); } };

  if (err) return <ErrorBox message={err} onRetry={load} />;
  if (!rows) return <Spinner />;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-3xl font-bold">Products</h1>
        <button className="btn-primary" onClick={() => setForm({ ...blank, categoryId: cats[0]?.id ?? 0 })}>Add product</button></div>
      <form className="flex gap-2" onSubmit={async (e) => { e.preventDefault(); try { await api("/admin/categories", { method: "POST", body: { name: newCat } }); toast("Category added"); setNewCat(""); load(); } catch (e: any) { toast(e.message, "error"); } }}>
        <input className="input max-w-xs" placeholder="New category name" value={newCat} onChange={(e) => setNewCat(e.target.value)} aria-label="New category name" /><button className="btn-ghost" disabled={newCat.length < 2}>Add category</button></form>
      {rows.length === 0 ? <Empty title="No products yet" hint="Add your first product to publish it to the storefront." /> : (
        <div className="card overflow-x-auto"><table className="w-full"><thead className="border-b border-ink-100"><tr><th className="th">Product</th><th className="th">Category</th><th className="th">Price</th><th className="th">Stock</th><th className="th" /></tr></thead>
          <tbody className="divide-y divide-ink-100">{rows.map((r) => (
            <tr key={r.id} className={r.active ? "" : "opacity-50"}>
              <td className="td"><div className="flex items-center gap-3"><img src={r.image_url} alt="" className="h-10 w-10 rounded-md object-cover" /><div><p className="font-semibold">{r.name}</p><p className="text-xs text-ink-500">{r.sku}{r.active ? "" : " · removed"}</p></div></div></td>
              <td className="td">{r.category_name}</td><td className="td">{inr(r.price)}</td><td className="td">{r.total_stock}</td>
              <td className="td space-x-2 text-right whitespace-nowrap">
                <button className="btn-ghost !px-3 !py-1.5" onClick={() => setForm({ id: r.id, sku: r.sku, name: r.name, brand: r.brand, description: r.description, categoryId: r.category_id, price: r.price, imageUrl: r.image_url.startsWith("/img/") ? "" : r.image_url })}>Edit</button>
                {r.active ? <button className="btn-danger !px-3 !py-1.5" onClick={() => confirm(`Remove ${r.name} from the store?`) && act(`/admin/products/${r.id}`, "DELETE", "Product removed")}>Remove</button>
                          : <button className="btn-ghost !px-3 !py-1.5" onClick={() => act(`/admin/products/${r.id}/restore`, "POST", "Product restored")}>Restore</button>}
              </td></tr>))}</tbody></table></div>)}
      {form && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4" role="dialog" aria-modal="true" aria-label={form.id ? "Edit product" : "Add product"}>
          <form onSubmit={save} className="card max-h-[90vh] w-full max-w-lg animate-pop space-y-3 overflow-y-auto p-6">
            <h2 className="text-2xl font-bold">{form.id ? "Edit product" : "Add product"}</h2>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm font-medium">SKU<input className="input mt-1" required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></label>
              <label className="text-sm font-medium">Brand<input className="input mt-1" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></label></div>
            <label className="block text-sm font-medium">Name<input className="input mt-1" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
            <label className="block text-sm font-medium">Description<textarea className="input mt-1" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm font-medium">Category<select className="input mt-1" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: Number(e.target.value) })}>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
              <label className="text-sm font-medium">Price (₹)<input className="input mt-1" type="number" min={0} step="1" required value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></label></div>
            <label className="block text-sm font-medium">Image URL (optional)<input className="input mt-1" type="url" placeholder="https://…" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} /></label>
            <div className="flex justify-end gap-2 pt-2"><button type="button" className="btn-ghost" onClick={() => setForm(null)}>Cancel</button><button className="btn-primary">Save product</button></div>
          </form></div>)}
    </div>
  );
}

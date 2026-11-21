import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Clock, PackageCheck, ShieldCheck, MapPin } from "lucide-react";
import { api, inrPaise, when } from "../api";
import { Empty, ErrorBox, Spinner, StatusBadge } from "../components/ui";
import type { Order } from "../types";

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const load = () => api<Order[]>("/orders").then(setOrders).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);
  if (err) return <ErrorBox message={err} onRetry={load} />;
  if (!orders) return <Spinner label="FETCHING ORDER AUDIT RECORDS" />;
  if (!orders.length) {
    return (
      <Empty
        title="NO ORDER HISTORY"
        hint="When you place an order with verified physical stock, it will be registered here."
        action={<Link className="btn-primary" to="/">EXPLORE CATALOG</Link>}
      />
    );
  }
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-[#E4E2DA] pb-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-[#111111]">
            YOUR ORDERS
          </h1>
          <p className="font-mono text-xs text-[#5A5852] mt-0.5">
            VERIFIED POSTGRESQL TRANSACTIONS & KAFKA DISPATCH LOG
          </p>
        </div>
      </div>

      <ul className="space-y-3">
        {orders.map((o) => (
          <li key={o.id}>
            <Link
              to={`/orders/${o.id}`}
              className="border border-[#E4E2DA] bg-[#FFFFFF] flex flex-wrap items-center justify-between gap-4 p-4 hover:border-[#111111] transition-colors rounded-[2px]"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-[#111111]">ORDER #{o.id}</span>
                  <span className="font-mono text-xs text-[#5A5852] flex items-center gap-1">
                    <MapPin strokeWidth={1.5} size={12} className="text-[#B84A27]" />
                    <span>{o.city}</span>
                  </span>
                </div>
                <p className="font-mono text-xs text-[#5A5852]">
                  {when(o.created_at)} · {o.items.reduce((s, i) => s + i.quantity, 0)} UNITS ALLOCATED
                </p>
              </div>

              <div className="flex items-center gap-4">
                <StatusBadge status={o.status} />
                <span className="font-mono font-bold text-sm text-[#111111]">
                  {inrPaise(o.total_paise)}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function OrderDetail() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const [o, setO] = useState<Order | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true, t: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const r = await api<Order>(`/orders/${id}`);
        if (!alive) return;
        setO(r);
        if (r.status === "placed") t = setTimeout(tick, 1500);
      } catch (e: any) {
        if (alive) setErr(e.message);
      }
    };
    tick();
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [id]);

  if (err) return <ErrorBox message={err} />;
  if (!o) return <Spinner label="RETRIEVING ORDER TELEMETRY" />;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        to="/orders"
        className="inline-flex items-center gap-1.5 font-mono text-xs text-[#5A5852] hover:text-[#111111] transition-colors"
      >
        <ArrowLeft strokeWidth={1.5} size={14} />
        <span>BACK TO ALL ORDERS</span>
      </Link>

      {sp.get("new") && (
        <div className="border border-[#1B4332] bg-[#ECEAE2] p-4 text-xs font-mono text-[#1B4332] rounded-[2px] flex items-center gap-2">
          <ShieldCheck strokeWidth={1.5} size={16} />
          <span>ORDER SECURED: Stock reserved via row-level PostgreSQL transaction.</span>
        </div>
      )}

      <div className="border border-[#E4E2DA] bg-[#FFFFFF] p-6 rounded-[2px] shadow-sm space-y-6">
        <div className="flex items-start justify-between border-b border-[#E4E2DA] pb-4">
          <div>
            <span className="font-mono text-[10px] text-[#5A5852] uppercase">TRANSACTION RECEIPT</span>
            <h1 className="font-display text-2xl font-bold text-[#111111] mt-0.5">ORDER #{o.id}</h1>
            <p className="font-mono text-xs text-[#5A5852] mt-1">
              {when(o.created_at)} · DISPATCHING FROM {o.city.toUpperCase()}
            </p>
            {o.payment_method && (
              <p className="font-mono text-[11px] text-[#1B4332] font-semibold mt-1 uppercase">
                PAYMENT: {o.payment_method} · {o.payment_status || "CONFIRMED"} {o.payment_ref ? `(${o.payment_ref})` : ""}
              </p>
            )}
          </div>
          <StatusBadge status={o.status} />
        </div>

        {o.status === "placed" && (
          <div className="flex items-center gap-2 p-3 bg-[#F6F5F0] border border-[#E4E2DA] rounded-[2px] text-xs font-mono text-[#5A5852]">
            <Clock strokeWidth={1.5} size={14} className="text-[#B84A27] animate-pulse" />
            <span>Awaiting Kafka order-processor worker confirmation...</span>
          </div>
        )}

        {o.confirmation && (
          <div className="p-3 bg-[#F6F5F0] border border-[#E4E2DA] rounded-[2px] font-mono text-xs text-[#111111]">
            <p className="text-[#1B4332] font-bold">KAFKA CONFIRMATION ACKNOWLEDGED</p>
            <p className="text-[11px] text-[#5A5852] mt-0.5">{o.confirmation.message}</p>
          </div>
        )}

        {/* Line Items */}
        <div className="space-y-3 font-mono text-xs">
          <span className="text-[#5A5852] block border-b border-[#E4E2DA] pb-1 font-bold">
            ALLOCATED INVENTORY
          </span>
          <ul className="divide-y divide-[#E4E2DA]">
            {o.items.map((i) => (
              <li key={i.productId} className="flex justify-between py-2.5">
                <span className="text-[#111111]">
                  {i.quantity} × {i.name}
                </span>
                <span className="font-bold text-[#111111]">
                  {inrPaise(i.unitPaise * i.quantity)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex justify-between items-center border-t border-[#E4E2DA] pt-4 font-mono">
          <span className="text-xs text-[#5A5852]">TOTAL PAID (TAX INCL.)</span>
          <span className="font-display text-2xl font-bold text-[#111111]">
            {inrPaise(o.total_paise)}
          </span>
        </div>
      </div>
    </div>
  );
}

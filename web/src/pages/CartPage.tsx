import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Database,
  Radio,
  Search,
  Trash2,
  Plus,
  Minus,
  Clock,
  CreditCard,
  QrCode,
  DollarSign,
  X
} from "lucide-react";
import { api, ApiError, inr, inrPaise } from "../api";
import { useApp } from "../store";
import { Empty, Spinner } from "../components/ui";
import { StockMeter } from "../components/StockMeter";
import { getProductFallback } from "../utils/images";

interface Shortage {
  productId: number;
  name: string;
  requested: number;
  available: number;
}

type CheckoutPhase = "idle" | "pg_lock" | "kafka_publish" | "opensearch_sync" | "completed" | "conflict";
type PaymentMethod = "razorpay" | "paytm" | "COD";

interface PaymentSandboxState {
  gateway: "razorpay" | "paytm";
  orderId: string;
  amountPaise: number;
  keyOrMid: string;
  token?: string;
}

export default function CartPage() {
  const { cart, refreshCart, setQty, city, setCity, cities, toast } = useApp();
  const nav = useNavigate();
  const [placing, setPlacing] = useState(false);
  const [short, setShort] = useState<Shortage[]>([]);
  const [phase, setPhase] = useState<CheckoutPhase>("idle");
  const [confirmedOrderId, setConfirmedOrderId] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("razorpay");
  const [sandboxModal, setSandboxModal] = useState<PaymentSandboxState | null>(null);
  const [selectedUpiApp, setSelectedUpiApp] = useState<string>("Google Pay (UPI)");

  const allCities = cities.length > 0 ? cities : ["Bengaluru", "Mumbai", "Delhi", "Chennai", "Hyderabad", "Pune"];

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  if (!cart) return <Spinner label="AUDITING CART SESSION" />;
  if (cart.items.length === 0 && phase !== "completed") {
    return (
      <Empty
        title="YOUR CART IS EMPTY"
        hint="Select physical stock items from our store catalog to proceed with checkout."
        action={
          <Link to="/" className="btn-primary">
            BROWSE CATALOG
          </Link>
        }
      />
    );
  }

  // Calculate total MRP to highlight flash sale discounts
  const totalMrpPaise = cart.items.reduce((acc, i) => {
    const itemMrpPaise = i.mrp ? i.mrp * 100 : i.price * 100;
    return acc + itemMrpPaise * i.quantity;
  }, 0);
  const totalSavingsPaise = Math.max(0, totalMrpPaise - cart.totalPaise);

  async function initiateOrder() {
    if (!cart?.canCheckout) return;

    if (paymentMethod === "COD") {
      executeCheckoutFlow(async () => {
        return api<{ orderId: number }>("/payments/cod", { method: "POST" });
      });
      return;
    }

    if (paymentMethod === "razorpay") {
      try {
        setPlacing(true);
        const res = await api<{ id: string; amount: number; key: string; sandbox: boolean }>(
          "/payments/razorpay/create-order",
          {
            method: "POST",
            body: { amountPaise: cart.totalPaise },
          }
        );
        setPlacing(false);
        setSandboxModal({
          gateway: "razorpay",
          orderId: res.id,
          amountPaise: res.amount,
          keyOrMid: res.key,
        });
      } catch (err: any) {
        setPlacing(false);
        toast(err.message || "Failed to initialize Razorpay order", "error");
      }
      return;
    }

    if (paymentMethod === "paytm") {
      try {
        setPlacing(true);
        const res = await api<{ orderId: string; txnToken: string; mid: string; sandbox: boolean }>(
          "/payments/paytm/initiate",
          {
            method: "POST",
            body: { amountPaise: cart.totalPaise },
          }
        );
        setPlacing(false);
        setSandboxModal({
          gateway: "paytm",
          orderId: res.orderId,
          amountPaise: cart.totalPaise,
          keyOrMid: res.mid,
          token: res.txnToken,
        });
      } catch (err: any) {
        setPlacing(false);
        toast(err.message || "Failed to initialize Paytm transaction", "error");
      }
      return;
    }
  }

  async function completeSandboxPayment() {
    if (!sandboxModal) return;
    const modal = sandboxModal;
    setSandboxModal(null);

    if (modal.gateway === "razorpay") {
      executeCheckoutFlow(async () => {
        return api<{ orderId: number }>("/payments/razorpay/verify", {
          method: "POST",
          body: {
            razorpay_order_id: modal.orderId,
            razorpay_payment_id: `pay_sim_${Date.now()}`,
            razorpay_signature: "sandbox_verified",
          },
        });
      });
    } else if (modal.gateway === "paytm") {
      executeCheckoutFlow(async () => {
        return api<{ orderId: number }>("/payments/paytm/callback", {
          method: "POST",
          body: {
            orderId: modal.orderId,
            txnId: `TXN_PAYTM_${Date.now()}`,
          },
        });
      });
    }
  }

  async function executeCheckoutFlow(orderExecutor: () => Promise<{ orderId: number }>) {
    setPlacing(true);
    setShort([]);
    setPhase("pg_lock");

    try {
      // Step 1: PostgreSQL Row Lock & Transaction
      const orderPromise = orderExecutor();

      // Visual step delay to clearly illustrate distributed architecture
      await new Promise((r) => setTimeout(r, 450));
      setPhase("kafka_publish");

      const o = await orderPromise;
      setConfirmedOrderId(o.orderId);

      // Step 2: Kafka Outbox streaming
      await new Promise((r) => setTimeout(r, 400));
      setPhase("opensearch_sync");

      // Step 3: OpenSearch sync
      await new Promise((r) => setTimeout(r, 400));
      setPhase("completed");

      await refreshCart();
      toast(`Order #${o.orderId} secured successfully!`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409 && e.data?.items) {
        setShort(e.data.items);
        setPhase("conflict");
        toast(e.message, "error");
        await refreshCart();
      } else {
        setPhase("conflict");
        toast((e as Error).message, "error");
      }
    } finally {
      setPlacing(false);
    }
  }

  return (
    <div className="space-y-6" style={{ perspective: "1400px" }}>
      {/* Page Title */}
      <div className="flex items-center justify-between border-b border-[#E4E2DA] pb-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-[#111111]">
            CART & CHECKOUT
          </h1>
          <p className="font-mono text-xs text-[#5A5852] mt-0.5">
            CONCURRENCY-CONTROLLED INVENTORY ALLOCATION & INDIAN PAYMENT GATEWAYS
          </p>
        </div>
        <div className="font-mono text-xs text-[#5A5852] flex items-center gap-1.5">
          <ShieldCheck strokeWidth={1.5} size={15} className="text-[#1B4332]" />
          <span>STRICT ROW LOCKING ACTIVE</span>
        </div>
      </div>

      {/* Sandbox Simulation Modal (Razorpay / Paytm) */}
      <AnimatePresence>
        {sandboxModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-[#FFFFFF] border-2 border-[#111111] p-6 rounded-[2px] shadow-2xl space-y-5">
              <div className="flex items-start justify-between border-b border-[#E4E2DA] pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] bg-[#111111] text-white px-2 py-0.5 rounded-[1px] font-bold">
                      {sandboxModal.gateway === "razorpay" ? "RAZORPAY TEST GATEWAY" : "PAYTM SECURE GATEWAY"}
                    </span>
                    <span className="font-mono text-[10px] text-[#B84A27] font-bold">
                      SANDBOX MODE
                    </span>
                  </div>
                  <h3 className="font-display text-lg font-bold text-[#111111] mt-1">
                    Complete Test Payment
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSandboxModal(null)}
                  className="text-[#5A5852] hover:text-[#111111]"
                >
                  <X strokeWidth={1.5} size={18} />
                </button>
              </div>

              <div className="space-y-3 font-mono text-xs bg-[#F6F5F0] border border-[#E4E2DA] p-3 rounded-[2px]">
                <div className="flex justify-between">
                  <span className="text-[#5A5852]">TOTAL PAYABLE:</span>
                  <span className="font-bold text-[#111111] text-sm">
                    {inrPaise(sandboxModal.amountPaise)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5A5852]">MERCHANT REF:</span>
                  <span className="text-[#111111] truncate max-w-[200px]">
                    {sandboxModal.orderId}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5A5852]">CLIENT KEY:</span>
                  <span className="text-[#111111]">{sandboxModal.keyOrMid}</span>
                </div>
              </div>

              {/* Payment Methods Simulation */}
              <div className="space-y-2 font-mono text-xs">
                <span className="text-[#5A5852] font-bold">SIMULATION CHANNEL:</span>
                <div className="grid grid-cols-2 gap-2">
                  {["Google Pay (UPI)", "PhonePe UPI", "HDFC NetBanking", "Instant Card"].map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setSelectedUpiApp(method)}
                      className={`p-2.5 text-left border rounded-[2px] transition-colors ${
                        selectedUpiApp === method
                          ? "border-[#111111] bg-[#111111] text-white font-bold"
                          : "border-[#E4E2DA] bg-[#FFFFFF] text-[#111111] hover:border-[#8E8A82]"
                      }`}
                    >
                      <div className="text-[11px]">{method}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-[#E4E2DA] pt-4 space-y-2">
                <button
                  type="button"
                  onClick={completeSandboxPayment}
                  className="btn-accent w-full !py-2.5 flex items-center justify-center gap-2 text-xs font-bold"
                >
                  <CheckCircle2 strokeWidth={1.5} size={15} />
                  <span>AUTHORIZE {inrPaise(sandboxModal.amountPaise)} & COMMIT ORDER</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSandboxModal(null)}
                  className="btn-ghost w-full !py-2 text-xs"
                >
                  CANCEL TRANSACTION
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* 3D Tactile Card-Flip Confirmation Overlay or Stage */}
      <AnimatePresence>
        {phase !== "idle" && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div
              className="relative w-full max-w-lg transition-transform duration-700 preserve-3d"
              style={{
                perspective: "1200px",
                transformStyle: "preserve-3d",
                transform: phase === "completed" ? "rotateY(180deg)" : "rotateY(0deg)",
              }}
            >
              {/* Front Face: Transaction Progression State */}
              <div
                className="w-full bg-[#FFFFFF] border border-[#E4E2DA] p-6 shadow-2xl rounded-[2px] space-y-6 backface-hidden"
                style={{ backfaceVisibility: "hidden" }}
              >
                <div className="flex items-center justify-between border-b border-[#E4E2DA] pb-3">
                  <div className="flex items-center gap-2">
                    <Database strokeWidth={1.5} size={18} className="text-[#B84A27]" />
                    <span className="font-display text-sm font-bold tracking-wider text-[#111111]">
                      DISTRIBUTED CHECKOUT ENGINE
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-[#5A5852]">
                    ISOLATION: READ COMMITTED
                  </span>
                </div>

                {/* Step Indicators */}
                <div className="space-y-3 font-mono text-xs">
                  {/* Step 1: PostgreSQL Lock */}
                  <div
                    className={`p-3 border rounded-[2px] flex items-center justify-between ${
                      phase === "pg_lock"
                        ? "border-[#B84A27] bg-[#B84A27]/5 text-[#111111]"
                        : phase === "kafka_publish" || phase === "opensearch_sync" || phase === "completed"
                        ? "border-[#1B4332] bg-[#1B4332]/5 text-[#1B4332]"
                        : phase === "conflict"
                        ? "border-red-400 bg-red-50 text-red-700"
                        : "border-[#E4E2DA] text-[#8E8A82]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Database strokeWidth={1.5} size={15} />
                      <div>
                        <p className="font-bold">1. POSTGRESQL ROW LOCK</p>
                        <p className="text-[10px] opacity-80">
                          Acquiring SELECT FOR UPDATE lock on SKU row
                        </p>
                      </div>
                    </div>
                    {phase === "pg_lock" ? (
                      <span className="animate-spin text-[#B84A27] font-bold">...</span>
                    ) : phase === "conflict" ? (
                      <AlertTriangle strokeWidth={1.5} size={15} className="text-red-600" />
                    ) : (
                      <CheckCircle2 strokeWidth={1.5} size={15} className="text-[#1B4332]" />
                    )}
                  </div>

                  {/* Step 2: Kafka Outbox */}
                  <div
                    className={`p-3 border rounded-[2px] flex items-center justify-between ${
                      phase === "kafka_publish"
                        ? "border-[#B84A27] bg-[#B84A27]/5 text-[#111111]"
                        : phase === "opensearch_sync" || phase === "completed"
                        ? "border-[#1B4332] bg-[#1B4332]/5 text-[#1B4332]"
                        : "border-[#E4E2DA] text-[#8E8A82]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Radio strokeWidth={1.5} size={15} />
                      <div>
                        <p className="font-bold">2. KAFKA EVENT PUBLISHED</p>
                        <p className="text-[10px] opacity-80">
                          Streaming order-events to partition cluster
                        </p>
                      </div>
                    </div>
                    {phase === "kafka_publish" ? (
                      <span className="animate-spin text-[#B84A27] font-bold">...</span>
                    ) : phase === "opensearch_sync" || phase === "completed" ? (
                      <CheckCircle2 strokeWidth={1.5} size={15} className="text-[#1B4332]" />
                    ) : (
                      <Clock strokeWidth={1.5} size={15} className="text-[#8E8A82]" />
                    )}
                  </div>

                  {/* Step 3: OpenSearch Sync */}
                  <div
                    className={`p-3 border rounded-[2px] flex items-center justify-between ${
                      phase === "opensearch_sync"
                        ? "border-[#B84A27] bg-[#B84A27]/5 text-[#111111]"
                        : phase === "completed"
                        ? "border-[#1B4332] bg-[#1B4332]/5 text-[#1B4332]"
                        : "border-[#E4E2DA] text-[#8E8A82]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Search strokeWidth={1.5} size={15} />
                      <div>
                        <p className="font-bold">3. OPENSEARCH INDEX SYNCED</p>
                        <p className="text-[10px] opacity-80">
                          Updating live search catalog inventory
                        </p>
                      </div>
                    </div>
                    {phase === "opensearch_sync" ? (
                      <span className="animate-spin text-[#B84A27] font-bold">...</span>
                    ) : phase === "completed" ? (
                      <CheckCircle2 strokeWidth={1.5} size={15} className="text-[#1B4332]" />
                    ) : (
                      <Clock strokeWidth={1.5} size={15} className="text-[#8E8A82]" />
                    )}
                  </div>
                </div>

                {/* If Concurrency Conflict Occurs (409) */}
                {phase === "conflict" && (
                  <div className="p-4 border border-red-300 bg-red-50 rounded-[2px] space-y-3 font-mono text-xs">
                    <div className="flex items-center gap-2 text-red-700 font-bold">
                      <AlertTriangle strokeWidth={1.5} size={16} />
                      <span>CONCURRENCY LOCK REJECTION (HTTP 409)</span>
                    </div>
                    <p className="text-red-700 text-[11px] leading-relaxed">
                      Another buyer secured the final physical unit milliseconds prior. PostgreSQL row-level locks aborted this transaction. Zero charges were created.
                    </p>
                    {short.length > 0 && (
                      <ul className="divide-y divide-red-200 border-t border-red-200 pt-2 text-[11px] text-red-800">
                        {short.map((s) => (
                          <li key={s.productId} className="py-1 flex justify-between">
                            <span>{s.name}</span>
                            <span>Requested: {s.requested} | Left: {s.available}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <button
                      type="button"
                      onClick={() => setPhase("idle")}
                      className="btn-primary w-full !py-2 text-xs"
                    >
                      RETURN TO CART & ADJUST QUANTITY
                    </button>
                  </div>
                )}
              </div>

              {/* Back Face: Tactile Order Confirmed Receipt */}
              <div
                className="w-full bg-[#FFFFFF] border-2 border-[#111111] p-6 shadow-2xl rounded-[2px] space-y-6 backface-hidden absolute inset-0"
                style={{
                  backfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                }}
              >
                <div className="flex items-start justify-between border-b border-[#E4E2DA] pb-4">
                  <div>
                    <div className="flex items-center gap-2 text-[#1B4332] font-mono text-xs font-bold">
                      <CheckCircle2 strokeWidth={1.5} size={16} />
                      <span>AIVEN STOCK ALLOCATION CONFIRMED</span>
                    </div>
                    <h2 className="font-display text-2xl font-bold text-[#111111] mt-1">
                      ORDER #{confirmedOrderId}
                    </h2>
                  </div>
                  <span className="font-mono text-xs bg-[#1B4332] text-white px-2 py-0.5 rounded-[1px]">
                    SECURED
                  </span>
                </div>

                <div className="space-y-2 font-mono text-xs">
                  <div className="flex justify-between text-[#5A5852]">
                    <span>DISPATCH WAREHOUSE:</span>
                    <span className="font-bold text-[#111111] uppercase">{city}</span>
                  </div>
                  <div className="flex justify-between text-[#5A5852]">
                    <span>PAYMENT METHOD:</span>
                    <span className="font-bold text-[#111111] uppercase">
                      {paymentMethod === "razorpay" ? "Razorpay (Verified)" : paymentMethod === "paytm" ? "Paytm (Verified)" : "Cash On Delivery"}
                    </span>
                  </div>
                  <div className="flex justify-between text-[#5A5852]">
                    <span>DATABASE PROTOCOL:</span>
                    <span className="text-[#111111]">ROW-LOCK COMMITTED</span>
                  </div>
                  <div className="flex justify-between text-[#5A5852]">
                    <span>KAFKA EVENT:</span>
                    <span className="text-[#111111]">ACKNOWLEDGED</span>
                  </div>
                </div>

                <div className="border-t border-[#E4E2DA] pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => nav(`/orders/${confirmedOrderId}?new=1`)}
                    className="btn-primary flex-1 !py-2.5 flex items-center justify-center gap-2"
                  >
                    <span>VIEW ORDER DETAILS</span>
                    <ArrowRight strokeWidth={1.5} size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => nav("/")}
                    className="btn-ghost !py-2.5"
                  >
                    CONTINUE SHOPPING
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Cart Content Table & Summary */}
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        {/* Cart Items List */}
        <section className="space-y-4">
          <div className="border border-[#E4E2DA] bg-[#FFFFFF] rounded-[2px] divide-y divide-[#E4E2DA]">
            {cart.items.map((i) => (
              <div key={i.productId} className="p-4 sm:p-5 flex gap-5 items-start">
                <img
                  src={i.image_url || getProductFallback("", i.name, i.sku)}
                  alt={i.name}
                  className="w-20 h-20 object-cover border border-[#E4E2DA] bg-[#F6F5F0] shrink-0 rounded-[1px]"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = getProductFallback("", i.name, i.sku);
                  }}
                />

                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <Link
                        to={`/product/${i.productId}`}
                        className="font-display font-bold text-sm text-[#111111] hover:text-[#B84A27] transition-colors"
                      >
                        {i.name}
                      </Link>
                      
                      {/* Discounted Pricing Display */}
                      {i.mrp && i.mrp > i.price ? (
                        <div className="flex items-center gap-2 mt-0.5 font-mono text-xs">
                          <span className="line-through text-[#5A5852]">{inr(i.mrp)}</span>
                          <span className="font-bold text-[#111111]">{inr(i.price)}</span>
                          <span className="text-[10px] bg-[#B84A27] text-white px-1.5 py-0.2 rounded-[1px] font-bold">
                            {i.discount_percent || Math.round(((i.mrp - i.price) / i.mrp) * 100)}% OFF
                          </span>
                        </div>
                      ) : (
                        <p className="font-mono text-xs text-[#5A5852] mt-0.5">
                          SKU: {i.productId} · {inr(i.price)} each
                        </p>
                      )}
                    </div>
                    <span className="font-mono font-bold text-sm text-[#111111]">
                      {inr(i.price * i.quantity)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <StockMeter qty={i.available} city={city} />
                  </div>

                  {!i.inStock && (
                    <p className="font-mono text-xs font-semibold text-[#B84A27]">
                      {i.available === 0
                        ? `Sold out in ${city}. Remove item or switch dispatch city.`
                        : `Only ${i.available} available in ${city}. Lower quantity to proceed.`}
                    </p>
                  )}

                  {/* Quantity Stepper & Removal */}
                  <div className="flex items-center gap-4 pt-1">
                    <div className="flex items-center border border-[#111111] bg-[#FFFFFF]">
                      <button
                        type="button"
                        className="px-2.5 py-1 text-xs text-[#111111] hover:bg-[#ECEAE2] transition-colors"
                        aria-label={`Decrease ${i.name}`}
                        onClick={() => setQty(i.productId, i.quantity - 1)}
                      >
                        <Minus strokeWidth={1.5} size={12} />
                      </button>
                      <span className="w-8 text-center font-mono text-xs font-bold text-[#111111]">
                        {i.quantity}
                      </span>
                      <button
                        type="button"
                        className="px-2.5 py-1 text-xs text-[#111111] hover:bg-[#ECEAE2] transition-colors disabled:opacity-30"
                        aria-label={`Increase ${i.name}`}
                        disabled={i.quantity >= 99 || i.quantity >= i.available}
                        onClick={() => setQty(i.productId, i.quantity + 1)}
                      >
                        <Plus strokeWidth={1.5} size={12} />
                      </button>
                    </div>

                    <button
                      type="button"
                      className="inline-flex items-center gap-1 font-mono text-xs text-[#8E8A82] hover:text-[#B84A27] transition-colors"
                      onClick={() => setQty(i.productId, 0)}
                    >
                      <Trash2 strokeWidth={1.5} size={13} />
                      <span>REMOVE</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Order Summary & Payment Gateway Sidebar */}
        <aside className="border border-[#E4E2DA] bg-[#FFFFFF] p-6 rounded-[2px] shadow-sm space-y-5 h-fit lg:sticky lg:top-24">
          <h2 className="font-display text-base font-bold text-[#111111] border-b border-[#E4E2DA] pb-3">
            ORDER SPECIFICATION
          </h2>

          {/* Ship From City Selector */}
          <div className="space-y-1.5 font-mono text-xs">
            <span className="text-[#5A5852]">FULFILLMENT CITY:</span>
            <select
              className="input !text-xs font-mono font-semibold"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            >
              {allCities.map((c) => (
                <option key={c} value={c}>
                  {c.toUpperCase()} BRANCH
                </option>
              ))}
            </select>
          </div>

          {/* Pricing Breakdown */}
          <div className="space-y-2 border-t border-[#E4E2DA] pt-4 font-mono text-xs">
            {totalSavingsPaise > 0 && (
              <div className="flex justify-between text-[#5A5852]">
                <span>TOTAL MRP</span>
                <span className="line-through">{inrPaise(totalMrpPaise)}</span>
              </div>
            )}
            <div className="flex justify-between text-[#5A5852]">
              <span>SUBTOTAL</span>
              <span>{inrPaise(cart.totalPaise)}</span>
            </div>
            {totalSavingsPaise > 0 && (
              <div className="flex justify-between text-[#B84A27] font-bold">
                <span>FLASH SALE SAVINGS</span>
                <span>-{inrPaise(totalSavingsPaise)}</span>
              </div>
            )}
            <div className="flex justify-between text-[#5A5852]">
              <span>REGIONAL DISPATCH</span>
              <span className="text-[#1B4332]">FREE (EXPRESS)</span>
            </div>
            <div className="flex justify-between text-base font-bold text-[#111111] border-t border-[#E4E2DA] pt-3">
              <span>TOTAL</span>
              <span>{inrPaise(cart.totalPaise)}</span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-2.5 border-t border-[#E4E2DA] pt-4 font-mono text-xs">
            <span className="text-[#5A5852] block font-bold">PAYMENT GATEWAY:</span>
            
            {/* Razorpay Option */}
            <label
              className={`flex items-start gap-3 p-3 border rounded-[2px] cursor-pointer transition-colors ${
                paymentMethod === "razorpay"
                  ? "border-[#111111] bg-[#ECEAE2]"
                  : "border-[#E4E2DA] hover:border-[#8E8A82]"
              }`}
            >
              <input
                type="radio"
                name="paymentMethod"
                value="razorpay"
                checked={paymentMethod === "razorpay"}
                onChange={() => setPaymentMethod("razorpay")}
                className="mt-0.5 accent-[#111111]"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#111111] flex items-center gap-1.5">
                    <CreditCard strokeWidth={1.5} size={13} />
                    <span>Razorpay</span>
                  </span>
                  <span className="text-[10px] bg-[#111111] text-white px-1.5 py-0.5 rounded-[1px] font-bold">
                    UPI / CARDS
                  </span>
                </div>
                <p className="text-[10px] text-[#5A5852] mt-1 leading-normal">
                  Google Pay, PhonePe, Paytm UPI, RuPay/Visa/MasterCard, NetBanking.
                </p>
              </div>
            </label>

            {/* Paytm Option */}
            <label
              className={`flex items-start gap-3 p-3 border rounded-[2px] cursor-pointer transition-colors ${
                paymentMethod === "paytm"
                  ? "border-[#111111] bg-[#ECEAE2]"
                  : "border-[#E4E2DA] hover:border-[#8E8A82]"
              }`}
            >
              <input
                type="radio"
                name="paymentMethod"
                value="paytm"
                checked={paymentMethod === "paytm"}
                onChange={() => setPaymentMethod("paytm")}
                className="mt-0.5 accent-[#111111]"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#111111] flex items-center gap-1.5">
                    <QrCode strokeWidth={1.5} size={13} />
                    <span>Paytm Gateway</span>
                  </span>
                  <span className="text-[10px] bg-[#002970] text-white px-1.5 py-0.5 rounded-[1px] font-bold">
                    WALLET / QR
                  </span>
                </div>
                <p className="text-[10px] text-[#5A5852] mt-1 leading-normal">
                  Paytm Wallet, Paytm Postpaid, or scanned UPI payments.
                </p>
              </div>
            </label>

            {/* COD Option */}
            <label
              className={`flex items-start gap-3 p-3 border rounded-[2px] cursor-pointer transition-colors ${
                paymentMethod === "COD"
                  ? "border-[#111111] bg-[#ECEAE2]"
                  : "border-[#E4E2DA] hover:border-[#8E8A82]"
              }`}
            >
              <input
                type="radio"
                name="paymentMethod"
                value="COD"
                checked={paymentMethod === "COD"}
                onChange={() => setPaymentMethod("COD")}
                className="mt-0.5 accent-[#111111]"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#111111] flex items-center gap-1.5">
                    <DollarSign strokeWidth={1.5} size={13} />
                    <span>Cash on Delivery</span>
                  </span>
                  <span className="text-[10px] border border-[#111111] text-[#111111] px-1.5 py-0.5 rounded-[1px] font-bold">
                    AT DOORSTEP
                  </span>
                </div>
                <p className="text-[10px] text-[#5A5852] mt-1 leading-normal">
                  Pay cash or scan courier delivery QR upon physical delivery.
                </p>
              </div>
            </label>
          </div>

          <button
            type="button"
            className="btn-accent w-full !py-3 flex items-center justify-center gap-2 text-xs font-bold"
            disabled={!cart.canCheckout || placing}
            onClick={initiateOrder}
          >
            <span>
              {placing
                ? "PREPARING TRANSACTION..."
                : paymentMethod === "COD"
                ? "AUTHORIZE ORDER & RESERVE STOCK"
                : `PROCEED WITH ${paymentMethod.toUpperCase()}`}
            </span>
            <ArrowRight strokeWidth={1.5} size={15} />
          </button>

          {!cart.canCheckout && (
            <p className="font-mono text-[11px] text-[#B84A27] leading-relaxed">
              One or more items exceed live stock at the {city} branch. Adjust quantities or choose a different city to proceed.
            </p>
          )}

          <div className="border-t border-[#E4E2DA] pt-4 space-y-2 font-mono text-[10px] text-[#5A5852]">
            <p className="flex items-center gap-1.5 text-[#1B4332]">
              <ShieldCheck strokeWidth={1.5} size={13} />
              <span>ACID TRANSACTION INTEGRITY</span>
            </p>
            <p>
              Stock is locked in PostgreSQL at the moment of order placement. If a competing buyer claims the last unit first, your transaction safely aborts without charge.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

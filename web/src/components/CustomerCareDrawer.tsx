import React, { useState } from "react";
import { X, HelpCircle, Search, MessageSquare, ChevronDown, CheckCircle2, Clock, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";
import { useApp } from "../store";
import { api, inr } from "../api";

export function CustomerCareDrawer() {
  const { isSupportOpen, setIsSupportOpen, toast } = useApp();
  const [activeTab, setActiveTab] = useState<"lookup" | "faq" | "ticket">("lookup");

  // Order Lookup State
  const [lookupId, setLookupId] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [orderData, setOrderData] = useState<any>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Ticket Form State
  const [ticketForm, setTicketForm] = useState({
    name: "",
    email: "",
    orderId: "",
    issueType: "Delivery Query",
    message: "",
  });
  const [ticketSubmitting, setTicketSubmitting] = useState(false);
  const [ticketResult, setTicketResult] = useState<string | null>(null);

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  if (!isSupportOpen) return null;

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupId.trim()) return;
    setLookupLoading(true);
    setLookupError(null);
    setOrderData(null);

    try {
      const data = await api<any>(`/support/order-lookup/${lookupId.trim()}`);
      setOrderData(data);
    } catch (err: any) {
      setLookupError(err.message || "Order not found in database.");
    } finally {
      setLookupLoading(false);
    }
  };

  const handleTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTicketSubmitting(true);
    try {
      const res = await api<any>("/support/tickets", {
        method: "POST",
        body: {
          name: ticketForm.name,
          email: ticketForm.email,
          orderId: ticketForm.orderId ? Number(ticketForm.orderId) : null,
          issueType: ticketForm.issueType,
          message: ticketForm.message,
        },
      });
      setTicketResult(res.ticketRef);
      toast(`Support Ticket ${res.ticketRef} generated successfully`);
      setTicketForm({ name: "", email: "", orderId: "", issueType: "Delivery Query", message: "" });
    } catch (err: any) {
      toast(err.message || "Could not register ticket", "error");
    } finally {
      setTicketSubmitting(false);
    }
  };

  const faqs = [
    {
      q: "How does real-time stock locking work during rush hours?",
      a: "StockSync uses PostgreSQL row-level locks (SELECT ... FOR UPDATE) inside atomic ACID transactions. When you click checkout, stock is verified and locked on the exact physical retail warehouse line. If another shopper completes checkout first, your transaction safely aborts without partial charges.",
    },
    {
      q: "What are the delivery timelines across Indian metro hubs?",
      a: "For local city fulfillment (Bengaluru, Mumbai, Delhi, Hyderabad, Chennai, Pune), orders placed before 3:00 PM are dispatched same-day from the local hub. Standard inter-city deliveries take 24-48 hours via surface retail logistics.",
    },
    {
      q: "Can I inspect or return hardware at physical StockSync stores?",
      a: "Yes. Every online order comes with a 7-day physical retail return and exchange guarantee. Bring your Order ID or QR confirmation to any StockSync retail counter in your city for instant testing, replacement, or refund.",
    },
    {
      q: "What payment methods are supported?",
      a: "We support Razorpay (All major Indian credit/debit cards, UPI via Google Pay/PhonePe/Paytm, Netbanking), Paytm Gateway, and Cash on Delivery (COD) across all supported retail zip codes.",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#111111]/45 backdrop-blur-sm transition-opacity"
        onClick={() => setIsSupportOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-lg bg-[#FFFFFF] border-l border-[#E4E2DA] shadow-architectural flex flex-col">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-[#E4E2DA] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HelpCircle strokeWidth={1.5} size={17} className="text-[#B84A27]" />
              <h2 className="font-display font-bold text-sm tracking-tight text-[#111111]">
                CUSTOMER CARE &amp; RETAIL DESK
              </h2>
            </div>
            <button
              onClick={() => setIsSupportOpen(false)}
              className="p-1 text-[#5A5852] hover:text-[#111111] transition-colors rounded-[1px]"
              aria-label="Close Support Desk"
            >
              <X strokeWidth={1.5} size={18} />
            </button>
          </div>

          {/* Tab Selector */}
          <div className="flex border-b border-[#E4E2DA] bg-[#F6F5F0] font-mono text-xs">
            <button
              onClick={() => setActiveTab("lookup")}
              className={`flex-1 py-2.5 px-3 border-r border-[#E4E2DA] text-center font-semibold transition-colors ${
                activeTab === "lookup" ? "bg-[#FFFFFF] text-[#111111] border-b-2 border-b-[#B84A27]" : "text-[#5A5852] hover:text-[#111111]"
              }`}
            >
              ORDER LOOKUP
            </button>
            <button
              onClick={() => setActiveTab("faq")}
              className={`flex-1 py-2.5 px-3 border-r border-[#E4E2DA] text-center font-semibold transition-colors ${
                activeTab === "faq" ? "bg-[#FFFFFF] text-[#111111] border-b-2 border-b-[#B84A27]" : "text-[#5A5852] hover:text-[#111111]"
              }`}
            >
              FAQ
            </button>
            <button
              onClick={() => setActiveTab("ticket")}
              className={`flex-1 py-2.5 px-3 text-center font-semibold transition-colors ${
                activeTab === "ticket" ? "bg-[#FFFFFF] text-[#111111] border-b-2 border-b-[#B84A27]" : "text-[#5A5852] hover:text-[#111111]"
              }`}
            >
              SUPPORT TICKET
            </button>
          </div>

          {/* Drawer Body Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {/* Tab 1: Order Status Lookup */}
            {activeTab === "lookup" && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-display font-bold text-sm text-[#111111]">
                    LIVE POSTGRESQL / KAFKA ORDER AUDIT
                  </h3>
                  <p className="font-mono text-xs text-[#5A5852] mt-0.5">
                    Query physical fulfillment and transactional event status across Indian hubs.
                  </p>
                </div>

                <form onSubmit={handleLookup} className="flex gap-2">
                  <input
                    type="number"
                    value={lookupId}
                    onChange={(e) => setLookupId(e.target.value)}
                    placeholder="Enter Order ID (e.g. 1)"
                    className="input flex-1 !text-xs font-mono"
                    required
                  />
                  <button
                    type="submit"
                    disabled={lookupLoading}
                    className="btn-primary !text-xs !py-2 flex items-center gap-1.5"
                  >
                    {lookupLoading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
                    <span>LOOKUP</span>
                  </button>
                </form>

                {lookupError && (
                  <div className="p-3 border border-[#B84A27] bg-[#ECEAE2] text-[#B84A27] font-mono text-xs rounded-[1px]">
                    {lookupError}
                  </div>
                )}

                {orderData && (
                  <div className="border border-[#E4E2DA] bg-[#FFFFFF] p-4 rounded-[2px] space-y-4">
                    <div className="flex items-center justify-between border-b border-[#E4E2DA] pb-3">
                      <div>
                        <span className="font-mono text-[10px] text-[#5A5852] uppercase">ORDER REFERENCE</span>
                        <div className="font-mono text-sm font-bold text-[#111111]">#{orderData.order.id}</div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-[10px] text-[#5A5852] uppercase">FULFILLMENT HUB</span>
                        <div className="font-mono text-xs font-semibold text-[#1B4332]">{orderData.order.city}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-[#5A5852]">Status:</span>
                      <span className="font-bold uppercase text-[#1B4332] bg-[#ECEAE2] px-2 py-0.5 rounded-[1px]">
                        {orderData.order.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-[#5A5852]">Total Amount:</span>
                      <span className="font-bold text-[#111111]">{inr(orderData.order.price)}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-[#5A5852]">Payment Mode:</span>
                      <span className="uppercase text-[#111111] font-semibold">{orderData.order.payment_method || "COD"}</span>
                    </div>

                    {/* Items */}
                    <div className="pt-2 border-t border-[#E4E2DA] space-y-1.5">
                      <span className="font-mono text-[10px] text-[#5A5852] uppercase">COMMITTED SPECIFICATIONS</span>
                      {orderData.order.items.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between font-mono text-xs">
                          <span className="truncate max-w-[200px] text-[#111111]">{item.name}</span>
                          <span className="text-[#5A5852]">Qty: {item.quantity} · {inr(item.price)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Audit Trail Timeline */}
                    <div className="pt-3 border-t border-[#E4E2DA] space-y-2">
                      <span className="font-mono text-[10px] text-[#5A5852] uppercase">KAFKA EVENT LIFECYCLE</span>
                      <div className="space-y-1.5 font-mono text-[11px]">
                        {orderData.auditTrail.map((audit: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-[#1B4332] rounded-full shrink-0" />
                            <span className="text-[#111111]">{audit.step}</span>
                            <span className="ml-auto text-[#8E8A82] text-[10px]">
                              {new Date(audit.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Quick FAQ Accordion */}
            {activeTab === "faq" && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-display font-bold text-sm text-[#111111]">
                    RETAIL POLICIES &amp; FREQUENTLY ASKED QUESTIONS
                  </h3>
                  <p className="font-mono text-xs text-[#5A5852] mt-0.5">
                    Operating procedures for physical hubs, payments, and warranties.
                  </p>
                </div>

                <div className="divide-y divide-[#E4E2DA] border border-[#E4E2DA] bg-[#FFFFFF] rounded-[2px]">
                  {faqs.map((faq, idx) => (
                    <div key={idx} className="p-3.5">
                      <button
                        type="button"
                        onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                        className="w-full flex items-center justify-between text-left text-xs font-semibold text-[#111111] hover:text-[#B84A27] transition-colors"
                      >
                        <span>{faq.q}</span>
                        <ChevronDown
                          size={14}
                          className={`text-[#8E8A82] transition-transform duration-200 ${
                            openFaq === idx ? "rotate-180 text-[#B84A27]" : ""
                          }`}
                        />
                      </button>
                      {openFaq === idx && (
                        <p className="mt-2.5 font-sans text-xs text-[#5A5852] leading-relaxed border-t border-[#E4E2DA]/50 pt-2">
                          {faq.a}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 3: Raise a Support Ticket */}
            {activeTab === "ticket" && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-display font-bold text-sm text-[#111111]">
                    RAISE A RETAIL DESK SUPPORT TICKET
                  </h3>
                  <p className="font-mono text-xs text-[#5A5852] mt-0.5">
                    Our city ops team answers hardware and order queries within 2 hours.
                  </p>
                </div>

                {ticketResult ? (
                  <div className="p-4 border border-[#1B4332] bg-[#ECEAE2] rounded-[2px] space-y-2">
                    <div className="flex items-center gap-2 text-[#1B4332]">
                      <CheckCircle2 strokeWidth={1.5} size={16} />
                      <span className="font-display font-bold text-xs uppercase">TICKET REGISTERED</span>
                    </div>
                    <div className="font-mono text-sm font-bold text-[#111111]">
                      Reference ID: {ticketResult}
                    </div>
                    <p className="font-mono text-xs text-[#5A5852]">
                      A confirmation has been logged in PostgreSQL. Quote this reference ID at any physical counter.
                    </p>
                    <button
                      type="button"
                      onClick={() => setTicketResult(null)}
                      className="btn-ghost !text-xs mt-2"
                    >
                      Raise Another Ticket
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleTicketSubmit} className="space-y-3 font-mono text-xs">
                    <div>
                      <label className="block text-[#5A5852] mb-1">Your Full Name</label>
                      <input
                        type="text"
                        value={ticketForm.name}
                        onChange={(e) => setTicketForm({ ...ticketForm, name: e.target.value })}
                        className="input"
                        placeholder="e.g. Rahul Sharma"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[#5A5852] mb-1">Email Address</label>
                      <input
                        type="email"
                        value={ticketForm.email}
                        onChange={(e) => setTicketForm({ ...ticketForm, email: e.target.value })}
                        className="input"
                        placeholder="name@domain.com"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[#5A5852] mb-1">Order ID (Optional)</label>
                        <input
                          type="number"
                          value={ticketForm.orderId}
                          onChange={(e) => setTicketForm({ ...ticketForm, orderId: e.target.value })}
                          className="input"
                          placeholder="e.g. 104"
                        />
                      </div>

                      <div>
                        <label className="block text-[#5A5852] mb-1">Issue Category</label>
                        <select
                          value={ticketForm.issueType}
                          onChange={(e) => setTicketForm({ ...ticketForm, issueType: e.target.value })}
                          className="input"
                        >
                          <option value="Delivery Query">Delivery Schedule</option>
                          <option value="Payment Issue">Payment &amp; Refund</option>
                          <option value="Stock Lock">Stock Reservation</option>
                          <option value="Retail Return">In-Store Return</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[#5A5852] mb-1">Detailed Message</label>
                      <textarea
                        rows={3}
                        value={ticketForm.message}
                        onChange={(e) => setTicketForm({ ...ticketForm, message: e.target.value })}
                        className="input"
                        placeholder="Describe your inquiry..."
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={ticketSubmitting}
                      className="btn-primary w-full !py-2 flex items-center justify-center gap-2 mt-4"
                    >
                      {ticketSubmitting ? (
                        <>
                          <Loader2 size={13} className="animate-spin" />
                          <span>REGISTERING TICKET...</span>
                        </>
                      ) : (
                        <>
                          <MessageSquare strokeWidth={1.5} size={13} />
                          <span>REGISTER TICKET WITH RETAIL DESK</span>
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Footer Strip */}
          <div className="p-4 border-t border-[#E4E2DA] bg-[#F6F5F0] flex items-center justify-between text-xs font-mono">
            <span className="text-[#5A5852]">StockSync Retail Operations · 24×7 Hub Support</span>
            <button
              type="button"
              onClick={() => setIsSupportOpen(false)}
              className="btn-ghost !text-xs !py-1"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CustomerCareDrawer;

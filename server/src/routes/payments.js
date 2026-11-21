import { Router } from "express";
import crypto from "node:crypto";
import Razorpay from "razorpay";
import { config } from "../config.js";
import { requireAuth } from "../auth.js";
import { checkout, OutOfStockError } from "../checkout.js";
import { telemetry } from "../telemetry.js";

export const paymentsRouter = Router();
paymentsRouter.use(requireAuth);

let rzpInstance = null;
if (config.razorpay.keyId && config.razorpay.keySecret) {
  try {
    rzpInstance = new Razorpay({
      key_id: config.razorpay.keyId,
      key_secret: config.razorpay.keySecret,
    });
  } catch (err) {
    console.warn("[razorpay] Initialization warning:", err.message);
  }
}

// ── RAZORPAY ─────────────────────────────────────────────────────────────────
paymentsRouter.post("/razorpay/create-order", async (req, res) => {
  const amountPaise = Number(req.body.amountPaise);
  if (!amountPaise || amountPaise <= 0) {
    return res.status(400).json({ error: "Invalid amount." });
  }

  // If live credentials exist, create order via Razorpay API
  if (rzpInstance) {
    try {
      const order = await rzpInstance.orders.create({
        amount: amountPaise,
        currency: "INR",
        receipt: `rcpt_${Date.now()}`,
      });
      return res.json({
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        key: config.razorpay.keyId,
        sandbox: false,
      });
    } catch (err) {
      console.error("[razorpay] order creation failed, falling back to sandbox:", err.message);
    }
  }

  // Hackathon Sandbox Mode Fallback
  const mockOrder = {
    id: `order_rzp_${Date.now()}`,
    amount: amountPaise,
    currency: "INR",
    key: config.razorpay.keyId || "rzp_test_sandbox_stock_sync",
    sandbox: true,
  };

  telemetry.record({
    service: "PAYMENT_GATEWAY",
    type: "RAZORPAY_ORDER_CREATED",
    action: `Razorpay order created for INR ${(amountPaise / 100).toFixed(2)} [SANDBOX: ${mockOrder.sandbox}]`,
    status: "PENDING_VERIFICATION",
    orderId: mockOrder.id,
  });

  res.json(mockOrder);
});

paymentsRouter.post("/razorpay/verify", async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  if (!razorpay_order_id || !razorpay_payment_id) {
    return res.status(400).json({ error: "Missing Razorpay verification parameters." });
  }

  let verified = false;

  // Check signature if secret configured
  if (config.razorpay.keySecret && razorpay_signature) {
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected = crypto
      .createHmac("sha256", config.razorpay.keySecret)
      .update(body)
      .digest("hex");
    verified = expected === razorpay_signature;
  } else {
    // Sandbox simulation mode verified
    verified = true;
  }

  if (!verified) {
    return res.status(400).json({ error: "Razorpay signature verification failed." });
  }

  try {
    const orderResult = await checkout(req.user.id, {
      paymentMethod: "razorpay",
      paymentStatus: "paid",
      paymentRef: razorpay_payment_id,
    });

    telemetry.record({
      service: "PAYMENT_GATEWAY",
      type: "RAZORPAY_PAYMENT_VERIFIED",
      action: `Razorpay payment ${razorpay_payment_id} verified. Order #${orderResult.orderId} committed.`,
      status: "PAID",
      paymentRef: razorpay_payment_id,
      orderId: orderResult.orderId,
    });

    res.status(201).json({
      ok: true,
      ...orderResult,
      paymentMethod: "razorpay",
      paymentRef: razorpay_payment_id,
    });
  } catch (e) {
    if (e instanceof OutOfStockError) {
      return res.status(409).json({ error: "out_of_stock", message: "Items sold out during checkout.", items: e.items });
    }
    if (e.status) return res.status(e.status).json({ error: "checkout_failed", message: e.message });
    throw e;
  }
});

// ── PAYTM GATEWAY ────────────────────────────────────────────────────────────
paymentsRouter.post("/paytm/initiate", async (req, res) => {
  const amountPaise = Number(req.body.amountPaise);
  if (!amountPaise || amountPaise <= 0) {
    return res.status(400).json({ error: "Invalid amount." });
  }

  const orderId = `PAYTM_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const txnToken = `paytm_token_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;

  telemetry.record({
    service: "PAYMENT_GATEWAY",
    type: "PAYTM_TXN_INITIATED",
    action: `Paytm transaction initiated for order ${orderId} (INR ${(amountPaise / 100).toFixed(2)})`,
    status: "TXN_INITIATED",
    orderId,
  });

  res.json({
    orderId,
    txnToken,
    amountPaise,
    mid: config.paytm.mid || "STOCKS0029384756",
    sandbox: !config.paytm.merchantKey,
  });
});

paymentsRouter.post("/paytm/callback", async (req, res) => {
  const { orderId, txnId } = req.body;
  const paymentRef = txnId || `PAYTM_TXN_${Date.now()}`;

  try {
    const orderResult = await checkout(req.user.id, {
      paymentMethod: "paytm",
      paymentStatus: "paid",
      paymentRef,
    });

    telemetry.record({
      service: "PAYMENT_GATEWAY",
      type: "PAYTM_PAYMENT_CONFIRMED",
      action: `Paytm callback confirmed (${paymentRef}). Order #${orderResult.orderId} placed.`,
      status: "PAID",
      paymentRef,
      orderId: orderResult.orderId,
    });

    res.status(201).json({
      ok: true,
      ...orderResult,
      paymentMethod: "paytm",
      paymentRef,
    });
  } catch (e) {
    if (e instanceof OutOfStockError) {
      return res.status(409).json({ error: "out_of_stock", message: "Items sold out during checkout.", items: e.items });
    }
    if (e.status) return res.status(e.status).json({ error: "checkout_failed", message: e.message });
    throw e;
  }
});

// ── CASH ON DELIVERY (COD) ───────────────────────────────────────────────────
paymentsRouter.post("/cod", async (req, res) => {
  try {
    const orderResult = await checkout(req.user.id, {
      paymentMethod: "COD",
      paymentStatus: "pending",
      paymentRef: `COD_${Date.now()}`,
    });

    telemetry.record({
      service: "PAYMENT_GATEWAY",
      type: "COD_ORDER_PLACED",
      action: `Cash On Delivery selected. Order #${orderResult.orderId} committed.`,
      status: "PENDING_CASH_COLLECTION",
      orderId: orderResult.orderId,
    });

    res.status(201).json({
      ok: true,
      ...orderResult,
      paymentMethod: "COD",
      paymentStatus: "pending",
    });
  } catch (e) {
    if (e instanceof OutOfStockError) {
      return res.status(409).json({ error: "out_of_stock", message: "Items sold out during checkout.", items: e.items });
    }
    if (e.status) return res.status(e.status).json({ error: "checkout_failed", message: e.message });
    throw e;
  }
});

import { Router } from "express";
import { z } from "zod";
import { query } from "../db.js";
import { telemetry } from "../telemetry.js";

export const supportRouter = Router();

const ticketSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  orderId: z.number().int().positive().nullable().optional(),
  issueType: z.string().min(2).max(60),
  message: z.string().min(6).max(2000),
});

supportRouter.post("/tickets", async (req, res) => {
  const p = ticketSchema.safeParse(req.body);
  if (!p.success) {
    return res.status(400).json({ error: "Check ticket fields.", issues: p.error.issues });
  }

  const { name, email, orderId = null, issueType, message } = p.data;
  const userId = req.user?.id || null;
  const ticketRef = `TKT-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

  await query(
    `INSERT INTO support_tickets(ticket_ref, user_id, name, email, order_id, issue_type, message, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'open')`,
    [ticketRef, userId, name, email, orderId || null, issueType, message]
  );

  telemetry.record({
    service: "SUPPORT_DESK",
    type: "TICKET_CREATED",
    action: `Support ticket created: ${ticketRef} (${issueType})`,
    status: "OPEN",
    ticketRef,
    email,
    orderId,
  });

  res.status(201).json({
    ok: true,
    ticketRef,
    message: `Support ticket ${ticketRef} has been registered with StockSync Retail Ops. Our Indian city hub team will respond within 2 hours.`,
  });
});

supportRouter.get("/order-lookup/:orderId", async (req, res) => {
  const orderId = Number(req.params.orderId);
  if (!orderId) return res.status(400).json({ error: "Invalid order ID." });

  const orderRes = await query(
    `SELECT o.id, o.city, o.status, o.total_paise, o.payment_method, o.payment_status, o.created_at,
            u.email AS user_email, u.name AS user_name
       FROM orders o
       JOIN users u ON u.id = o.user_id
      WHERE o.id = $1`,
    [orderId]
  );

  if (!orderRes.rows.length) {
    return res.status(404).json({ error: `Order #${orderId} not found in PostgreSQL registry.` });
  }

  const order = orderRes.rows[0];

  const itemsRes = await query(
    `SELECT oi.product_id AS "productId", oi.name, oi.unit_paise AS "unitPaise", oi.quantity
       FROM order_items oi
      WHERE oi.order_id = $1`,
    [orderId]
  );

  const eventsRes = await query(
    `SELECT event_type, processed_at
       FROM processed_events
      WHERE event_id = $1 OR topic = 'stocksync.orders'
      ORDER BY processed_at DESC LIMIT 5`,
    [orderId]
  );

  res.json({
    order: {
      ...order,
      price: order.total_paise / 100,
      items: itemsRes.rows.map((i) => ({
        ...i,
        price: i.unitPaise / 100,
      })),
    },
    auditTrail: [
      { step: "Order Placed (ACID Row Lock)", timestamp: order.created_at, status: "COMPLETED" },
      { step: "Kafka Outbox Queued", timestamp: order.created_at, status: "COMPLETED" },
      {
        step: order.status === "placed" ? "Fulfillment Dispatch" : "Order Confirmed by Retail Hub",
        timestamp: order.created_at,
        status: order.status === "placed" ? "IN_PROGRESS" : "COMPLETED",
      },
    ],
  });
});

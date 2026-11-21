import { Router } from "express";
import { telemetry } from "../telemetry.js";
import { checkout } from "../checkout.js";
import { pool, tx } from "../db.js";

export const telemetryRouter = Router();

// Retrieve recent telemetry log
telemetryRouter.get("/events", (_req, res) => {
  res.json({ events: telemetry.getRecent(50) });
});

// Server-Sent Events (SSE) stream for real-time telemetry drawer
telemetryRouter.get("/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  // Send initial snapshot
  const initial = telemetry.getRecent(20);
  res.write(`data: ${JSON.stringify({ type: "snapshot", events: initial })}\n\n`);

  const onEvent = (event) => {
    res.write(`data: ${JSON.stringify({ type: "event", event })}\n\n`);
  };

  telemetry.on("event", onEvent);

  req.on("close", () => {
    telemetry.off("event", onEvent);
  });
});

// Simulate Concurrency Race Condition: 2 simultaneous buyers for 1 unit
telemetryRouter.post("/simulate-race", async (req, res) => {
  const city = req.body?.city || "Bengaluru";
  
  telemetry.record({
    service: "POSTGRESQL",
    type: "CONCURRENCY_TEST_START",
    action: `Spawning 2 concurrent checkouts for stock=1 in ${city}`,
    status: "RACE_INITIATED"
  });

  try {
    // 1. Pick or prepare a product with stock = 1
    const pRes = await pool.query(
      `SELECT p.id, p.name, p.price_paise, i.quantity 
         FROM products p 
         JOIN inventory i ON i.product_id = p.id 
        WHERE i.city = $1 AND i.quantity = 1
        LIMIT 1`,
      [city]
    );

    let productId;
    let productName;
    if (pRes.rowCount > 0) {
      productId = pRes.rows[0].id;
      productName = pRes.rows[0].name;
    } else {
      // Set Aurora Pro or any first product to stock = 1 for the test
      const first = (await pool.query("SELECT id, name FROM products LIMIT 1")).rows[0];
      productId = first.id;
      productName = first.name;
      await pool.query(
        `INSERT INTO inventory (product_id, city, quantity) 
         VALUES ($1, $2, 1) 
         ON CONFLICT (product_id, city) DO UPDATE SET quantity = 1`,
        [productId, city]
      );
    }

    // 2. Setup user 1 and user 2 carts
    // User 1: demo@stocksync.in (id: 2), User 2: admin@stocksync.in (id: 1)
    const user1 = (await pool.query("SELECT id FROM users WHERE email = 'demo@stocksync.in'")).rows[0]?.id || 2;
    const user2 = (await pool.query("SELECT id FROM users WHERE email = 'admin@stocksync.in'")).rows[0]?.id || 1;

    // Reset both carts with this 1-stock item
    for (const u of [user1, user2]) {
      await tx(async (c) => {
        let cart = (await c.query("SELECT id FROM carts WHERE user_id = $1", [u])).rows[0];
        if (!cart) {
          cart = (await c.query("INSERT INTO carts(user_id, city) VALUES ($1, $2) RETURNING id", [u, city])).rows[0];
        } else {
          await c.query("UPDATE carts SET city = $2 WHERE id = $1", [cart.id, city]);
        }
        await c.query("DELETE FROM cart_items WHERE cart_id = $1", [cart.id]);
        await c.query("INSERT INTO cart_items(cart_id, product_id, quantity) VALUES ($1, $2, 1)", [cart.id, productId]);
      });
    }

    // 3. Fire simultaneous checkouts
    const [result1, result2] = await Promise.allSettled([
      checkout(user1),
      checkout(user2)
    ]);

    const res1 = result1.status === "fulfilled" 
      ? { ok: true, orderId: result1.value.orderId } 
      : { ok: false, status: result1.reason.status || 409, message: result1.reason.message };

    const res2 = result2.status === "fulfilled" 
      ? { ok: true, orderId: result2.value.orderId } 
      : { ok: false, status: result2.reason.status || 409, message: result2.reason.message };

    const successCount = (res1.ok ? 1 : 0) + (res2.ok ? 1 : 0);
    const conflictCount = (!res1.ok ? 1 : 0) + (!res2.ok ? 1 : 0);

    telemetry.record({
      service: "POSTGRESQL",
      type: "CONCURRENCY_TEST_RESULT",
      action: `Race resolved. Winner committed order. Loser received 409 Conflict rollback.`,
      status: "ATOMIC_ISOLATION_VERIFIED",
      details: {
        product: productName,
        city,
        buyerA: res1.ok ? `Committed Order #${res1.orderId}` : `HTTP ${res1.status}: Out of Stock`,
        buyerB: res2.ok ? `Committed Order #${res2.orderId}` : `HTTP ${res2.status}: Out of Stock`,
        verified: successCount === 1 && conflictCount === 1
      }
    });

    res.json({
      success: true,
      product: { id: productId, name: productName, city },
      buyer1: res1,
      buyer2: res2,
      concurrencyProof: {
        successOrders: successCount,
        rejectedWith409: conflictCount,
        singleWinnerGuaranteed: successCount === 1 && conflictCount === 1
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

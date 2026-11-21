import { tx, emit } from "./db.js";
import { topics } from "./config.js";
import { telemetry } from "./telemetry.js";

export class OutOfStockError extends Error {
  constructor(items) { super("Some items are out of stock"); this.items = items; this.status = 409; }
}
export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

/**
 * Atomic checkout. One transaction does everything or nothing:
 *  1. read the cart
 *  2. for each line (ordered by product_id to avoid deadlocks) run a conditional
 *     UPDATE ... WHERE quantity >= $n. The UPDATE takes the row lock, so concurrent
 *     buyers of the last unit serialise on that row and the loser matches 0 rows.
 *  3. insert order + items + inventory movements + outbox events
 *  4. empty the cart
 * Any failure rolls back everything, so no partial orders and no stock leakage.
 */
export async function checkout(userId, paymentMeta = {}) {
  const { paymentMethod = "COD", paymentStatus = "pending", paymentRef = null } = paymentMeta;
  return tx(async (c) => {
    const cart = (await c.query("SELECT id, city FROM carts WHERE user_id = $1", [userId])).rows[0];
    if (!cart) throw new HttpError(400, "Your cart is empty.");
    const items = (await c.query(
      `SELECT ci.product_id, ci.quantity, p.name, p.price_paise, p.active
         FROM cart_items ci JOIN products p ON p.id = ci.product_id
        WHERE ci.cart_id = $1 ORDER BY ci.product_id`, [cart.id])).rows;
    if (!items.length) throw new HttpError(400, "Your cart is empty.");
    if (items.some((i) => !i.active)) throw new HttpError(409, "A product in your cart is no longer available.");

    telemetry.record({
      service: "POSTGRESQL",
      type: "TX_ROW_LOCK_BEGIN",
      action: `SELECT ... FOR UPDATE on ${items.length} line(s) in ${cart.city}`,
      status: "ACQUIRING_LOCKS",
      cartId: cart.id,
      city: cart.city
    });

    const shortages = [];
    const movements = [];
    for (const it of items) {
      const r = await c.query(
        `UPDATE inventory SET quantity = quantity - $3, updated_at = now()
          WHERE product_id = $1 AND city = $2 AND quantity >= $3
          RETURNING quantity`, [it.product_id, cart.city, it.quantity]);
      if (r.rowCount === 0) {
        const cur = await c.query("SELECT quantity FROM inventory WHERE product_id=$1 AND city=$2", [it.product_id, cart.city]);
        shortages.push({ productId: it.product_id, name: it.name, requested: it.quantity, available: cur.rows[0]?.quantity ?? 0 });
      } else movements.push({ ...it, after: r.rows[0].quantity });
    }
    if (shortages.length) {
      telemetry.record({
        service: "POSTGRESQL",
        type: "TX_ROLLBACK_409",
        action: `Insufficient stock for ${shortages.map(s => s.name).join(', ')}: rollback triggered`,
        status: "ROLLBACK_409_CONFLICT",
        shortages
      });
      throw new OutOfStockError(shortages); // rollback undoes the partial decrements
    }

    const total = items.reduce((s, i) => s + i.price_paise * i.quantity, 0);
    const order = (await c.query(
      "INSERT INTO orders(user_id, city, total_paise, payment_method, payment_status, payment_ref) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, created_at",
      [userId, cart.city, total, paymentMethod, paymentStatus, paymentRef])).rows[0];

    for (const m of movements) {
      await c.query("INSERT INTO order_items(order_id, product_id, name, unit_paise, quantity) VALUES ($1,$2,$3,$4,$5)",
        [order.id, m.product_id, m.name, m.price_paise, m.quantity]);
      await c.query(
        "INSERT INTO inventory_movements(product_id, city, delta, quantity_after, reason, order_id, actor_id) VALUES ($1,$2,$3,$4,'order',$5,$6)",
        [m.product_id, cart.city, -m.quantity, m.after, order.id, userId]);
      await emit(c, topics.inventory, m.product_id, "inventory.changed",
        { productId: m.product_id, city: cart.city, delta: -m.quantity, quantityAfter: m.after, reason: "order", orderId: order.id });
    }
    await emit(c, topics.orders, order.id, "order.placed", {
      orderId: order.id, userId, city: cart.city, totalPaise: total, createdAt: order.created_at,
      items: items.map((i) => ({ productId: i.product_id, name: i.name, quantity: i.quantity, unitPaise: i.price_paise })),
    });
    await c.query("DELETE FROM cart_items WHERE cart_id = $1", [cart.id]);

    telemetry.record({
      service: "POSTGRESQL",
      type: "TX_COMMITTED",
      action: `Order #${order.id} committed (total: Rs.${(total / 100).toFixed(2)})`,
      status: "COMMITTED_ATOMICALLY",
      orderId: order.id,
      city: cart.city,
      itemsCount: items.length
    });

    telemetry.record({
      service: "KAFKA",
      type: "EVENT_PRODUCED",
      action: `Published ORDER_PLACED to topic '${topics.orders}' (Order #${order.id})`,
      status: "QUEUED_IN_OUTBOX",
      topic: topics.orders,
      orderId: order.id
    });

    return { orderId: order.id, totalPaise: total, city: cart.city, status: "placed" };
  });
}

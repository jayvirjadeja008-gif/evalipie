import { runConsumer } from "./runner.js";
import { topics, config } from "../config.js";
import { os, INDEX, ensureIndex } from "../search.js";
import { buildProductDoc } from "../productDoc.js";
import { telemetry } from "../telemetry.js";

// 1. Order confirmation: placed -> confirmed + customer notification
export const orderConfirmationSpec = ({
  name: "order-confirmation", topics: [topics.orders],
  handle: async (c, e) => {
    if (e.type !== "order.placed") return;
    await c.query("UPDATE orders SET status='confirmed', updated_at=now() WHERE id=$1 AND status='placed'", [e.orderId]);
    await c.query(
      "INSERT INTO notifications(user_id, order_id, message) VALUES ($1,$2,$3) ON CONFLICT (order_id) DO NOTHING",
      [e.userId, e.orderId, `Order #${e.orderId} is confirmed. We are packing it at our ${e.city} store.`]);

    telemetry.record({
      service: "KAFKA",
      type: "ORDER_CONFIRMED",
      action: `Consumer [order-confirmation] marked Order #${e.orderId} confirmed in ${e.city}`,
      status: "CONSUMED_AND_CONFIRMED",
      orderId: e.orderId,
      city: e.city
    });
  },
});

// 2. Inventory updates: low / out-of-stock alerts for the admin dashboard
export const inventoryAlertsSpec = ({
  name: "inventory-alerts", topics: [topics.inventory],
  handle: async (c, e) => {
    if (e.type !== "inventory.changed" || e.delta >= 0) return;
    if (e.quantityAfter === 0) {
      await c.query("INSERT INTO stock_alerts(product_id, city, quantity, level) VALUES ($1,$2,0,'out')", [e.productId, e.city]);
      telemetry.record({
        service: "KAFKA",
        type: "INVENTORY_ALERT",
        action: `Consumer [inventory-alerts]: OUT_OF_STOCK alert for product #${e.productId} in ${e.city}`,
        status: "ALERT_OUT_OF_STOCK"
      });
    } else if (e.quantityAfter <= config.lowStockThreshold) {
      await c.query("INSERT INTO stock_alerts(product_id, city, quantity, level) VALUES ($1,$2,$3,'low')", [e.productId, e.city, e.quantityAfter]);
      telemetry.record({
        service: "KAFKA",
        type: "INVENTORY_ALERT",
        action: `Consumer [inventory-alerts]: LOW_STOCK alert (${e.quantityAfter} left) in ${e.city}`,
        status: "ALERT_LOW_STOCK"
      });
    }
  },
});

// 3. Search sync: rebuild the OpenSearch document from PostgreSQL (source of truth) on any product/stock change
export const searchSyncSpec = {
  name: "search-sync", topics: [topics.products, topics.inventory], external: true,
  handle: async (_c, e) => {
    const doc = await buildProductDoc(e.productId);
    if (doc) {
      await os.index({ index: INDEX, id: String(doc.id), body: doc, refresh: false });
      telemetry.record({
        service: "OPENSEARCH",
        type: "INDEX_SYNCED",
        action: `Consumer [search-sync]: Synced product #${doc.id} ("${doc.name}") into OpenSearch`,
        status: "OPENSEARCH_INDEXED",
        productId: doc.id,
        cities: doc.cities
      });
    } else {
      await os.delete({ index: INDEX, id: String(e.productId), refresh: false }, { ignore: [404] });
      telemetry.record({
        service: "OPENSEARCH",
        type: "INDEX_DELETED",
        action: `Consumer [search-sync]: Deleted product #${e.productId} from OpenSearch`,
        status: "OPENSEARCH_DELETED"
      });
    }
  },
};

// 4. Analytics: per-day, per-city order statistics
export const analyticsSpec = ({
  name: "order-analytics", topics: [topics.orders],
  handle: async (c, e) => {
    if (e.type === "order.placed") {
      const units = e.items.reduce((s, i) => s + i.quantity, 0);
      await c.query(
        `INSERT INTO order_stats(day, city, orders, units, revenue_paise) VALUES ((SELECT created_at::date FROM orders WHERE id=$1), $2, 1, $3, $4)
         ON CONFLICT (day, city) DO UPDATE SET orders=order_stats.orders+1, units=order_stats.units+$3, revenue_paise=order_stats.revenue_paise+$4`,
        [e.orderId, e.city, units, e.totalPaise]);
      telemetry.record({
        service: "KAFKA",
        type: "ANALYTICS_UPDATED",
        action: `Consumer [order-analytics]: Aggregated Order #${e.orderId} revenue for ${e.city}`,
        status: "ANALYTICS_PERSISTED"
      });
    } else if (e.type === "order.status_changed" && e.status === "cancelled") {
      const o = (await c.query("SELECT created_at::date AS day, city, total_paise, (SELECT sum(quantity) FROM order_items WHERE order_id=$1) AS units FROM orders WHERE id=$1", [e.orderId])).rows[0];
      if (o) await c.query("UPDATE order_stats SET orders=orders-1, units=units-$3, revenue_paise=revenue_paise-$4 WHERE day=$1 AND city=$2", [o.day, o.city, o.units, o.total_paise]);
    }
  },
});

export const specs = [orderConfirmationSpec, inventoryAlertsSpec, searchSyncSpec, analyticsSpec];
export async function startAllConsumers() {
  await ensureIndex();
  return Promise.all(specs.map(runConsumer));
}

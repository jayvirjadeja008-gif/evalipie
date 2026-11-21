import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { query } from "./db.js";
import { authRouter } from "./routes/auth.js";
import { catalogRouter, imageRouter } from "./routes/catalog.js";
import { cartRouter } from "./routes/cart.js";
import { ordersRouter } from "./routes/orders.js";
import { adminRouter } from "./routes/admin.js";
import { telemetryRouter } from "./routes/telemetry.js";
import { wishlistRouter } from "./routes/wishlist.js";
import { reviewsRouter } from "./routes/reviews.js";
import { supportRouter } from "./routes/support.js";
import { paymentsRouter } from "./routes/payments.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Express 4 does not catch async errors; wrap every handler on the routers we mount.
import "./asyncErrors.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "200kb" }));

app.get("/api/health", async (_q, res) => {
  try { await query("SELECT 1"); res.json({ ok: true }); } catch { res.status(503).json({ ok: false }); }
});
app.use("/img", imageRouter);
const productsPublic = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../web/public/products");
if (fs.existsSync(productsPublic)) {
  app.use("/products", express.static(productsPublic));
}
app.use("/api/auth", authRouter);
app.use("/api", catalogRouter);
app.use("/api/cart", cartRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/admin", adminRouter);
app.use("/api/wishlist", wishlistRouter);
app.use("/api/products", reviewsRouter);
app.use("/api/reviews", reviewsRouter);
app.use("/api/support", supportRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/telemetry", telemetryRouter);
app.use("/api/events", telemetryRouter);

// Serve the built React app (single website for storefront + admin) when present.
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../web/dist");
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^(?!\/api|\/img).*/, (_q, res) => res.sendFile(path.join(dist, "index.html")));
}

app.use((err, _req, res, _next) => {
  console.error("[error]", err);
  res.status(500).json({ error: "Something went wrong on our side. Try again." });
});

app.listen(config.port, () => console.log(`[api] listening on :${config.port}`));

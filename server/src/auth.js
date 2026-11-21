import jwt from "jsonwebtoken";
import { config } from "./config.js";
import { query } from "./db.js";

export const sign = (u) => jwt.sign({ sub: u.id, role: u.role }, config.jwtSecret, { expiresIn: "7d" });

export async function requireAuth(req, res, next) {
  const h = req.headers.authorization || "";
  if (!h.startsWith("Bearer ")) return res.status(401).json({ error: "Sign in to continue." });
  try {
    const p = jwt.verify(h.slice(7), config.jwtSecret);
    const { rows } = await query("SELECT id, email, name, role FROM users WHERE id = $1", [p.sub]);
    if (!rows.length) return res.status(401).json({ error: "Account no longer exists." });
    req.user = rows[0];
    next();
  } catch { res.status(401).json({ error: "Session expired. Sign in again." }); }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Admin access required." });
  next();
}

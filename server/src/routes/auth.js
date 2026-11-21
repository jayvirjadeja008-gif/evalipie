import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { query } from "../db.js";
import { sign, requireAuth } from "../auth.js";

export const authRouter = Router();
const creds = z.object({ email: z.string().email().toLowerCase(), password: z.string().min(6) });

authRouter.post("/register", async (req, res) => {
  const p = creds.extend({ name: z.string().min(1).max(80) }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "Enter a name, a valid email and a password of at least 6 characters." });
  const { email, password, name } = p.data;
  const hash = await bcrypt.hash(password, 8);
  try {
    const { rows } = await query("INSERT INTO users(email,name,password_hash) VALUES ($1,$2,$3) RETURNING id,email,name,role", [email, name, hash]);
    res.status(201).json({ token: sign(rows[0]), user: rows[0] });
  } catch (e) {
    if (e.code === "23505") return res.status(409).json({ error: "An account with this email already exists." });
    throw e;
  }
});

authRouter.post("/login", async (req, res) => {
  const p = creds.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "Enter your email and password." });
  const { rows } = await query("SELECT * FROM users WHERE email = $1", [p.data.email]);
  if (!rows.length || !(await bcrypt.compare(p.data.password, rows[0].password_hash)))
    return res.status(401).json({ error: "Email or password is incorrect." });
  const u = { id: rows[0].id, email: rows[0].email, name: rows[0].name, role: rows[0].role };
  res.json({ token: sign(u), user: u });
});

authRouter.get("/me", requireAuth, (req, res) => res.json({ user: req.user }));

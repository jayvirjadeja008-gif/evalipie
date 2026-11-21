export class ApiError extends Error {
  constructor(public status: number, message: string, public data: any = {}) { super(message); }
}
export const getToken = () => localStorage.getItem("ss_token");
export const setToken = (t: string | null) => (t ? localStorage.setItem("ss_token", t) : localStorage.removeItem("ss_token"));

export async function api<T = any>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = getToken();
  let res: Response;
  try {
    res = await fetch("/api" + path, {
      method: opts.method || "GET",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    });
  } catch { throw new ApiError(0, "Cannot reach the server. Check your connection and try again."); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.message || data.error || "Request failed", data);
  return data as T;
}

export const inr = (rupees: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(rupees);
export const inrPaise = (p: number) => inr(p / 100);
export const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

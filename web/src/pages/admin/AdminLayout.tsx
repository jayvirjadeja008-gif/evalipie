import { NavLink, Outlet } from "react-router-dom";
const links = [["/admin", "Overview", true], ["/admin/products", "Products", false], ["/admin/inventory", "Inventory", false], ["/admin/orders", "Orders", false], ["/admin/events", "Event pipeline", false]] as const;
export default function AdminLayout() {
  return (
    <div className="grid gap-8 md:grid-cols-[200px_1fr]">
      <nav className="flex gap-1 overflow-x-auto md:flex-col" aria-label="Admin">
        {links.map(([to, label, end]) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold ${isActive ? "bg-ink text-white" : "text-ink-700 hover:bg-ink-100"}`}>{label}</NavLink>
        ))}
      </nav>
      <div className="min-w-0"><Outlet /></div>
    </div>
  );
}

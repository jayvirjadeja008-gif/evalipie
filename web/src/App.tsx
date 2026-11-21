import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Layout } from "./components/Layout";
import { useApp } from "./store";
import { Spinner } from "./components/ui";
import Storefront from "./pages/Storefront";
import ProductPage from "./pages/ProductPage";
import CartPage from "./pages/CartPage";
import { OrdersPage, OrderDetail } from "./pages/Orders";
import Login from "./pages/Login";
import AdminLayout from "./pages/admin/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import AdminProducts from "./pages/admin/Products";
import AdminInventory from "./pages/admin/Inventory";
import AdminOrders from "./pages/admin/Orders";
import AdminEvents from "./pages/admin/Events";
import { LoginGateway } from "./components/LoginGateway";

function Guard({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const { user, ready, openGateway } = useApp();
  const loc = useLocation();
  if (!ready) return <Spinner />;
  if (!user) {
    openGateway();
    return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname)}`} replace />;
  }
  if (admin && user.role !== "admin") return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  const { isGatewayOpen, ready } = useApp();

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#F6F5F0] flex flex-col items-center justify-center font-mono text-xs text-[#5A5852] gap-3">
        <div className="w-8 h-8 border-2 border-[#111111] border-t-transparent animate-spin rounded-[0px]" />
        <span>INITIALIZING ARCHITECTURAL RETAIL GATEWAY...</span>
      </div>
    );
  }

  return (
    <div
      className="relative w-full min-h-screen overflow-x-hidden bg-[#F6F5F0]"
      style={{ perspective: "1400px" }}
    >
      <AnimatePresence mode="wait">
        {isGatewayOpen ? (
          <motion.div
            key="login-gateway-landing"
            initial={{ opacity: 1, scale: 1, rotateX: 0 }}
            exit={{
              opacity: 0,
              scale: 0.92,
              rotateX: 8,
              transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
            }}
            className="w-full min-h-screen"
            style={{ transformOrigin: "center center" }}
          >
            <LoginGateway />
          </motion.div>
        ) : (
          <motion.div
            key="main-storefront-application"
            initial={{ opacity: 0, scale: 1.04, y: 12 }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
              transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
            }}
            className="w-full min-h-screen"
            style={{ transformOrigin: "center center" }}
          >
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<Storefront />} />
                <Route path="product/:id" element={<ProductPage />} />
                <Route path="login" element={<Login />} />
                <Route
                  path="cart"
                  element={
                    <Guard>
                      <CartPage />
                    </Guard>
                  }
                />
                <Route
                  path="orders"
                  element={
                    <Guard>
                      <OrdersPage />
                    </Guard>
                  }
                />
                <Route
                  path="orders/:id"
                  element={
                    <Guard>
                      <OrderDetail />
                    </Guard>
                  }
                />
                <Route
                  path="admin"
                  element={
                    <Guard admin>
                      <AdminLayout />
                    </Guard>
                  }
                >
                  <Route index element={<Dashboard />} />
                  <Route path="products" element={<AdminProducts />} />
                  <Route path="inventory" element={<AdminInventory />} />
                  <Route path="orders" element={<AdminOrders />} />
                  <Route path="events" element={<AdminEvents />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

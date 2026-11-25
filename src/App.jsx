import { lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import AdminLayout from "./Components/AdminLayout";
import RequirePermission from "./Components/RequirePermission";
import { ConfirmProvider } from "./Components/ui";
import Login from "./Pages/Login";

// each admin screen is its own chunk (recharts only loads with dashboard/reports)
const Dashboard = lazy(() => import("./Pages/Dashboard"));
const Reports = lazy(() => import("./Pages/Reports"));
const Products = lazy(() => import("./Pages/Products"));
const ProductForm = lazy(() => import("./Pages/ProductForm"));
const Categories = lazy(() => import("./Pages/Categories"));
const Inventory = lazy(() => import("./Pages/Inventory"));
const Orders = lazy(() => import("./Pages/Orders"));
const OrderDetail = lazy(() => import("./Pages/OrderDetail"));
const OrderInvoice = lazy(() => import("./Pages/OrderInvoice"));
const Returns = lazy(() => import("./Pages/Returns"));
const Customers = lazy(() => import("./Pages/Customers"));
const CustomerDetail = lazy(() => import("./Pages/CustomerDetail"));
const Coupons = lazy(() => import("./Pages/Coupons"));
const Offers = lazy(() => import("./Pages/Offers"));
const Newsletter = lazy(() => import("./Pages/Newsletter"));
const Reviews = lazy(() => import("./Pages/Reviews"));
const Support = lazy(() => import("./Pages/Support"));
const Banners = lazy(() => import("./Pages/Banners"));
const Content = lazy(() => import("./Pages/Content"));
const Settings = lazy(() => import("./Pages/Settings"));
const Staff = lazy(() => import("./Pages/Staff"));
const AuditLog = lazy(() => import("./Pages/AuditLog"));

const guard = (perm, el) => <RequirePermission perm={perm}>{el}</RequirePermission>;

function App() {
  return (
    <BrowserRouter>
      <ConfirmProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: { borderRadius: "12px", background: "#171826", color: "#fff", fontSize: "14px" },
            success: { iconTheme: { primary: "#34d399", secondary: "#171826" } },
            error: { iconTheme: { primary: "#fb7185", secondary: "#171826" } },
          }}
        />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<AdminLayout />}>
            <Route path="/" element={guard("dashboard", <Dashboard />)} />
            <Route path="/reports" element={guard("reports", <Reports />)} />

            <Route path="/products" element={guard("products", <Products />)} />
            <Route path="/add" element={guard("products", <ProductForm />)} />
            <Route path="/products/:id/edit" element={guard("products", <ProductForm />)} />
            <Route path="/categories" element={guard("categories", <Categories />)} />
            <Route path="/inventory" element={guard("inventory", <Inventory />)} />

            <Route path="/orders" element={guard("orders", <Orders />)} />
            <Route path="/orders/:id" element={guard("orders", <OrderDetail />)} />
            <Route path="/orders/:id/invoice" element={guard("orders", <OrderInvoice />)} />
            <Route path="/returns" element={guard("orders", <Returns />)} />
            <Route path="/customers" element={guard("customers", <Customers />)} />
            <Route path="/customers/:id" element={guard("customers", <CustomerDetail />)} />
            {/* old "Users" screen → customers */}
            <Route path="/users" element={<Navigate to="/customers" replace />} />

            <Route path="/coupons" element={guard("coupons", <Coupons />)} />
            <Route path="/offers" element={guard("coupons", <Offers />)} />
            <Route path="/newsletter" element={guard("content", <Newsletter />)} />
            <Route path="/reviews" element={guard("reviews", <Reviews />)} />
            <Route path="/support" element={guard("support", <Support />)} />

            <Route path="/banner" element={guard("content", <Banners />)} />
            <Route path="/content" element={guard("content", <Content />)} />

            <Route path="/settings" element={guard("settings", <Settings />)} />
            <Route path="/staff" element={guard("staff", <Staff />)} />
            <Route path="/audit" element={guard("audit", <AuditLog />)} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </ConfirmProvider>
    </BrowserRouter>
  );
}

export default App;

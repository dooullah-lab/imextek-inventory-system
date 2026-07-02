// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import AppLayout from "./components/AppLayout";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import POS from "./pages/POS";
import Inventory from "./pages/Inventory";
import Analytics from "./pages/Analytics";
import ActivityLog from "./pages/ActivityLog";
import Users from "./pages/Users";
import Profile from "./pages/Profile";
import Categories from "./pages/Categories";
import Expenses from "./pages/Expenses";
import Reports from "./pages/Reports";

// Redirect to the right home page based on role
function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "staff") return <Navigate to="/pos" replace />;
  return <Dashboard />;
}

// Only admin & manager can access this route; staff get sent to /pos
function ManagerRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "staff") return <Navigate to="/pos" replace />;
  return children;
}

// Only admin can access
function AdminRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <Navigate to="/pos" replace />;
  return children;
}

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route index element={<HomeRedirect />} />
            {/* All roles */}
            <Route path="pos" element={<POS />} />
            <Route path="profile" element={<Profile />} />
            {/* Admin & Manager only */}
            <Route path="inventory" element={<ManagerRoute><Inventory /></ManagerRoute>} />
            <Route path="analytics" element={<ManagerRoute><Analytics /></ManagerRoute>} />
            <Route path="expenses" element={<ManagerRoute><Expenses /></ManagerRoute>} />
            <Route path="reports" element={<ManagerRoute><Reports /></ManagerRoute>} />
            <Route path="activity" element={<ManagerRoute><ActivityLog /></ManagerRoute>} />
            <Route path="categories" element={<ManagerRoute><Categories /></ManagerRoute>} />
            {/* Admin only */}
            <Route path="users" element={<AdminRoute><Users /></AdminRoute>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

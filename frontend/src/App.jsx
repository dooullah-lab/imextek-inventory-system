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
import Branches from "./pages/Branches";
import BranchComparison from "./pages/BranchComparison";
import MasterCatalogue from "./pages/MasterCatalogue";

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "staff") return <Navigate to="/pos" replace />;
  return <Dashboard />;
}

function ManagerRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "staff") return <Navigate to="/pos" replace />;
  return children;
}

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
            {/* Manager + Admin */}
            <Route path="inventory" element={<ManagerRoute><Inventory /></ManagerRoute>} />
            <Route path="analytics" element={<ManagerRoute><Analytics /></ManagerRoute>} />
            <Route path="expenses" element={<ManagerRoute><Expenses /></ManagerRoute>} />
            <Route path="reports" element={<ManagerRoute><Reports /></ManagerRoute>} />
            <Route path="activity" element={<ManagerRoute><ActivityLog /></ManagerRoute>} />
            <Route path="categories" element={<ManagerRoute><Categories /></ManagerRoute>} />
            <Route path="master-catalogue" element={<ManagerRoute><MasterCatalogue /></ManagerRoute>} />
            {/* Admin only */}
            <Route path="branches" element={<AdminRoute><Branches /></AdminRoute>} />
            <Route path="branch-comparison" element={<AdminRoute><BranchComparison /></AdminRoute>} />
            {/* Admin + Manager — managers see only their branch users */}
            <Route path="users" element={<ManagerRoute><Users /></ManagerRoute>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

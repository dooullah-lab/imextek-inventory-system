// src/components/AppLayout.jsx
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/logo.png";
import {
  LayoutDashboard, LayoutGrid, BarChart3, History,
  LogOut, Menu, X, ShieldCheck, Tag, UserCircle,
  Receipt, ShoppingCart, FileText, GitBranch, BookOpen,
} from "lucide-react";
import { useState } from "react";

const fullNavItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/pos", label: "Point of Sale", icon: ShoppingCart },
  { to: "/inventory", label: "Inventory", icon: LayoutGrid },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/expenses", label: "Operating Expenses", icon: Receipt },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/activity", label: "Activity Log", icon: History },
  { to: "/categories", label: "Categories", icon: Tag },
  { to: "/users", label: "Users & Roles", icon: ShieldCheck },
  { to: "/master-catalogue", label: "Master Catalogue", icon: BookOpen },
];

const adminNavItems = [
  { to: "/branches", label: "Branches", icon: GitBranch },
  { to: "/branch-comparison", label: "Branch Comparison", icon: BarChart3 },
  { to: "/master-catalogue", label: "Master Catalogue", icon: BookOpen },
  { to: "/users", label: "Users & Roles", icon: ShieldCheck },
];

const staffNavItems = [
  { to: "/pos", label: "Point of Sale", icon: ShoppingCart, end: true },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isStaff = user?.role === "staff";
  const isAdmin = user?.role === "admin";

  const navItems = isStaff
    ? staffNavItems
    : isAdmin
    ? [...fullNavItems, ...adminNavItems]
    : fullNavItems;

  const handleLogout = () => { logout(); navigate("/login"); };

  const SidebarContent = () => (
    <>
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-brand-50">
        <img src={logo} alt="ImEx-Tek" className="h-9 w-auto" />
      </div>

      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors " +
              (isActive ? "bg-brand-500 text-white" : "text-brand-600 hover:bg-brand-50")
            }>
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 pb-5 pt-2 border-t border-brand-50">
        <NavLink to="/profile" onClick={() => setMobileOpen(false)}
          className={({ isActive }) =>
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-1 " +
            (isActive ? "bg-brand-500 text-white" : "text-brand-600 hover:bg-brand-50")
          }>
          {user?.avatar
            ? <img src={user.avatar} alt="" className="w-[17px] h-[17px] rounded-full object-cover" />
            : <UserCircle size={17} />}
          My Profile
        </NavLink>
        <div className="flex items-center gap-2.5 px-3 py-1.5 mb-1">
          {user?.avatar
            ? <img src={user.avatar} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
            : <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                <UserCircle size={16} className="text-brand-400" />
              </div>}
          <div className="min-w-0">
            <p className="text-sm font-medium text-brand-700 truncate">{user?.name || user?.email}</p>
            <p className="text-xs text-brand-300 capitalize">
              {user?.role}
              {user?.branchName && ` · ${user.branchName}`}
            </p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                     text-brand-500 hover:bg-red-50 hover:text-red-600 transition-colors">
          <LogOut size={17} /> Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-canvas flex">
      <aside className="hidden md:flex md:flex-col w-60 bg-white border-r border-brand-50 fixed h-screen">
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-white flex flex-col shadow-xl">
            <button onClick={() => setMobileOpen(false)} className="absolute right-3 top-5 text-brand-400">
              <X size={20} />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex-1 md:ml-60">
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-brand-50 sticky top-0 z-30">
          <img src={logo} alt="ImEx-Tek" className="h-7 w-auto" />
          <button onClick={() => setMobileOpen(true)} className="text-brand-600">
            <Menu size={22} />
          </button>
        </div>
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

// src/pages/StaffDashboard.jsx
// Staff see ONLY this after login — POS screen + low stock alerts.
// No business data (revenue, expenses, analytics) is visible.
import POS from "./POS";

export default function StaffDashboard() {
  return <POS />;
}

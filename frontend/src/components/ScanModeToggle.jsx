// src/components/ScanModeToggle.jsx
import { Scan, ScanLine } from "lucide-react";

export default function ScanModeToggle({ enabled, onToggle }) {
  return (
    <button
      onClick={onToggle}
      title={enabled ? "Scan mode ON — scanner ready" : "Click to enable barcode scan mode"}
      className={
        "flex items-center gap-2 text-sm font-medium rounded-lg px-3.5 py-2 border transition-all " +
        (enabled
          ? "bg-brand-500 text-white border-brand-500 shadow-sm animate-pulse-slow"
          : "bg-white text-brand-500 border-brand-100 hover:border-brand-300")
      }
    >
      {enabled ? <ScanLine size={16} /> : <Scan size={16} />}
      {enabled ? "Scan Mode ON" : "Scan Mode"}
    </button>
  );
}

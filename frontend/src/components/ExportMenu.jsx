// src/components/ExportMenu.jsx
import { useState, useRef, useEffect } from "react";
import { Download, FileText, FileSpreadsheet, FileType } from "lucide-react";
import { exportToCSV, exportToExcel, exportToPDF } from "../utils/exporters";

// Usage: <ExportMenu filename="inventory" title="Inventory Report" columns={cols} rows={rows} />
export default function ExportMenu({ filename, title, columns, rows }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const disabled = !rows || rows.length === 0;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        className="flex items-center gap-2 text-sm font-medium text-brand-600 bg-white border border-brand-100
                   hover:border-brand-300 rounded-lg px-3.5 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Download size={15} /> Download
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-44 bg-white border border-brand-50 rounded-lg shadow-cardHover z-20 overflow-hidden">
          <button
            onClick={() => { exportToCSV(filename, columns, rows); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-brand-600 hover:bg-brand-50 transition-colors"
          >
            <FileText size={15} /> CSV
          </button>
          <button
            onClick={() => { exportToExcel(filename, columns, rows); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-brand-600 hover:bg-brand-50 transition-colors"
          >
            <FileSpreadsheet size={15} /> Excel
          </button>
          <button
            onClick={() => { exportToPDF(filename, title, columns, rows); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-brand-600 hover:bg-brand-50 transition-colors"
          >
            <FileType size={15} /> PDF
          </button>
        </div>
      )}
    </div>
  );
}

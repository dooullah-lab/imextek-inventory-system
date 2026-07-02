// src/components/BulkUpload.jsx
import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import api from "../api/client";
import Modal from "./Modal";
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle, Download } from "lucide-react";

export default function BulkUpload({ open, onClose, onSuccess }) {
  const fileRef = useRef(null);
  const [preview, setPreview] = useState(null); // parsed rows before upload
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const reset = () => {
    setPreview(null);
    setFileName("");
    setResult(null);
    setError("");
  };

  const handleClose = () => { reset(); onClose(); };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setError("");
    setResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const workbook = XLSX.read(evt.target.result, { type: "binary" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);
        if (rows.length === 0) {
          setError("The file appears to be empty or has no readable rows.");
          return;
        }
        setPreview(rows);
      } catch (err) {
        setError("Could not read this file. Make sure it's a valid Excel (.xlsx) or CSV file.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleUpload = async () => {
    if (!preview || preview.length === 0) return;
    setUploading(true);
    setError("");
    try {
      const res = await api.post("/products/bulk-upload", { rows: preview });
      setResult(res.data);
      setPreview(null);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const template = [
      {
        name: "Example Product",
        category: "Electronics",
        quantity: 10,
        purchasePrice: 5000,
        sellingPrice: 8000,
        lowStockThreshold: 5,
      },
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Products");
    XLSX.writeFile(wb, "ImExTek_Product_Upload_Template.xlsx");
  };

  return (
    <Modal open={open} onClose={handleClose} title="Bulk Upload Products">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-brand-400">
            Upload an Excel (.xlsx) or CSV file to import multiple products at once.
          </p>
          <button onClick={downloadTemplate}
            className="flex items-center gap-1.5 text-xs text-brand-500 hover:text-brand-700 shrink-0 ml-3">
            <Download size={13} /> Template
          </button>
        </div>

        {!result ? (
          <>
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-brand-100 rounded-xl p-8 text-center cursor-pointer hover:border-brand-300 transition-colors">
              <FileSpreadsheet size={28} className="text-brand-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-brand-600">
                {fileName || "Click to select file"}
              </p>
              <p className="text-xs text-brand-300 mt-1">Excel (.xlsx) or CSV</p>
              <input ref={fileRef} type="file" accept=".xlsx,.csv,.xls" className="hidden" onChange={handleFile} />
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5 text-sm text-red-700">
                <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            {preview && (
              <div>
                <p className="text-sm font-medium text-brand-700 mb-2">
                  Preview — {preview.length} rows found
                </p>
                <div className="max-h-44 overflow-y-auto bg-brand-50 rounded-lg p-3 space-y-1.5">
                  {preview.slice(0, 10).map((row, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-brand-700 font-medium">
                        {row.name || row.Name || "(no name)"}
                      </span>
                      <span className="text-brand-400">
                        qty: {row.quantity || row.Quantity || 0} · sell: ₦{row.sellingPrice || row["Selling Price"] || row.price || 0}
                      </span>
                    </div>
                  ))}
                  {preview.length > 10 && (
                    <p className="text-xs text-brand-300 text-center">
                      ...and {preview.length - 10} more rows
                    </p>
                  )}
                </div>
                <button onClick={handleUpload} disabled={uploading}
                  className="w-full mt-3 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium
                             rounded-lg py-2.5 flex items-center justify-center gap-2 disabled:opacity-60">
                  <Upload size={15} />
                  {uploading ? "Uploading..." : `Import ${preview.length} products`}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-4">
            <CheckCircle size={32} className="text-green-500 mx-auto mb-3" />
            <p className="font-medium text-brand-700 mb-1">Upload complete</p>
            <p className="text-sm text-brand-400">
              {result.created} products imported successfully
              {result.skipped > 0 && `, ${result.skipped} rows skipped (missing name)`}
              {result.errors?.length > 0 && `, ${result.errors.length} errors`}
            </p>
            <button onClick={handleClose}
              className="mt-4 bg-brand-500 text-white text-sm font-medium rounded-lg px-5 py-2">
              Done
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}

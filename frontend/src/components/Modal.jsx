// src/components/Modal.jsx
import { X } from "lucide-react";

export default function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display text-lg font-semibold text-brand-700">{title}</h3>
          <button onClick={onClose} className="text-brand-300 hover:text-brand-600">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

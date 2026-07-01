// src/components/Receipt.jsx
import { useRef } from "react";
import { Printer, X } from "lucide-react";

const formatNaira = (n) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n || 0);

export default function Receipt({ open, onClose, transaction }) {
  const printRef = useRef(null);

  if (!open || !transaction) return null;

  const handlePrint = () => {
    const content = printRef.current.innerHTML;
    const win = window.open("", "_blank", "width=400,height=600");
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>ImEx-Tek Receipt</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Inter', sans-serif; padding: 24px; color: #01283A; font-size: 13px; }
            .receipt { max-width: 320px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 1px dashed #CCDCE5; padding-bottom: 16px; margin-bottom: 16px; }
            .logo { width: 120px; height: auto; margin-bottom: 8px; }
            .company { font-size: 16px; font-weight: 600; color: #014260; }
            .sub { font-size: 11px; color: #6696B2; margin-top: 2px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 8px; }
            .label { color: #6696B2; }
            .value { font-weight: 500; }
            .divider { border-top: 1px dashed #CCDCE5; margin: 12px 0; }
            .total-row { display: flex; justify-content: space-between; font-size: 15px; font-weight: 600; color: #014260; }
            .footer { text-align: center; font-size: 11px; color: #6696B2; margin-top: 16px; padding-top: 12px; border-top: 1px dashed #CCDCE5; }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  const date = new Date(transaction.timestamp);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display text-lg font-semibold text-brand-700">Sale Receipt</h3>
          <button onClick={onClose} className="text-brand-300 hover:text-brand-600">
            <X size={20} />
          </button>
        </div>

        {/* Printable area */}
        <div ref={printRef}>
          <div className="receipt">
            <div className="header">
              <img src={`${window.location.origin}/assets/logo.png`} alt="ImEx-Tek" className="logo" />
              <div className="company">ImEx-Tek Global Ltd</div>
              <div className="sub">Cloud Services Division &middot; Katsina, Nigeria</div>
            </div>

            <div className="row"><span className="label">Receipt No.</span><span className="value">#{transaction.transactionId?.slice(0, 8).toUpperCase()}</span></div>
            <div className="row"><span className="label">Date</span><span className="value">{date.toLocaleDateString("en-NG")}</span></div>
            <div className="row"><span className="label">Time</span><span className="value">{date.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}</span></div>

            <div className="divider" />

            <div className="row"><span className="label">Product</span><span className="value">{transaction.productName}</span></div>
            <div className="row"><span className="label">Unit Price</span><span className="value">{formatNaira(transaction.unitPrice)}</span></div>
            <div className="row"><span className="label">Quantity</span><span className="value">{transaction.quantity}</span></div>

            <div className="divider" />

            <div className="total-row">
              <span>Total</span>
              <span>{formatNaira(transaction.total)}</span>
            </div>

            <div className="footer">
              Thank you for your business!<br />
              ImEx-Tek Global Ltd &middot; imex-tek.com
            </div>
          </div>
        </div>

        <button onClick={handlePrint}
          className="w-full mt-5 flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600
                     text-white text-sm font-medium rounded-lg py-2.5 transition-colors">
          <Printer size={16} /> Print Receipt
        </button>
      </div>
    </div>
  );
}

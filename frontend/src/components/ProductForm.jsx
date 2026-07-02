// src/components/ProductForm.jsx
// Defined OUTSIDE any parent component so React never unmounts/remounts
// it on re-render — fixes the typing lag / lost focus bug.
import { formatNaira } from "../utils/format";

export function CategorySelect({ value, onChange, categories }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-brand-100 px-3 py-2 text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none bg-white"
    >
      <option value="">Select category</option>
      {categories.map((c) => (
        <option key={c.categoryId} value={c.name}>{c.name}</option>
      ))}
      <option value="Uncategorized">Uncategorized</option>
    </select>
  );
}

export default function ProductForm({ data, setData, onSubmit, submitLabel, submitting, categories, showQuantity }) {
  const margin = Number(data.sellingPrice) - Number(data.purchasePrice);
  const marginPct = Number(data.purchasePrice) > 0
    ? ((margin / Number(data.purchasePrice)) * 100).toFixed(1)
    : 0;

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input
        required
        placeholder="Product name"
        value={data.name}
        onChange={(e) => setData({ ...data, name: e.target.value })}
        className="w-full rounded-lg border border-brand-100 px-3 py-2 text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none"
      />
      <CategorySelect
        value={data.category}
        onChange={(val) => setData({ ...data, category: val })}
        categories={categories}
      />
      {showQuantity && (
        <input
          required
          type="number"
          min="0"
          placeholder="Initial quantity"
          value={data.quantity}
          onChange={(e) => setData({ ...data, quantity: e.target.value })}
          className="w-full rounded-lg border border-brand-100 px-3 py-2 text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none"
        />
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-brand-400 mb-1">Purchase Price (₦)</label>
          <input
            required
            type="number"
            min="0"
            placeholder="Cost price"
            value={data.purchasePrice}
            onChange={(e) => setData({ ...data, purchasePrice: e.target.value })}
            className="w-full rounded-lg border border-brand-100 px-3 py-2 text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs text-brand-400 mb-1">Selling Price (₦)</label>
          <input
            required
            type="number"
            min="0"
            placeholder="Sale price"
            value={data.sellingPrice}
            onChange={(e) => setData({ ...data, sellingPrice: e.target.value })}
            className="w-full rounded-lg border border-brand-100 px-3 py-2 text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none"
          />
        </div>
      </div>
      {data.purchasePrice && data.sellingPrice && (
        <div className={"rounded-lg px-3 py-2 text-xs " + (margin > 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700")}>
          Margin: ₦{margin.toLocaleString()} per unit ({marginPct}%)
        </div>
      )}
      <input
        type="number"
        min="0"
        placeholder="Low stock threshold (default 5)"
        value={data.lowStockThreshold}
        onChange={(e) => setData({ ...data, lowStockThreshold: e.target.value })}
        className="w-full rounded-lg border border-brand-100 px-3 py-2 text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none"
      />
      <button
        disabled={submitting}
        type="submit"
        className="w-full bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg py-2.5 disabled:opacity-60"
      >
        {submitting ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}

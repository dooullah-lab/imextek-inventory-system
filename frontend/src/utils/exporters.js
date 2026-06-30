// src/utils/exporters.js
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// columns: [{ key: 'name', label: 'Product' }, ...]
// rows: array of plain objects

export function exportToCSV(filename, columns, rows) {
  const worksheet = XLSX.utils.json_to_sheet(
    rows.map((row) => {
      const obj = {};
      columns.forEach((col) => { obj[col.label] = row[col.key]; });
      return obj;
    })
  );
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  downloadBlob(csv, filename + ".csv", "text/csv;charset=utf-8;");
}

export function exportToExcel(filename, columns, rows) {
  const worksheet = XLSX.utils.json_to_sheet(
    rows.map((row) => {
      const obj = {};
      columns.forEach((col) => { obj[col.label] = row[col.key]; });
      return obj;
    })
  );
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
  XLSX.writeFile(workbook, filename + ".xlsx");
}

export function exportToPDF(filename, title, columns, rows) {
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.setTextColor(1, 66, 96); // brand color
  doc.text(title, 14, 16);
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text("ImEx-Tek Global Ltd \u00b7 Generated " + new Date().toLocaleString("en-NG"), 14, 22);

  autoTable(doc, {
    startY: 28,
    head: [columns.map((c) => c.label)],
    body: rows.map((row) => columns.map((c) => String(row[c.key] ?? ""))),
    headStyles: { fillColor: [1, 66, 96] },
    styles: { fontSize: 8 },
  });

  doc.save(filename + ".pdf");
}

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

import { TransactionWithDetails } from "@/lib/supabase/queries/transactions";

/**
 * Export transactions to CSV
 */
export function exportTransactionsToCSV(
  transactions: TransactionWithDetails[],
  filename: string = "transactions.csv"
): void {
  const headers = [
    "Date",
    "Bank Account",
    "Description",
    "Amount",
    "Category",
    "Running Balance",
  ];

  const rows = transactions.map((txn) => [
    txn.date,
    txn.bank_account.name,
    txn.description,
    txn.amount.toString(),
    txn.category.name,
    txn.running_balance.toString(),
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export category summary to CSV
 */
export function exportCategorySummaryToCSV(
  summaries: Array<{
    category_name: string;
    parent_category_name: string | null;
    total_amount: number;
    transaction_count: number;
  }>,
  filename: string = "category-summary.csv"
): void {
  const headers = ["Category", "Total Amount", "Transaction Count"];

  const rows = summaries.map((summary) => [
    summary.parent_category_name
      ? `${summary.parent_category_name} > ${summary.category_name}`
      : summary.category_name,
    summary.total_amount.toString(),
    summary.transaction_count.toString(),
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export transactions to PDF
 */
export async function exportTransactionsToPDF(
  transactions: TransactionWithDetails[],
  filename: string = "transactions.pdf"
): Promise<void> {
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;
  const startY = 20;
  let y = startY;

  // Title
  doc.setFontSize(16);
  doc.text("Transaction Report", margin, y);
  y += 10;

  // Date range if available
  if (transactions.length > 0) {
    const dates = transactions.map((t) => new Date(t.date));
    const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));
    doc.setFontSize(10);
    doc.text(
      `Period: ${minDate.toLocaleDateString()} - ${maxDate.toLocaleDateString()}`,
      margin,
      y
    );
    y += 10;
  }

  // Table headers
  doc.setFontSize(10);
  doc.setFont(undefined, "bold");
  const headers = ["Date", "Account", "Description", "Amount", "Category"];
  const colWidths = [25, 35, 60, 25, 35];
  let x = margin;

  headers.forEach((header, i) => {
    doc.text(header, x, y);
    x += colWidths[i];
  });
  y += 7;

  // Table rows
  doc.setFont(undefined, "normal");
  transactions.forEach((txn) => {
    if (y > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      y = startY;
    }

    x = margin;
    const row = [
      new Date(txn.date).toLocaleDateString(),
      txn.bank_account.name.substring(0, 15),
      txn.description.substring(0, 30),
      `$${txn.amount.toFixed(2)}`,
      txn.category.name.substring(0, 20),
    ];

    row.forEach((cell, i) => {
      doc.text(String(cell), x, y);
      x += colWidths[i];
    });
    y += 7;
  });

  doc.save(filename);
}


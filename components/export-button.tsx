"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download } from "lucide-react";
import { exportTransactionsToCSV, exportCategorySummaryToCSV } from "@/lib/utils/export";

type ExportButtonProps = {
  transactions?: any[];
  categorySummaries?: Array<{
    category_name: string;
    parent_category_name: string | null;
    total_amount: number;
    transaction_count: number;
  }>;
  filename?: string;
};

export function ExportButton({
  transactions,
  categorySummaries,
  filename,
}: ExportButtonProps) {
  const handleExportCSV = () => {
    if (transactions && transactions.length > 0) {
      exportTransactionsToCSV(transactions, filename || "transactions.csv");
    } else if (categorySummaries && categorySummaries.length > 0) {
      exportCategorySummaryToCSV(
        categorySummaries,
        filename || "category-summary.csv"
      );
    }
  };

  const handleExportPDF = async () => {
    if (transactions && transactions.length > 0) {
      const { exportTransactionsToPDF } = await import("@/lib/utils/export");
      await exportTransactionsToPDF(transactions, filename || "transactions.pdf");
    }
  };

  const hasData = (transactions && transactions.length > 0) ||
    (categorySummaries && categorySummaries.length > 0);

  if (!hasData) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={handleExportCSV}>
          Export as CSV
        </DropdownMenuItem>
        {transactions && transactions.length > 0 && (
          <DropdownMenuItem onClick={handleExportPDF}>
            Export as PDF
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


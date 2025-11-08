import Papa from "papaparse";

export type ParsedTransaction = {
  date: string; // ISO date string
  description: string;
  amount: number; // positive for income, negative for expenses
  runningBalance?: number;
  rawRow: string[];
};

export type ParseError = {
  row: number;
  message: string;
  data: string[];
};

export type ParseResult = {
  transactions: ParsedTransaction[];
  errors: ParseError[];
};

/**
 * Parse CSV file with bank transaction data
 * Expected format: Date (MM/DD/YYYY), Description, Debit Amount, Credit Amount, Running Balance
 */
export function parseCSV(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    const transactions: ParsedTransaction[] = [];
    const errors: ParseError[] = [];

    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        results.data.forEach((row: any, index: number) => {
          // Skip header row if it exists
          if (index === 0 && typeof row[0] === "string" && row[0].toLowerCase().includes("date")) {
            return;
          }

          try {
            // Validate row has at least 5 columns
            if (!row || row.length < 5) {
              errors.push({
                row: index + 1,
                message: "Row does not have enough columns",
                data: row,
              });
              return;
            }

            const [dateStr, description, debitStr, creditStr, balanceStr] = row;

            // Parse date (MM/DD/YYYY format)
            const dateParts = dateStr.trim().split("/");
            if (dateParts.length !== 3) {
              errors.push({
                row: index + 1,
                message: `Invalid date format: ${dateStr}. Expected MM/DD/YYYY`,
                data: row,
              });
              return;
            }

            const month = parseInt(dateParts[0], 10) - 1; // JavaScript months are 0-indexed
            const day = parseInt(dateParts[1], 10);
            const year = parseInt(dateParts[2], 10);

            if (isNaN(month) || isNaN(day) || isNaN(year)) {
              errors.push({
                row: index + 1,
                message: `Invalid date values: ${dateStr}`,
                data: row,
              });
              return;
            }

            const date = new Date(year, month, day);
            if (isNaN(date.getTime())) {
              errors.push({
                row: index + 1,
                message: `Invalid date: ${dateStr}`,
                data: row,
              });
              return;
            }

            // Parse amounts
            const debit = parseFloat(debitStr?.trim() || "0") || 0;
            const credit = parseFloat(creditStr?.trim() || "0") || 0;
            const runningBalance = parseFloat(balanceStr?.trim() || "0") || 0;

            // Determine amount: debit is negative (expense), credit is positive (income)
            let amount = 0;
            if (debit > 0 && credit === 0) {
              amount = -debit; // Expense
            } else if (credit > 0 && debit === 0) {
              amount = credit; // Income
            } else if (debit === 0 && credit === 0) {
              amount = 0; // Zero transaction
            } else {
              // Both have values - this is unusual, use the non-zero one
              amount = credit > 0 ? credit : -debit;
            }

            // Validate description
            const desc = (description || "").trim();
            if (!desc) {
              errors.push({
                row: index + 1,
                message: "Description is required",
                data: row,
              });
              return;
            }

            transactions.push({
              date: date.toISOString().split("T")[0], // YYYY-MM-DD format
              description: desc,
              amount,
              runningBalance,
              rawRow: row,
            });
          } catch (error) {
            errors.push({
              row: index + 1,
              message: error instanceof Error ? error.message : "Unknown error",
              data: row,
            });
          }
        });

        resolve({ transactions, errors });
      },
      error: (error) => {
        errors.push({
          row: 0,
          message: error.message || "Failed to parse CSV file",
          data: [],
        });
        resolve({ transactions, errors });
      },
    });
  });
}


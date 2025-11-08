"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useRouter } from "next/navigation";

type ParsedTransaction = {
  date: string;
  description: string;
  amount: number;
  runningBalance?: number;
  rawRow: string[];
};

type Category = {
  id: number;
  name: string;
  parent_id: number | null;
  is_transfer_category: boolean;
};

type CategoryWithChildren = Category & {
  children?: CategoryWithChildren[];
};

type BankAccount = {
  id: number;
  name: string;
};

type CategorizationTableProps = {
  transactions: ParsedTransaction[];
  categories: CategoryWithChildren[];
  bankAccounts: BankAccount[];
  bankAccountId: number;
};

function flattenCategories(
  categories: CategoryWithChildren[],
  prefix: string = ""
): Array<Category & { displayName: string }> {
  const result: Array<Category & { displayName: string }> = [];
  categories.forEach((cat) => {
    result.push({
      ...cat,
      displayName: prefix + cat.name,
    });
    if (cat.children && cat.children.length > 0) {
      result.push(
        ...flattenCategories(cat.children, prefix + cat.name + " > ")
      );
    }
  });
  return result;
}

export function CategorizationTable({
  transactions,
  categories,
  bankAccounts,
  bankAccountId,
}: CategorizationTableProps) {
  const router = useRouter();
  const [editedTransactions, setEditedTransactions] = useState<
    Array<ParsedTransaction & { categoryId?: number; transferToAccountId?: number; skip?: boolean }>
  >(transactions.map((t) => ({ ...t })));
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const flatCategories = flattenCategories(categories);
  const transferCategories = flatCategories.filter((c) => c.is_transfer_category);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const updateTransaction = (
    index: number,
    updates: Partial<typeof editedTransactions[0]>
  ) => {
    const updated = [...editedTransactions];
    updated[index] = { ...updated[index], ...updates };
    setEditedTransactions(updated);
  };

  const toggleRowSelection = (index: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedRows(newSelected);
  };

  const selectAll = () => {
    if (selectedRows.size === editedTransactions.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(editedTransactions.map((_, i) => i)));
    }
  };

  const bulkCategorize = (categoryId: number, transferToAccountId?: number) => {
    const updated = editedTransactions.map((t, i) => {
      if (selectedRows.has(i)) {
        return {
          ...t,
          categoryId,
          transferToAccountId,
          skip: false,
        };
      }
      return t;
    });
    setEditedTransactions(updated);
    setSelectedRows(new Set());
  };

  const handleImport = async () => {
    // If transactions are selected, only import those that are categorized and not skipped
    // Otherwise, import all categorized transactions
    const transactionsToImport = selectedRows.size > 0
      ? editedTransactions.filter(
          (t, i) => selectedRows.has(i) && !t.skip && t.categoryId
        )
      : editedTransactions.filter(
          (t) => !t.skip && t.categoryId
        );

    if (transactionsToImport.length === 0) {
      setError(
        selectedRows.size > 0
          ? "Please categorize the selected transactions"
          : "Please categorize at least one transaction"
      );
      return;
    }

    setIsImporting(true);
    setError(null);

    try {
      const response = await fetch("/api/transactions/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactions: transactionsToImport.map((t) => ({
            bank_account_id: bankAccountId,
            date: t.date,
            amount: t.amount,
            description: t.description,
            category_id: t.categoryId,
            transfer_to_account_id: t.transferToAccountId || null,
          })),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to import transactions");
      }

      sessionStorage.removeItem("pendingTransactions");
      router.push("/dashboard/transactions");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import transactions");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Review & Categorize Transactions</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {editedTransactions.length} transactions to review
          </p>
        </div>
        <div className="flex gap-2">
          {selectedRows.size > 0 && (
            <Select
              onValueChange={(value) => {
                const [categoryId, transferId] = value.split(":");
                bulkCategorize(
                  parseInt(categoryId),
                  transferId ? parseInt(transferId) : undefined
                );
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Bulk categorize" />
              </SelectTrigger>
              <SelectContent>
                {flatCategories.map((cat) => (
                  <SelectItem
                    key={cat.id}
                    value={`${cat.id}:`}
                  >
                    {cat.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button onClick={handleImport} disabled={isImporting}>
            {isImporting
              ? "Importing..."
              : (() => {
                  const readyToImport = editedTransactions.filter((t) => !t.skip && t.categoryId).length;
                  const selectedReady = selectedRows.size > 0
                    ? editedTransactions.filter((t, i) => selectedRows.has(i) && !t.skip && t.categoryId).length
                    : readyToImport;
                  return `Import ${selectedReady} Transaction${selectedReady !== 1 ? "s" : ""}`;
                })()}
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 border border-destructive rounded-md bg-destructive/10 text-destructive">
          {error}
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <div className="flex items-center justify-center">
                  <Checkbox
                    checked={selectedRows.size === editedTransactions.length && editedTransactions.length > 0}
                    onCheckedChange={selectAll}
                  />
                </div>
              </TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Transfer To</TableHead>
              <TableHead className="w-[100px]">Skip</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {editedTransactions.map((transaction, index) => {
              const selectedCategory = flatCategories.find(
                (c) => c.id === transaction.categoryId
              );
              const isTransfer = selectedCategory?.is_transfer_category || false;

              return (
                <TableRow key={index}>
                  <TableCell>
                    <div className="flex items-center justify-center">
                      <Checkbox
                        checked={selectedRows.has(index)}
                        onCheckedChange={() => toggleRowSelection(index)}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="date"
                      value={transaction.date}
                      onChange={(e) =>
                        updateTransaction(index, { date: e.target.value })
                      }
                      className="w-[140px]"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={transaction.description}
                      onChange={(e) =>
                        updateTransaction(index, { description: e.target.value })
                      }
                      className="min-w-[200px]"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      step="0.01"
                      value={transaction.amount}
                      onChange={(e) =>
                        updateTransaction(index, {
                          amount: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-[120px] text-right"
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={transaction.categoryId?.toString() || ""}
                      onValueChange={(value) => {
                        const categoryId = parseInt(value);
                        updateTransaction(index, {
                          categoryId,
                          transferToAccountId: undefined,
                        });
                      }}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {flatCategories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id.toString()}>
                            {cat.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {isTransfer ? (
                      <Select
                        value={transaction.transferToAccountId?.toString() || ""}
                        onValueChange={(value) =>
                          updateTransaction(index, {
                            transferToAccountId: parseInt(value),
                          })
                        }
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Select account" />
                        </SelectTrigger>
                        <SelectContent>
                          {bankAccounts
                            .filter((acc) => acc.id !== bankAccountId)
                            .map((account) => (
                              <SelectItem
                                key={account.id}
                                value={account.id.toString()}
                              >
                                {account.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center">
                      <Checkbox
                        checked={transaction.skip || false}
                        onCheckedChange={(checked) =>
                          updateTransaction(index, { skip: checked as boolean })
                        }
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}


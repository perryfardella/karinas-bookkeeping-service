"use client";

import { useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowUpDown, ArrowUp, ArrowDown, Trash2 } from "lucide-react";
import { TransactionForm } from "@/components/transaction-form";

export type TransactionWithDetails = {
  id: number;
  bank_account_id: number;
  date: string;
  amount: number;
  description: string;
  category_id: number;
  transfer_to_account_id: number | null;
  bank_account: {
    id: number;
    name: string;
  };
  category: {
    id: number;
    name: string;
    parent_id: number | null;
  };
  transfer_to_account: {
    id: number;
    name: string;
  } | null;
  running_balance: number;
};

type BankAccount = {
  id: number;
  name: string;
};

type CategoryWithChildren = {
  id: number;
  name: string;
  parent_id: number | null;
  is_transfer_category: boolean;
  children?: CategoryWithChildren[];
};

type TransactionTableProps = {
  transactions: TransactionWithDetails[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onSortChange: (field: string, direction: "asc" | "desc") => void;
  sortField?: string;
  sortDirection?: "asc" | "desc";
  bankAccounts?: BankAccount[];
  categories?: CategoryWithChildren[];
  onRefresh?: () => void;
  onTransactionsUpdate?: (updater: (transactions: TransactionWithDetails[]) => TransactionWithDetails[]) => void;
  onSkipRealtime?: (skip: boolean) => void;
};

function flattenCategories(
  categories: CategoryWithChildren[],
  prefix: string = ""
): Array<CategoryWithChildren & { displayName: string }> {
  const result: Array<CategoryWithChildren & { displayName: string }> = [];
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

export function TransactionTable({
  transactions,
  currentPage,
  totalPages,
  onPageChange,
  onSortChange,
  sortField,
  sortDirection,
  bankAccounts = [],
  categories = [],
  onRefresh,
  onTransactionsUpdate,
  onSkipRealtime,
}: TransactionTableProps) {
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const flatCategories = flattenCategories(categories);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatCategory = (category: TransactionWithDetails["category"]) => {
    // For now, just show the category name
    // In a real implementation, you might want to show parent > child
    return category.name;
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      onSortChange(
        field,
        sortDirection === "asc" ? "desc" : "asc"
      );
    } else {
      onSortChange(field, "asc");
    }
  };

  const SortButton = ({ field }: { field: string }) => {
    const isActive = sortField === field;
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => handleSort(field)}
      >
        {isActive && sortDirection === "asc" ? (
          <ArrowUp className="h-4 w-4" />
        ) : isActive && sortDirection === "desc" ? (
          <ArrowDown className="h-4 w-4" />
        ) : (
          <ArrowUpDown className="h-4 w-4" />
        )}
      </Button>
    );
  };

  const toggleRowSelection = (transactionId: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(transactionId)) {
      newSelected.delete(transactionId);
    } else {
      newSelected.add(transactionId);
    }
    setSelectedRows(newSelected);
  };

  const selectAll = () => {
    if (selectedRows.size === transactions.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(transactions.map((t) => t.id)));
    }
  };

  const handleBulkCategorize = async (categoryId: number, transferToAccountId?: number) => {
    if (selectedRows.size === 0) {
      return;
    }

    setIsBulkUpdating(true);
    setBulkError(null);

    // Set flag to skip realtime BEFORE optimistic update
    onSkipRealtime?.(true);

    // Optimistically update transactions
    const selectedIds = Array.from(selectedRows);
    const previousTransactions = [...transactions];
    
    if (onTransactionsUpdate) {
      onTransactionsUpdate((currentTransactions) => {
        return currentTransactions.map((txn) => {
          if (selectedIds.includes(txn.id)) {
            // Find the category name
            const category = flatCategories.find((c) => c.id === categoryId);
            return {
              ...txn,
              category_id: categoryId,
              category: category
                ? {
                    id: categoryId,
                    name: category.name,
                    parent_id: category.parent_id,
                  }
                : txn.category,
              transfer_to_account_id: transferToAccountId || null,
              transfer_to_account: transferToAccountId
                ? bankAccounts.find((a) => a.id === transferToAccountId)
                  ? {
                      id: transferToAccountId,
                      name: bankAccounts.find((a) => a.id === transferToAccountId)!.name,
                    }
                  : null
                : null,
            };
          }
          return txn;
        });
      });
    }

    try {
      const response = await fetch("/api/transactions/bulk-update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transaction_ids: selectedIds,
          category_id: categoryId,
          transfer_to_account_id: transferToAccountId || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to bulk update transactions");
      }

      setSelectedRows(new Set());
      // Reset flag after API completes (give it time for realtime to potentially fire)
      setTimeout(() => {
        onSkipRealtime?.(false);
      }, 2000);
    } catch (err) {
      // Revert optimistic update on error
      if (onTransactionsUpdate) {
        onTransactionsUpdate(() => previousTransactions);
      }
      onSkipRealtime?.(false);
      setBulkError(err instanceof Error ? err.message : "Failed to bulk update transactions");
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleDeleteClick = (transactionId: number) => {
    setTransactionToDelete(transactionId);
    setDeleteDialogOpen(true);
    setDeleteError(null);
  };

  const handleDeleteConfirm = async () => {
    if (!transactionToDelete) return;

    setIsDeleting(true);
    setDeleteError(null);

    // Set flag to skip realtime BEFORE optimistic update
    onSkipRealtime?.(true);

    // Optimistically remove transaction
    const previousTransactions = [...transactions];
    const transactionToRemove = transactions.find((t) => t.id === transactionToDelete);
    
    if (onTransactionsUpdate && transactionToRemove) {
      onTransactionsUpdate((currentTransactions) => {
        return currentTransactions.filter((t) => t.id !== transactionToDelete);
      });
    }

    try {
      const response = await fetch(`/api/transactions/${transactionToDelete}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete transaction");
      }

      setDeleteDialogOpen(false);
      setTransactionToDelete(null);
      // Reset flag after API completes
      setTimeout(() => {
        onSkipRealtime?.(false);
      }, 2000);
    } catch (err) {
      // Revert optimistic update on error
      if (onTransactionsUpdate) {
        onTransactionsUpdate(() => previousTransactions);
      }
      onSkipRealtime?.(false);
      setDeleteError(err instanceof Error ? err.message : "Failed to delete transaction");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="space-y-4">
        {bulkError && (
          <div className="p-4 border border-destructive rounded-md bg-destructive/10 text-destructive">
            {bulkError}
          </div>
        )}

        <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {categories.length > 0 && (
                <TableHead className="w-[50px]">
                  <div className="flex items-center justify-center">
                    <Checkbox
                      checked={selectedRows.size === transactions.length && transactions.length > 0}
                      onCheckedChange={selectAll}
                    />
                  </div>
                </TableHead>
              )}
              <TableHead className="w-[120px]">
                <div className="flex items-center gap-2">
                  Date
                  <SortButton field="date" />
                </div>
              </TableHead>
              <TableHead>
                <div className="flex items-center gap-2">
                  Bank Account
                  <SortButton field="bank_account_id" />
                </div>
              </TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">
                <div className="flex items-center justify-end gap-2">
                  Amount
                  <SortButton field="amount" />
                </div>
              </TableHead>
              <TableHead>
                <div className="flex items-center gap-2">
                  Category
                  <SortButton field="category_id" />
                </div>
              </TableHead>
              <TableHead className="text-right">Balance</TableHead>
              {bankAccounts.length > 0 && categories.length > 0 && (
                <TableHead className="w-[100px]">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={categories.length > 0 ? (bankAccounts.length > 0 && categories.length > 0 ? 8 : 7) : (bankAccounts.length > 0 && categories.length > 0 ? 7 : 6)} className="text-center py-8 text-muted-foreground">
                  No transactions found
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  {categories.length > 0 && (
                    <TableCell>
                      <div className="flex items-center justify-center">
                        <Checkbox
                          checked={selectedRows.has(transaction.id)}
                          onCheckedChange={() => toggleRowSelection(transaction.id)}
                        />
                      </div>
                    </TableCell>
                  )}
                  <TableCell>
                    {format(new Date(transaction.date), "MMM dd, yyyy")}
                  </TableCell>
                  <TableCell className="font-medium">
                    {transaction.bank_account.name}
                  </TableCell>
                  <TableCell>{transaction.description}</TableCell>
                  <TableCell className="text-right">
                    <span
                      className={
                        transaction.amount >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    >
                      {formatCurrency(transaction.amount)}
                    </span>
                    {transaction.transfer_to_account && (
                      <div className="text-xs text-muted-foreground">
                        → {transaction.transfer_to_account.name}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{formatCategory(transaction.category)}</TableCell>
                  <TableCell className="text-right">
                    <span
                      className={
                        transaction.running_balance >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    >
                      {formatCurrency(transaction.running_balance)}
                    </span>
                  </TableCell>
                  {bankAccounts.length > 0 && categories.length > 0 && (
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <TransactionForm
                          bankAccounts={bankAccounts}
                          categories={categories}
                          transaction={transaction}
                          onSuccess={() => {
                            // Only refresh for new transactions, edits are optimistically updated
                            if (!transaction) {
                              onRefresh?.();
                            }
                          }}
                          onTransactionUpdate={onTransactionsUpdate}
                          onSkipRealtime={onSkipRealtime}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(transaction.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Transaction</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this transaction? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <div className="text-sm text-destructive">{deleteError}</div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setTransactionToDelete(null);
                setDeleteError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Floating bulk categorize box */}
      {selectedRows.size > 0 && categories.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col sm:flex-row items-center gap-3 p-4 border rounded-lg bg-background shadow-lg max-w-[calc(100vw-2rem)]">
          <span className="text-sm font-medium whitespace-nowrap">
            {selectedRows.size} transaction{selectedRows.size !== 1 ? "s" : ""} selected
          </span>
          <Select
            onValueChange={(value) => {
              const [categoryId, transferId] = value.split(":");
              handleBulkCategorize(
                parseInt(categoryId),
                transferId ? parseInt(transferId) : undefined
              );
            }}
            disabled={isBulkUpdating}
          >
            <SelectTrigger className="w-full sm:w-[250px]">
              <SelectValue placeholder="Bulk categorize" />
            </SelectTrigger>
            <SelectContent>
              {flatCategories.map((cat) => (
                <SelectItem key={cat.id} value={`${cat.id}:`}>
                  {cat.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedRows(new Set())}
            disabled={isBulkUpdating}
            className="w-full sm:w-auto"
          >
            Clear selection
          </Button>
        </div>
      )}
    </>
  );
}


"use client";

import { useState, useEffect, useRef, useMemo } from "react";
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
import { ArrowUpDown, ArrowUp, ArrowDown, Trash2, Loader2 } from "lucide-react";
import { TransactionForm } from "@/components/transaction-form";
import { CategoryDisplay } from "@/components/category-display";
import { getCategoryMediumName } from "@/lib/utils/category-display";
import { parseLocalDate } from "@/lib/utils";

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
  hasMore?: boolean;
  isFetching?: boolean;
  onLoadMore?: () => void;
  onSortChange: (field: string, direction: "asc" | "desc") => void;
  sortField?: string;
  sortDirection?: "asc" | "desc";
  bankAccounts?: BankAccount[];
  categories?: CategoryWithChildren[];
  showBankBalance?: boolean;
  onRefresh?: () => void;
  onTransactionsUpdate?: (
    updater: (
      transactions: TransactionWithDetails[]
    ) => TransactionWithDetails[]
  ) => void;
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
  hasMore = false,
  isFetching = false,
  onLoadMore,
  onSortChange,
  sortField,
  sortDirection,
  bankAccounts = [],
  categories = [],
  showBankBalance = false,
  onRefresh,
  onTransactionsUpdate,
  onSkipRealtime,
}: TransactionTableProps) {
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<number | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const flatCategories = flattenCategories(categories);

  // Create a flat map of all categories for efficient lookup (memoized)
  const categoryMap = useMemo(() => {
    const map = new Map<number, CategoryWithChildren>();
    const buildMap = (cats: CategoryWithChildren[]) => {
      cats.forEach((cat) => {
        map.set(cat.id, cat);
        if (cat.children) {
          buildMap(cat.children);
        }
      });
    };
    buildMap(categories);
    return map;
  }, [categories]);

  // Auto-load on scroll using Intersection Observer
  useEffect(() => {
    if (!hasMore || isFetching || !onLoadMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isFetching) {
          onLoadMore();
        }
      },
      {
        rootMargin: "200px", // Start loading 200px before reaching the bottom
      }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasMore, isFetching, onLoadMore]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatCategory = (category: TransactionWithDetails["category"]) => {
    // Build the category path by following parent_id chain
    // Use the category data from the transaction itself, not from the tree
    const buildPath = (
      catId: number,
      catName: string,
      parentId: number | null
    ): string[] => {
      // If no parent, this is a root category
      if (!parentId) {
        return [catName];
      }

      // Look up parent in the map
      const parent = categoryMap.get(parentId);
      if (parent) {
        // Recursively build parent path
        const parentPath = buildPath(parent.id, parent.name, parent.parent_id);
        return [...parentPath, catName];
      }

      // Parent not found in map, return just this category name
      return [catName];
    };

    const path = buildPath(category.id, category.name, category.parent_id);
    return path.join(" > ");
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      onSortChange(field, sortDirection === "asc" ? "desc" : "asc");
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

  const handleBulkCategorize = async (
    categoryId: number,
    transferToAccountId?: number
  ) => {
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
                      name: bankAccounts.find(
                        (a) => a.id === transferToAccountId
                      )!.name,
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
      setBulkError(
        err instanceof Error
          ? err.message
          : "Failed to bulk update transactions"
      );
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
    const transactionToRemove = transactions.find(
      (t) => t.id === transactionToDelete
    );

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
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete transaction"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDelete = () => {
    setBulkDeleteDialogOpen(true);
  };

  const confirmBulkDelete = async () => {
    if (selectedRows.size === 0) {
      return;
    }

    setIsBulkDeleting(true);
    setBulkError(null);

    // Set flag to skip realtime BEFORE optimistic update
    onSkipRealtime?.(true);

    // Optimistically remove transactions
    const selectedIds = Array.from(selectedRows);
    const previousTransactions = [...transactions];

    if (onTransactionsUpdate) {
      onTransactionsUpdate((currentTransactions) => {
        return currentTransactions.filter((t) => !selectedIds.includes(t.id));
      });
    }

    try {
      const response = await fetch("/api/transactions/bulk-delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transaction_ids: selectedIds,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to bulk delete transactions");
      }

      setSelectedRows(new Set());
      setBulkDeleteDialogOpen(false);
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
      setBulkError(
        err instanceof Error
          ? err.message
          : "Failed to bulk delete transactions"
      );
    } finally {
      setIsBulkDeleting(false);
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

        {/* Desktop Table View - hidden on mobile */}
        <div className="hidden md:block rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {categories.length > 0 && (
                  <TableHead className="w-[50px]">
                    <div className="flex items-center justify-center">
                      <Checkbox
                        checked={
                          selectedRows.size === transactions.length &&
                          transactions.length > 0
                        }
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
                {showBankBalance && (
                  <TableHead className="text-right">Bank Balance</TableHead>
                )}
                {bankAccounts.length > 0 && categories.length > 0 && (
                  <TableHead className="w-[100px]">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={
                      (categories.length > 0 ? 1 : 0) + // Checkbox column
                      4 + // Date, Bank Account, Description, Amount
                      1 + // Category
                      (showBankBalance ? 1 : 0) + // Bank Balance (conditional)
                      (bankAccounts.length > 0 && categories.length > 0 ? 1 : 0) // Actions
                    }
                    className="text-center py-8 text-muted-foreground"
                  >
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
                            onCheckedChange={() =>
                              toggleRowSelection(transaction.id)
                            }
                          />
                        </div>
                      </TableCell>
                    )}
                    <TableCell>
                      {format(parseLocalDate(transaction.date), "MMM dd, yyyy")}
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
                    <TableCell>
                      <CategoryDisplay
                        categoryPath={formatCategory(transaction.category)}
                        variant="medium"
                      />
                    </TableCell>
                    {showBankBalance && (
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
                    )}
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

        {/* Mobile Card View - visible on mobile only */}
        <div className="md:hidden space-y-3">
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border rounded-md">
              No transactions found
            </div>
          ) : (
            transactions.map((transaction) => (
              <div
                key={transaction.id}
                className={`border rounded-lg p-4 space-y-3 ${
                  selectedRows.has(transaction.id) ? "bg-muted/50" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {categories.length > 0 && (
                        <Checkbox
                          checked={selectedRows.has(transaction.id)}
                          onCheckedChange={() =>
                            toggleRowSelection(transaction.id)
                          }
                        />
                      )}
                      <span className="text-sm font-medium text-muted-foreground">
                        {format(parseLocalDate(transaction.date), "MMM dd, yyyy")}
                      </span>
                    </div>
                    <h3 className="font-semibold text-base break-words">
                      {transaction.description}
                    </h3>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {transaction.bank_account.name}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span
                      className={`text-lg font-semibold ${
                        transaction.amount >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {formatCurrency(transaction.amount)}
                    </span>
                    {transaction.transfer_to_account && (
                      <div className="text-xs text-muted-foreground mt-1">
                        → {transaction.transfer_to_account.name}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Category</div>
                    <CategoryDisplay
                      categoryPath={formatCategory(transaction.category)}
                      variant="medium"
                    />
                  </div>
                  {showBankBalance && (
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground mb-1">Balance</div>
                      <span
                        className={`text-sm font-medium ${
                          transaction.running_balance >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {formatCurrency(transaction.running_balance)}
                      </span>
                    </div>
                  )}
                </div>
                {bankAccounts.length > 0 && categories.length > 0 && (
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <TransactionForm
                      bankAccounts={bankAccounts}
                      categories={categories}
                      transaction={transaction}
                      onSuccess={() => {
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
                      className="ml-auto"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Sentinel element for scroll detection */}
        {hasMore && <div ref={loadMoreRef} className="h-4" />}

        {/* Loading indicator */}
        {isFetching && (
          <div className="flex items-center justify-center gap-2 py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <div className="text-sm text-muted-foreground">
              Loading more transactions...
            </div>
          </div>
        )}

        {/* End of list indicator */}
        {!hasMore && transactions.length > 0 && (
          <div className="text-center py-4 text-sm text-muted-foreground">
            All transactions loaded
          </div>
        )}
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Transaction</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this transaction? This action
              cannot be undone.
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
      {selectedRows.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3 sm:p-4 border rounded-lg bg-background shadow-lg max-w-[calc(100vw-1rem)] sm:max-w-[calc(100vw-2rem)]">
          <span className="text-sm font-medium text-center sm:text-left">
            {selectedRows.size} transaction{selectedRows.size !== 1 ? "s" : ""}{" "}
            selected
          </span>
          {categories.length > 0 && (
            <Select
              onValueChange={(value) => {
                const [categoryId, transferId] = value.split(":");
                handleBulkCategorize(
                  parseInt(categoryId),
                  transferId ? parseInt(transferId) : undefined
                );
              }}
              disabled={isBulkUpdating || isBulkDeleting}
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
          )}
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBulkDelete}
            disabled={isBulkUpdating || isBulkDeleting}
            className="w-full sm:w-auto"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Selected
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedRows(new Set())}
            disabled={isBulkUpdating || isBulkDeleting}
            className="w-full sm:w-auto"
          >
            Clear selection
          </Button>
        </div>
      )}

      {/* Bulk delete confirmation dialog */}
      <Dialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Selected Transactions?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedRows.size} transaction
              {selectedRows.size !== 1 ? "s" : ""}? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkDeleteDialogOpen(false)}
              disabled={isBulkDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmBulkDelete}
              disabled={isBulkDeleting}
            >
              {isBulkDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

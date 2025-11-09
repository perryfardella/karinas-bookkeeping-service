"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { flattenCategoriesForSelect } from "@/lib/utils/category-display";
import { AlertCircle, Plus, Trash2, Loader2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CategoryForm } from "@/components/category-form";

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

export function CategorizationTable({
  transactions,
  categories,
  bankAccounts,
  bankAccountId,
}: CategorizationTableProps) {
  const router = useRouter();
  const [editedTransactions, setEditedTransactions] = useState<
    Array<ParsedTransaction & { categoryId?: number }>
  >(transactions.map((t) => ({ ...t })));
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredRowIndex, setHoveredRowIndex] = useState<number | null>(null);
  const [localCategories, setLocalCategories] =
    useState<CategoryWithChildren[]>(categories);
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [singleDeleteDialogOpen, setSingleDeleteDialogOpen] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<number | null>(null);

  const flatCategories = flattenCategoriesForSelect(localCategories);

  // Refresh categories from the server
  const refreshCategories = async () => {
    try {
      const response = await fetch("/api/categories");
      if (!response.ok) {
        throw new Error("Failed to fetch categories");
      }
      const allCategories = await response.json();

      // Convert flat list to tree structure
      const categoryMap = new Map<number, CategoryWithChildren>();
      const rootCategories: CategoryWithChildren[] = [];

      // First pass: create all category objects
      allCategories.forEach((cat: Category) => {
        categoryMap.set(cat.id, { ...cat, children: [] });
      });

      // Second pass: build tree
      allCategories.forEach((cat: Category) => {
        const categoryNode = categoryMap.get(cat.id)!;
        if (cat.parent_id) {
          const parent = categoryMap.get(cat.parent_id);
          if (parent) {
            if (!parent.children) {
              parent.children = [];
            }
            parent.children.push(categoryNode);
          }
        } else {
          rootCategories.push(categoryNode);
        }
      });

      setLocalCategories(rootCategories);
      return rootCategories;
    } catch (err) {
      console.error("Error refreshing categories:", err);
      return localCategories;
    }
  };

  const handleCategoryCreated = async (newCategoryId?: number) => {
    await refreshCategories();
    setCategoryFormOpen(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const updateTransaction = (
    index: number,
    updates: Partial<(typeof editedTransactions)[0]>
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

  const bulkCategorize = (categoryId: number) => {
    const updated = editedTransactions.map((t, i) => {
      if (selectedRows.has(i)) {
        return {
          ...t,
          categoryId,
        };
      }
      return t;
    });
    setEditedTransactions(updated);
    setSelectedRows(new Set());
  };

  const handleBulkDelete = () => {
    setDeleteDialogOpen(true);
  };

  const confirmBulkDelete = () => {
    // Remove selected transactions from the list
    const updated = editedTransactions.filter((_, i) => !selectedRows.has(i));
    setEditedTransactions(updated);
    setSelectedRows(new Set());
    setDeleteDialogOpen(false);
  };

  const handleDeleteRow = (index: number) => {
    setRowToDelete(index);
    setSingleDeleteDialogOpen(true);
  };

  const confirmSingleDelete = () => {
    if (rowToDelete === null) return;

    const index = rowToDelete;
    // Remove the transaction at the specified index
    const updated = editedTransactions.filter((_, i) => i !== index);
    setEditedTransactions(updated);
    // Also remove from selection if it was selected
    const newSelected = new Set(selectedRows);
    newSelected.delete(index);
    // Adjust indices for remaining selected items
    const adjustedSelected = new Set<number>();
    newSelected.forEach((selectedIndex) => {
      if (selectedIndex < index) {
        adjustedSelected.add(selectedIndex);
      } else if (selectedIndex > index) {
        adjustedSelected.add(selectedIndex - 1);
      }
    });
    setSelectedRows(adjustedSelected);
    setSingleDeleteDialogOpen(false);
    setRowToDelete(null);
  };

  const handleImport = async () => {
    // If transactions are selected, only import those that are categorized
    // Otherwise, import all categorized transactions
    const transactionsToImport =
      selectedRows.size > 0
        ? editedTransactions.filter(
            (t, i) => selectedRows.has(i) && t.categoryId
          )
        : editedTransactions.filter((t) => t.categoryId);

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
            transfer_to_account_id: null,
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
      setError(
        err instanceof Error ? err.message : "Failed to import transactions"
      );
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            Review & Categorize Transactions
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {editedTransactions.length} transactions to review
          </p>
        </div>
        <CategoryForm
          allCategories={localCategories}
          open={categoryFormOpen}
          onOpenChange={setCategoryFormOpen}
          onSuccess={handleCategoryCreated}
          trigger={
            <Button variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add new category
            </Button>
          }
        />
      </div>

      {error && (
        <div className="p-4 border border-destructive rounded-md bg-destructive/10 text-destructive">
          {error}
        </div>
      )}

      {/* Desktop Table View - hidden on mobile */}
      <div className="hidden md:block rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <div className="flex items-center justify-center">
                  <Checkbox
                    checked={
                      selectedRows.size === editedTransactions.length &&
                      editedTransactions.length > 0
                    }
                    onCheckedChange={selectAll}
                  />
                </div>
              </TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="[&_tr:last-child]:border-b">
            {editedTransactions.map((transaction, index) => {
              const isCategorized = !!transaction.categoryId;

              return (
                <TableRow
                  key={index}
                  className={
                    isCategorized ? "" : "border-l-4 border-l-yellow-500"
                  }
                >
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
                        updateTransaction(index, {
                          description: e.target.value,
                        })
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
                    <div className="flex items-center gap-2">
                      <Select
                        value={transaction.categoryId?.toString() || ""}
                        onValueChange={(value) => {
                          const categoryId = parseInt(value);
                          updateTransaction(index, {
                            categoryId,
                          });
                        }}
                      >
                        <SelectTrigger
                          className={`w-[200px] ${
                            !isCategorized
                              ? "border-yellow-500 focus:ring-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/10"
                              : ""
                          }`}
                        >
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {flatCategories.map((cat) => (
                            <SelectItem
                              key={cat.id}
                              value={cat.id.toString()}
                              title={cat.fullPath}
                              style={{ paddingLeft: `${8 + cat.level * 16}px` }}
                            >
                              <span className="font-mono text-xs text-muted-foreground mr-2">
                                {cat.level > 0 && (cat.isLast ? "└─" : "├─")}
                              </span>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {!isCategorized && (
                        <Popover open={hoveredRowIndex === index}>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="shrink-0 focus:outline-none cursor-help"
                              aria-label="Category required"
                              onMouseEnter={() => setHoveredRowIndex(index)}
                              onMouseLeave={() => setHoveredRowIndex(null)}
                            >
                              <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-auto p-2 text-sm"
                            side="top"
                            onMouseEnter={() => setHoveredRowIndex(index)}
                            onMouseLeave={() => setHoveredRowIndex(null)}
                          >
                            You need to categorize this transaction to import
                            it.
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteRow(index)}
                      className="h-8 w-8"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View - visible on mobile only */}
      <div className="md:hidden space-y-3">
        {editedTransactions.map((transaction, index) => {
          const isCategorized = !!transaction.categoryId;

          return (
            <div
              key={index}
              className={`border rounded-lg p-4 space-y-3 ${
                selectedRows.has(index) ? "bg-muted/50" : ""
              } ${!isCategorized ? "border-l-4 border-l-yellow-500" : ""}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Checkbox
                      checked={selectedRows.has(index)}
                      onCheckedChange={() => toggleRowSelection(index)}
                    />
                    <Input
                      type="date"
                      value={transaction.date}
                      onChange={(e) =>
                        updateTransaction(index, { date: e.target.value })
                      }
                      className="w-auto text-sm"
                    />
                  </div>
                  <Input
                    value={transaction.description}
                    onChange={(e) =>
                      updateTransaction(index, {
                        description: e.target.value,
                      })
                    }
                    placeholder="Description"
                    className="w-full mb-2"
                  />
                </div>
                <div className="text-right shrink-0">
                  <Input
                    type="number"
                    step="0.01"
                    value={transaction.amount}
                    onChange={(e) =>
                      updateTransaction(index, {
                        amount: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-[100px] text-right"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="pt-2 border-t space-y-2">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Category {!isCategorized && (
                      <AlertCircle className="inline h-3 w-3 text-yellow-600 dark:text-yellow-400 ml-1" />
                    )}
                  </label>
                  <div className="flex items-center gap-2">
                    <Select
                      value={transaction.categoryId?.toString() || ""}
                      onValueChange={(value) => {
                        const categoryId = parseInt(value);
                        updateTransaction(index, {
                          categoryId,
                        });
                      }}
                    >
                      <SelectTrigger
                        className={`w-full ${
                          !isCategorized
                            ? "border-yellow-500 focus:ring-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/10"
                            : ""
                        }`}
                      >
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {flatCategories.map((cat) => (
                          <SelectItem
                            key={cat.id}
                            value={cat.id.toString()}
                            title={cat.fullPath}
                            style={{ paddingLeft: `${8 + cat.level * 16}px` }}
                          >
                            <span className="font-mono text-xs text-muted-foreground mr-2">
                              {cat.level > 0 && (cat.isLast ? "└─" : "├─")}
                            </span>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {!isCategorized && (
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                      Category required to import
                    </p>
                  )}
                </div>
                <div className="flex justify-end pt-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteRow(index)}
                    className="h-8 w-8"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating bulk categorize box */}
      {selectedRows.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col sm:flex-row items-center gap-3 p-4 border rounded-lg bg-background shadow-lg max-w-[calc(100vw-2rem)]">
          <span className="text-sm font-medium whitespace-nowrap">
            {selectedRows.size} transaction{selectedRows.size !== 1 ? "s" : ""}{" "}
            selected
          </span>
          <Select
            onValueChange={(value) => {
              const categoryId = parseInt(value);
              bulkCategorize(categoryId);
            }}
          >
            <SelectTrigger className="w-full sm:w-[250px]">
              <SelectValue placeholder="Bulk categorize" />
            </SelectTrigger>
            <SelectContent>
              {flatCategories.map((cat) => (
                <SelectItem
                  key={cat.id}
                  value={`${cat.id}:`}
                  title={cat.fullPath}
                  style={{ paddingLeft: `${8 + cat.level * 16}px` }}
                >
                  <span className="font-mono text-xs text-muted-foreground mr-2">
                    {cat.level > 0 && (cat.isLast ? "└─" : "├─")}
                  </span>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBulkDelete}
            className="w-full sm:w-auto"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Selected
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedRows(new Set())}
            className="w-full sm:w-auto"
          >
            Clear selection
          </Button>
        </div>
      )}

      {/* Bulk delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
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
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmBulkDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Single delete confirmation dialog */}
      <Dialog
        open={singleDeleteDialogOpen}
        onOpenChange={setSingleDeleteDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Transaction?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this transaction? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSingleDeleteDialogOpen(false);
                setRowToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmSingleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Floating import button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button onClick={handleImport} disabled={isImporting} size="lg">
          {isImporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Importing...
            </>
          ) : (
            (() => {
              const readyToImport = editedTransactions.filter(
                (t) => t.categoryId
              ).length;
              const selectedReady =
                selectedRows.size > 0
                  ? editedTransactions.filter(
                      (t, i) => selectedRows.has(i) && t.categoryId
                    ).length
                  : readyToImport;
              return `Import ${selectedReady} Transaction${
                selectedReady !== 1 ? "s" : ""
              }`;
            })()
          )}
        </Button>
      </div>
    </div>
  );
}

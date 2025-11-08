"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { flattenCategoriesForSelect } from "@/lib/utils/category-display";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn, parseLocalDate } from "@/lib/utils";

type TransactionWithDetails = {
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
};

type BankAccount = {
  id: number;
  name: string;
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

type TransactionFormProps = {
  bankAccounts: BankAccount[];
  categories: CategoryWithChildren[];
  transaction?: TransactionWithDetails;
  onSuccess?: () => void;
  onTransactionUpdate?: (updater: (transactions: TransactionWithDetails[]) => TransactionWithDetails[]) => void;
  onSkipRealtime?: (skip: boolean) => void;
};


export function TransactionForm({
  bankAccounts,
  categories,
  transaction,
  onSuccess,
  onTransactionUpdate,
  onSkipRealtime,
}: TransactionFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date>(new Date());
  const [bankAccountId, setBankAccountId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [transferToAccountId, setTransferToAccountId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const flatCategories = flattenCategoriesForSelect(categories);
  const selectedCategory = flatCategories.find(
    (c) => c.id.toString() === categoryId
  );
  const isTransfer = selectedCategory?.is_transfer_category || false;

  useEffect(() => {
    if (open) {
      if (transaction) {
        // Parse date as local date to avoid timezone shifts
        setDate(parseLocalDate(transaction.date));
        setBankAccountId(transaction.bank_account_id.toString());
        setAmount(transaction.amount.toString());
        setDescription(transaction.description);
        setCategoryId(transaction.category_id.toString());
        setTransferToAccountId(transaction.transfer_to_account_id?.toString() || "");
      } else {
        setDate(new Date());
        setBankAccountId("");
        setAmount("");
        setDescription("");
        setCategoryId("");
        setTransferToAccountId("");
      }
      setError(null);
    }
  }, [open, transaction]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum === 0) {
        throw new Error("Amount must be a non-zero number");
      }

      if (!bankAccountId) {
        throw new Error("Bank account is required");
      }

      if (!categoryId) {
        throw new Error("Category is required");
      }

      if (isTransfer && !transferToAccountId) {
        throw new Error("Transfer destination account is required");
      }

      const dateStr = format(date, "yyyy-MM-dd");
      const url = transaction
        ? `/api/transactions/${transaction.id}`
        : "/api/transactions";
      const method = transaction ? "PUT" : "POST";

      // For editing, optimistically update the transaction
      const previousTransaction = transaction ? { ...transaction } : null;
      if (transaction && onTransactionUpdate) {
        // Set flag to skip realtime BEFORE optimistic update
        onSkipRealtime?.(true);

        const selectedCategory = flatCategories.find((c) => c.id.toString() === categoryId);
        const selectedBankAccount = bankAccounts.find((a) => a.id.toString() === bankAccountId);
        const selectedTransferAccount = transferToAccountId
          ? bankAccounts.find((a) => a.id.toString() === transferToAccountId)
          : null;

        onTransactionUpdate((currentTransactions) => {
          return currentTransactions.map((t) => {
            if (t.id === transaction.id) {
              return {
                ...t,
                bank_account_id: parseInt(bankAccountId),
                date: dateStr,
                amount: amountNum,
                description: description.trim(),
                category_id: parseInt(categoryId),
                transfer_to_account_id: isTransfer ? parseInt(transferToAccountId) : null,
                bank_account: selectedBankAccount
                  ? { id: selectedBankAccount.id, name: selectedBankAccount.name }
                  : t.bank_account,
                category: selectedCategory
                  ? {
                      id: selectedCategory.id,
                      name: selectedCategory.name,
                      parent_id: selectedCategory.parent_id,
                    }
                  : t.category,
                transfer_to_account: selectedTransferAccount
                  ? { id: selectedTransferAccount.id, name: selectedTransferAccount.name }
                  : null,
              };
            }
            return t;
          });
        });
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bank_account_id: parseInt(bankAccountId),
          date: dateStr,
          amount: amountNum,
          description: description.trim(),
          category_id: parseInt(categoryId),
          transfer_to_account_id: isTransfer
            ? parseInt(transferToAccountId)
            : null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        // Revert optimistic update on error
        if (transaction && onTransactionUpdate && previousTransaction) {
          onTransactionUpdate((currentTransactions) => {
            return currentTransactions.map((t) =>
              t.id === transaction.id ? previousTransaction : t
            );
          });
        }
        onSkipRealtime?.(false);
        throw new Error(data.error || `Failed to ${transaction ? "update" : "create"} transaction`);
      }

      setOpen(false);
      // Only refresh router and call onSuccess for new transactions, not edits
      // For edits, we've already optimistically updated the UI
      if (!transaction) {
        router.refresh();
        onSuccess?.();
      } else {
        // Reset flag after API completes for edits
        setTimeout(() => {
          onSkipRealtime?.(false);
        }, 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {transaction ? (
          <Button variant="ghost" size="icon">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button>Add Transaction</Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{transaction ? "Edit Transaction" : "Add Transaction"}</DialogTitle>
          <DialogDescription>
            {transaction
              ? "Update the transaction details."
              : "Enter a new transaction. Use positive amounts for income and negative amounts for expenses."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bank_account">Bank Account *</Label>
                <Select
                  value={bankAccountId}
                  onValueChange={setBankAccountId}
                  required
                >
                  <SelectTrigger id="bank_account">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id.toString()}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="date"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(d) => d && setDate(d)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="pl-7"
                  required
                  autoFocus
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Use positive for income, negative for expenses
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Client payment"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={categoryId} onValueChange={setCategoryId} required>
                <SelectTrigger id="category">
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

            {isTransfer && (
              <div className="space-y-2">
                <Label htmlFor="transfer_to">Transfer To Account *</Label>
                <Select
                  value={transferToAccountId}
                  onValueChange={setTransferToAccountId}
                  required
                >
                  <SelectTrigger id="transfer_to">
                    <SelectValue placeholder="Select destination account" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts
                      .filter((acc) => acc.id.toString() !== bankAccountId)
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
              </div>
            )}

            {error && (
              <div className="text-sm text-destructive">{error}</div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? transaction
                  ? "Updating..."
                  : "Creating..."
                : transaction
                  ? "Update Transaction"
                  : "Create Transaction"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


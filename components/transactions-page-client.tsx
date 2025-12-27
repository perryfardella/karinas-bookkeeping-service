"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TransactionForm } from "@/components/transaction-form";
import { TransactionTable } from "@/components/transaction-table";
import {
  TransactionFiltersComponent,
  TransactionFilters,
} from "@/components/transaction-filters";
import { ExportButton } from "@/components/export-button";
import { DollarSign, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { useInfiniteTransactions } from "@/hooks/use-infinite-transactions";
import { useSearchParams } from "next/navigation";
import { CategoryWithChildren } from "@/lib/supabase/queries/categories";

type BankAccount = {
  id: number;
  name: string;
};

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
  running_balance: number;
};

export default function TransactionsPageClient({
  initialBankAccounts,
  initialCategories,
}: {
  initialBankAccounts: BankAccount[];
  initialCategories: CategoryWithChildren[];
}) {
  const searchParams = useSearchParams();

  // Initialize filters from URL parameters
  const initialFilters: TransactionFilters = {};
  const bankAccountIdsParam = searchParams.get("bank_account_ids");
  if (bankAccountIdsParam) {
    initialFilters.bank_account_ids = bankAccountIdsParam
      .split(",")
      .map(Number)
      .filter((id) => !isNaN(id));
  }

  const [filters, setFilters] = useState<TransactionFilters>(initialFilters);
  const [sortField, setSortField] = useState<string>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [totals, setTotals] = useState<{
    total: number;
    income: number;
    expenses: number;
    count: number;
  } | null>(null);
  const skipRealtimeRef = useRef(false);
  const realtimeChannelRef = useRef<any>(null);
  const resetTransactionsRef = useRef<(() => Promise<void>) | null>(null);

  const {
    data: transactions,
    isLoading,
    isFetching,
    hasMore,
    fetchNextPage,
    reset: resetTransactions,
    updateData,
  } = useInfiniteTransactions({
    pageSize: 20,
    sortField,
    sortDirection,
    filters,
  });

  // Store reset function in ref to avoid dependency issues
  resetTransactionsRef.current = resetTransactions;

  // Update filters when URL parameters change
  useEffect(() => {
    const bankAccountIdsParam = searchParams.get("bank_account_ids");
    if (bankAccountIdsParam) {
      const accountIds = bankAccountIdsParam
        .split(",")
        .map(Number)
        .filter((id) => !isNaN(id));
      if (accountIds.length > 0) {
        setFilters((prev) => ({
          ...prev,
          bank_account_ids: accountIds,
        }));
      }
    } else {
      // Clear bank_account_ids filter if not in URL
      setFilters((prev) => {
        const { bank_account_ids, ...rest } = prev;
        return rest;
      });
    }
  }, [searchParams]);

  // Load totals separately (needs all transactions, not just loaded ones)
  useEffect(() => {
    const loadTotals = async () => {
      try {
        const params = new URLSearchParams({
          page: "1", // Required by API
          pageSize: "1", // We only need totals, not transactions
          ...(filters.bank_account_ids && {
            bank_account_ids: filters.bank_account_ids.join(","),
          }),
          ...(filters.start_date && { start_date: filters.start_date }),
          ...(filters.end_date && { end_date: filters.end_date }),
          ...(filters.category_ids && {
            category_ids: filters.category_ids.join(","),
          }),
          ...(filters.min_amount !== undefined && {
            min_amount: filters.min_amount.toString(),
          }),
          ...(filters.max_amount !== undefined && {
            max_amount: filters.max_amount.toString(),
          }),
          ...(filters.search && { search: filters.search }),
        });

        const response = await fetch(`/api/transactions?${params}`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error ||
              `Failed to fetch totals: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();
        setTotals(data.totals || null);
      } catch (error) {
        console.error("Error loading totals:", error);
        // Don't set totals to null on error, keep previous value
      }
    };

    loadTotals();
  }, [filters]);

  // Set up real-time subscription (separate effect to avoid re-subscribing on filter changes)
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("transactions-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
        },
        (payload: any) => {
          // Skip reload if we've optimistically updated this specific transaction
          if (skipRealtimeRef.current) {
            return;
          }

          // Reset and reload transactions when changes occur from other sources
          resetTransactionsRef.current?.();
        }
      )
      .subscribe();

    realtimeChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      realtimeChannelRef.current = null;
    };
  }, []); // Empty deps - use ref to call reset

  // Function to temporarily disable realtime
  const disableRealtime = () => {
    if (realtimeChannelRef.current) {
      const supabase = createClient();
      supabase.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
    }
  };

  // Function to re-enable realtime
  const enableRealtime = () => {
    const supabase = createClient();
    const channel = supabase
      .channel("transactions-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
        },
        () => {
          if (skipRealtimeRef.current) {
            return;
          }
          resetTransactionsRef.current?.();
        }
      )
      .subscribe();
    realtimeChannelRef.current = channel;
  };

  const handleSortChange = (field: string, direction: "asc" | "desc") => {
    setSortField(field);
    setSortDirection(direction);
  };

  const handleFiltersChange = (newFilters: TransactionFilters) => {
    setFilters(newFilters);
  };

  // Determine if we should show the bank balance column
  // Show it if:
  // 1. Filtering by exactly one bank account AND no other filters are applied, OR
  // 2. No filters at all and user has only one account
  const hasOtherFilters = !!(
    filters.start_date ||
    filters.end_date ||
    filters.category_ids ||
    filters.min_amount !== undefined ||
    filters.max_amount !== undefined ||
    filters.search
  );

  const shouldShowBankBalance =
    (filters.bank_account_ids &&
      filters.bank_account_ids.length === 1 &&
      !hasOtherFilters) ||
    (!filters.bank_account_ids &&
      !hasOtherFilters &&
      initialBankAccounts.length === 1);

  return (
    <div className="container mx-auto py-4 sm:py-8 px-4 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Transactions</h1>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <ExportButton transactions={transactions} />
          <TransactionForm
            bankAccounts={initialBankAccounts}
            categories={initialCategories}
            onSuccess={() => {
              resetTransactions();
            }}
          />
        </div>
      </div>

      <TransactionFiltersComponent
        bankAccounts={initialBankAccounts}
        categories={initialCategories}
        filters={filters}
        onFiltersChange={handleFiltersChange}
      />

      {totals && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.count}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Income
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                }).format(totals.income)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Expenses
              </CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                }).format(Math.abs(totals.expenses))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Total</CardTitle>
              <DollarSign className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  totals.total >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                }).format(totals.total)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center gap-2 py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <div className="text-muted-foreground">Loading transactions...</div>
        </div>
      ) : (
        <TransactionTable
          transactions={transactions}
          hasMore={hasMore}
          isFetching={isFetching}
          onLoadMore={fetchNextPage}
          onSortChange={handleSortChange}
          sortField={sortField}
          sortDirection={sortDirection}
          bankAccounts={initialBankAccounts}
          categories={initialCategories}
          showBankBalance={shouldShowBankBalance}
          onRefresh={() => {
            resetTransactions();
          }}
          onTransactionsUpdate={(updater) => {
            // Update the hook's data optimistically
            updateData(updater);
          }}
          onSkipRealtime={(skip) => {
            skipRealtimeRef.current = skip;
            if (skip) {
              // Temporarily unsubscribe from realtime to prevent reload
              disableRealtime();
              // Re-subscribe after delay
              setTimeout(() => {
                enableRealtime();
                skipRealtimeRef.current = false;
              }, 2000);
            }
          }}
        />
      )}
    </div>
  );
}

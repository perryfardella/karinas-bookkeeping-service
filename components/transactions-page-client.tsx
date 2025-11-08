"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TransactionForm } from "@/components/transaction-form";
import { TransactionTable } from "@/components/transaction-table";
import { TransactionFiltersComponent, TransactionFilters } from "@/components/transaction-filters";
import { ExportButton } from "@/components/export-button";
import { DollarSign, TrendingUp, TrendingDown } from "lucide-react";

type BankAccount = {
  id: number;
  name: string;
};

type CategoryWithChildren = {
  id: number;
  name: string;
  parent_id: number | null;
  children?: CategoryWithChildren[];
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
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totals, setTotals] = useState<{
    total: number;
    income: number;
    expenses: number;
    count: number;
  } | null>(null);
  const [filters, setFilters] = useState<TransactionFilters>({});
  const [sortField, setSortField] = useState<string>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const pageSize = 20;
  const skipRealtimeRef = useRef(false);
  const realtimeChannelRef = useRef<any>(null);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: pageSize.toString(),
        sortField,
        sortDirection,
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
        throw new Error("Failed to fetch transactions");
      }

      const data = await response.json();
      setTransactions(data.transactions || []);
      setTotalPages(data.totalPages || 1);
      setTotals(data.totals || null);
    } catch (error) {
      console.error("Error loading transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [currentPage, filters, sortField, sortDirection]);

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
          // Check both the skip flag (for bulk operations) and specific IDs
          if (skipRealtimeRef.current) {
            return;
          }
          
          // If we have specific transaction IDs that were optimistically updated,
          // we could check payload.new?.id here, but for now the flag should be sufficient
          
          // Reload transactions when changes occur from other sources
          loadTransactions();
        }
      )
      .subscribe();

    realtimeChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      realtimeChannelRef.current = null;
    };
  }, []); // Empty deps - only subscribe once

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
          loadTransactions();
        }
      )
      .subscribe();
    realtimeChannelRef.current = channel;
  };

  const handleSortChange = (field: string, direction: "asc" | "desc") => {
    setSortField(field);
    setSortDirection(direction);
    setCurrentPage(1);
  };

  const handleFiltersChange = (newFilters: TransactionFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Transactions</h1>
        <div className="flex gap-2">
          <ExportButton transactions={transactions} />
          <TransactionForm
            bankAccounts={initialBankAccounts}
            categories={initialCategories}
            onSuccess={loadTransactions}
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
              <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.count}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Income</CardTitle>
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
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
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

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          Loading transactions...
        </div>
      ) : (
        <TransactionTable
          transactions={transactions}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          onSortChange={handleSortChange}
          sortField={sortField}
          sortDirection={sortDirection}
          bankAccounts={initialBankAccounts}
          categories={initialCategories}
          onRefresh={loadTransactions}
          onTransactionsUpdate={(updater) => {
            setTransactions(updater);
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

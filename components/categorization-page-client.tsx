"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CategorizationTable } from "@/components/categorization-table";
import { CategoryWithChildren } from "@/lib/supabase/queries/categories";

type ParsedTransaction = {
  date: string;
  description: string;
  amount: number;
  runningBalance?: number;
  rawRow: string[];
};

type BankAccount = {
  id: number;
  name: string;
};

export function CategorizationPageClient({
  bankAccounts,
  categories,
}: {
  bankAccounts: BankAccount[];
  categories: CategoryWithChildren[];
}) {
  const router = useRouter();
  const [pendingData, setPendingData] = useState<{
    transactions: ParsedTransaction[];
    bankAccountId: number;
    fileName: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load pending transactions from sessionStorage
    const stored = sessionStorage.getItem("pendingTransactions");
    if (!stored) {
      router.push("/dashboard/upload");
      return;
    }

    try {
      const data = JSON.parse(stored);
      setPendingData(data);
    } catch (error) {
      console.error("Error parsing pending transactions:", error);
      router.push("/dashboard/upload");
    } finally {
      setLoading(false);
    }
  }, [router]);

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center py-12 text-muted-foreground">
          Loading...
        </div>
      </div>
    );
  }

  if (!pendingData) {
    return null;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <CategorizationTable
        transactions={pendingData.transactions}
        categories={categories}
        bankAccounts={bankAccounts}
        bankAccountId={pendingData.bankAccountId}
      />
    </div>
  );
}


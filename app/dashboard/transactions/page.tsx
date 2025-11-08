import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getBankAccounts } from "@/lib/supabase/queries/bank-accounts";
import { getCategoryTree } from "@/lib/supabase/queries/categories";
import TransactionsPageClient from "@/components/transactions-page-client";
import { Loader2 } from "lucide-react";

export default async function TransactionsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const [bankAccounts, categories] = await Promise.all([
    getBankAccounts(),
    getCategoryTree(),
  ]);

  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center gap-2 py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <div className="text-muted-foreground">Loading transactions...</div>
        </div>
      }
    >
      <TransactionsPageClient
        initialBankAccounts={bankAccounts}
        initialCategories={categories}
      />
    </Suspense>
  );
}


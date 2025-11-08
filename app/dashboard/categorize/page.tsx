import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBankAccounts } from "@/lib/supabase/queries/bank-accounts";
import { getCategoryTree } from "@/lib/supabase/queries/categories";
import { CategorizationPageClient } from "@/components/categorization-page-client";

export default async function CategorizePage() {
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
    <CategorizationPageClient
      bankAccounts={bankAccounts}
      categories={categories}
    />
  );
}

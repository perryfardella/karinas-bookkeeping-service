import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBankAccountsWithBalances } from "@/lib/supabase/queries/bank-accounts";
import { BankAccountList } from "@/components/bank-account-list";

export default async function BankAccountsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const accounts = await getBankAccountsWithBalances();

  return (
    <div className="container mx-auto py-8 px-4">
      <BankAccountList accounts={accounts} />
    </div>
  );
}


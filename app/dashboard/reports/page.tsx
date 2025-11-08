import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ReportsPageClient from "@/components/reports-page-client";

export default async function ReportsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return <ReportsPageClient />;
}


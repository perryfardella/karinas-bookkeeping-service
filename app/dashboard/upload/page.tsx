import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBankAccounts } from "@/lib/supabase/queries/bank-accounts";
import { CSVUploadForm } from "@/components/csv-upload-form";

export default async function UploadPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const bankAccounts = await getBankAccounts();

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Upload CSV</h1>
          <p className="text-muted-foreground mt-2">
            Upload a CSV file containing bank transactions. After uploading,
            you'll be able to review and categorize each transaction before
            importing them.
          </p>
        </div>

        <div className="max-w-2xl">
          <div className="border rounded-lg p-6 space-y-4">
            <h2 className="font-semibold">CSV Format</h2>
            <p className="text-sm text-muted-foreground">
              Your CSV file should have the following columns (comma-separated,
              no header row):
            </p>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Date (MM/DD/YYYY format, e.g., "06/10/2025")</li>
              <li>Description (text field)</li>
              <li>Debit Amount (numeric, for expenses)</li>
              <li>Credit Amount (numeric, for income)</li>
              <li>Running Balance (numeric)</li>
            </ol>
          </div>

          <div className="mt-6">
            <CSVUploadForm bankAccounts={bankAccounts} />
          </div>
        </div>
      </div>
    </div>
  );
}


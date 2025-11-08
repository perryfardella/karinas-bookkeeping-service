"use client";

import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { Upload, FileText } from "lucide-react";
import { parseCSV } from "@/lib/utils/csv-parser";

type BankAccount = {
  id: number;
  name: string;
};

type CSVUploadFormProps = {
  bankAccounts: BankAccount[];
};

export function CSVUploadForm({
  bankAccounts,
}: CSVUploadFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [bankAccountId, setBankAccountId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith(".csv")) {
        setError("Please select a CSV file");
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!file) {
      setError("Please select a file");
      return;
    }

    if (!bankAccountId) {
      setError("Please select a bank account");
      return;
    }

    setIsProcessing(true);

    try {
      const result = await parseCSV(file);
      
      if (result.errors.length > 0 && result.transactions.length === 0) {
        setError(
          `Failed to parse CSV: ${result.errors[0].message} (row ${result.errors[0].row})`
        );
        setIsProcessing(false);
        return;
      }

      // Store parsed transactions in sessionStorage and redirect to categorization page
      sessionStorage.setItem(
        "pendingTransactions",
        JSON.stringify({
          transactions: result.transactions,
          bankAccountId: parseInt(bankAccountId),
          fileName: file.name,
        })
      );

      setOpen(false);
      setFile(null);
      setBankAccountId("");
      router.push("/dashboard/categorize");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process CSV file");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Upload className="mr-2 h-4 w-4" />
          Upload CSV
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload CSV File</DialogTitle>
          <DialogDescription>
            Upload a CSV file containing bank transactions. The file should have
            columns: Date (MM/DD/YYYY), Description, Debit Amount, Credit Amount,
            Running Balance.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
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
              <Label htmlFor="file">CSV File *</Label>
              <div className="flex items-center gap-2">
                <input
                  id="file"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="file"
                  className="flex flex-1 items-center gap-2 px-4 py-2 border rounded-md cursor-pointer hover:bg-muted"
                >
                  <FileText className="h-4 w-4" />
                  <span className="flex-1">
                    {file ? file.name : "Choose a CSV file"}
                  </span>
                </label>
              </div>
            </div>

            {error && (
              <div className="text-sm text-destructive">{error}</div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
                setFile(null);
                setBankAccountId("");
                setError(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isProcessing || !file || !bankAccountId}>
              {isProcessing ? "Processing..." : "Upload & Review"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


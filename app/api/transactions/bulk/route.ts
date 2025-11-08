import { NextRequest, NextResponse } from "next/server";
import {
  createTransaction,
  createTransferTransaction,
} from "@/lib/supabase/queries/transactions";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { transactions } = await request.json();

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json(
        { error: "Transactions array is required" },
        { status: 400 }
      );
    }

    const results = [];
    const errors = [];

    for (const txn of transactions) {
      try {
        if (txn.transfer_to_account_id) {
          const result = await createTransferTransaction(
            txn.bank_account_id,
            txn.transfer_to_account_id,
            txn.date,
            txn.amount,
            txn.description,
            txn.category_id
          );
          results.push(result.outgoing, result.incoming);
        } else {
          const result = await createTransaction(
            txn.bank_account_id,
            txn.date,
            txn.amount,
            txn.description,
            txn.category_id,
            null
          );
          results.push(result);
        }
      } catch (error) {
        errors.push({
          transaction: txn,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      success: true,
      imported: results.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Error importing transactions:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to import transactions",
      },
      { status: 500 }
    );
  }
}


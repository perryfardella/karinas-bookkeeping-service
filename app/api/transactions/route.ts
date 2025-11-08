import { NextRequest, NextResponse } from "next/server";
import {
  createTransaction,
  createTransferTransaction,
  getTransactions,
  getTransactionCount,
  getTransactionTotals,
} from "@/lib/supabase/queries/transactions";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const sortField = searchParams.get("sortField") || "date";
    const sortDirection = (searchParams.get("sortDirection") || "desc") as "asc" | "desc";

    const filters: any = {};
    if (searchParams.get("bank_account_ids")) {
      filters.bank_account_ids = searchParams
        .get("bank_account_ids")!
        .split(",")
        .map(Number);
    }
    if (searchParams.get("start_date")) {
      filters.start_date = searchParams.get("start_date")!;
    }
    if (searchParams.get("end_date")) {
      filters.end_date = searchParams.get("end_date")!;
    }
    if (searchParams.get("category_ids")) {
      filters.category_ids = searchParams
        .get("category_ids")!
        .split(",")
        .map(Number);
    }
    if (searchParams.get("min_amount")) {
      filters.min_amount = parseFloat(searchParams.get("min_amount")!);
    }
    if (searchParams.get("max_amount")) {
      filters.max_amount = parseFloat(searchParams.get("max_amount")!);
    }
    if (searchParams.get("search")) {
      filters.search = searchParams.get("search")!;
    }

    const offset = (page - 1) * pageSize;
    const [transactions, count, totals] = await Promise.all([
      getTransactions(filters, pageSize, offset, sortField, sortDirection),
      getTransactionCount(filters),
      getTransactionTotals(filters),
    ]);

    return NextResponse.json({
      transactions,
      totalPages: Math.ceil(count / pageSize),
      count,
      totals,
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch transactions",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      bank_account_id,
      date,
      amount,
      description,
      category_id,
      transfer_to_account_id,
    } = await request.json();

    // Validate required fields
    if (!bank_account_id || !date || amount === undefined || !description || !category_id) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if this is a transfer transaction
    if (transfer_to_account_id) {
      const result = await createTransferTransaction(
        bank_account_id,
        transfer_to_account_id,
        date,
        amount,
        description,
        category_id
      );
      return NextResponse.json(result, { status: 201 });
    } else {
      const transaction = await createTransaction(
        bank_account_id,
        date,
        amount,
        description,
        category_id,
        null
      );
      return NextResponse.json(transaction, { status: 201 });
    }
  } catch (error) {
    console.error("Error creating transaction:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create transaction",
      },
      { status: 500 }
    );
  }
}


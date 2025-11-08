import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { transaction_ids } = await request.json();

    if (!Array.isArray(transaction_ids) || transaction_ids.length === 0) {
      return NextResponse.json(
        { error: "transaction_ids array is required" },
        { status: 400 }
      );
    }

    // Bulk delete all selected transactions
    const { error } = await supabase
      .from("transactions")
      .delete()
      .in("id", transaction_ids);

    if (error) {
      throw new Error(`Failed to bulk delete transactions: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      deleted: transaction_ids.length,
    });
  } catch (error) {
    console.error("Error bulk deleting transactions:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to bulk delete transactions",
      },
      { status: 500 }
    );
  }
}


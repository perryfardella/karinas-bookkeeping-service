import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { transaction_ids, category_id, transfer_to_account_id } = await request.json();

    if (!Array.isArray(transaction_ids) || transaction_ids.length === 0) {
      return NextResponse.json(
        { error: "transaction_ids array is required" },
        { status: 400 }
      );
    }

    if (!category_id) {
      return NextResponse.json(
        { error: "category_id is required" },
        { status: 400 }
      );
    }

    // Bulk update all selected transactions
    const { data, error } = await supabase
      .from("transactions")
      .update({
        category_id,
        transfer_to_account_id: transfer_to_account_id || null,
      })
      .in("id", transaction_ids)
      .select();

    if (error) {
      throw new Error(`Failed to bulk update transactions: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      updated: data?.length || 0,
    });
  } catch (error) {
    console.error("Error bulk updating transactions:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to bulk update transactions",
      },
      { status: 500 }
    );
  }
}


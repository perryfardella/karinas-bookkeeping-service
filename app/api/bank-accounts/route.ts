import { NextRequest, NextResponse } from "next/server";
import { createBankAccount, updateBankAccount, deleteBankAccount } from "@/lib/supabase/queries/bank-accounts";
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

    const { name } = await request.json();

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Account name is required" },
        { status: 400 }
      );
    }

    const account = await createBankAccount(name.trim());
    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    console.error("Error creating bank account:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create bank account" },
      { status: 500 }
    );
  }
}


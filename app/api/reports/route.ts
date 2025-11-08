import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTransactions } from "@/lib/supabase/queries/transactions";
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, parseISO } from "date-fns";

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
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");

    const filters: any = {};
    if (startDate) filters.start_date = startDate;
    if (endDate) filters.end_date = endDate;

    // Get all transactions in the date range (no pagination for reports)
    const transactions = await getTransactions(filters, 10000, 0, "date", "asc");

    // Get all categories to build a map for parent lookups
    const { data: allCategories } = await supabase
      .from("categories")
      .select("id, name, parent_id")
      .eq("user_id", user.id);

    const categoryMapById = new Map<number, { id: number; name: string; parent_id: number | null }>();
    allCategories?.forEach((cat) => {
      categoryMapById.set(cat.id, cat);
    });

    // Helper function to get parent category name
    const getParentCategoryName = (categoryId: number): string | null => {
      const category = categoryMapById.get(categoryId);
      if (!category || !category.parent_id) {
        return null;
      }
      const parent = categoryMapById.get(category.parent_id);
      return parent ? parent.name : null;
    };

    // Group by category
    const categoryMap = new Map<
      number,
      {
        category_id: number;
        category_name: string;
        parent_category_name: string | null;
        total_amount: number;
        transaction_count: number;
      }
    >();

    transactions.forEach((txn) => {
      const categoryId = txn.category_id;
      const existing = categoryMap.get(categoryId);

      if (existing) {
        existing.total_amount += Number(txn.amount);
        existing.transaction_count += 1;
      } else {
        const parentName = getParentCategoryName(categoryId);
        categoryMap.set(categoryId, {
          category_id: categoryId,
          category_name: txn.category.name,
          parent_category_name: parentName,
          total_amount: Number(txn.amount),
          transaction_count: 1,
        });
      }
    });

    const summaries = Array.from(categoryMap.values());

    // Calculate totals
    const total_income = transactions
      .filter((t) => t.amount > 0)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const total_expenses = transactions
      .filter((t) => t.amount < 0)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const net_balance = total_income + total_expenses; // expenses are negative

    return NextResponse.json({
      summaries,
      total_income,
      total_expenses,
      net_balance,
    });
  } catch (error) {
    console.error("Error fetching reports:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch reports",
      },
      { status: 500 }
    );
  }
}


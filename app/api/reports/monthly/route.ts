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
    const startDateStr = searchParams.get("start_date");
    const endDateStr = searchParams.get("end_date");

    if (!startDateStr || !endDateStr) {
      return NextResponse.json(
        { error: "start_date and end_date are required" },
        { status: 400 }
      );
    }

    const startDate = parseISO(startDateStr);
    const endDate = parseISO(endDateStr);

    // Get all transactions in the date range
    const transactions = await getTransactions(
      { start_date: startDateStr, end_date: endDateStr },
      10000,
      0,
      "date",
      "asc"
    );

    // Group by month
    const months = eachMonthOfInterval({ start: startDate, end: endDate });
    const monthlyMap = new Map<string, { income: number; expenses: number }>();

    months.forEach((month) => {
      const monthKey = format(month, "MMM yyyy");
      monthlyMap.set(monthKey, { income: 0, expenses: 0 });
    });

    transactions.forEach((txn) => {
      const monthKey = format(parseISO(txn.date), "MMM yyyy");
      const monthData = monthlyMap.get(monthKey);
      if (monthData) {
        if (txn.amount > 0) {
          monthData.income += Number(txn.amount);
        } else {
          monthData.expenses += Math.abs(Number(txn.amount));
        }
      }
    });

    const monthlyData = Array.from(monthlyMap.entries()).map(([month, data]) => ({
      month,
      income: data.income,
      expenses: data.expenses,
    }));

    return NextResponse.json(monthlyData);
  } catch (error) {
    console.error("Error fetching monthly reports:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch monthly reports",
      },
      { status: 500 }
    );
  }
}



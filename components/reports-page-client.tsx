"use client";

import { useState, useEffect } from "react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { CategoryPieChart, MonthlyTrendChart } from "@/components/charts";
import { ExportButton } from "@/components/export-button";
import { CategoryDisplay } from "@/components/category-display";

type CategorySummary = {
  category_id: number;
  category_name: string;
  parent_category_name: string | null;
  total_amount: number;
  transaction_count: number;
};

type ReportsData = {
  summaries: CategorySummary[];
  total_income: number;
  total_expenses: number;
  net_balance: number;
};

export default function ReportsPageClient() {
  const [startDate, setStartDate] = useState<Date>(
    startOfMonth(subMonths(new Date(), 1))
  );
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ReportsData | null>(null);
  const [monthlyData, setMonthlyData] = useState<
    Array<{ month: string; income: number; expenses: number }>
  >([]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        start_date: format(startDate, "yyyy-MM-dd"),
        end_date: format(endDate, "yyyy-MM-dd"),
      });

      const response = await fetch(`/api/reports?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch reports");
      }

      const reportsData = await response.json();
      setData(reportsData);

      // Load monthly data for trend chart
      const monthlyResponse = await fetch(
        `/api/reports/monthly?start_date=${format(
          startDate,
          "yyyy-MM-dd"
        )}&end_date=${format(endDate, "yyyy-MM-dd")}`
      );
      if (monthlyResponse.ok) {
        const monthly = await monthlyResponse.json();
        setMonthlyData(monthly);
      }
    } catch (error) {
      console.error("Error loading reports:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const incomeSummaries =
    data?.summaries.filter((s) => s.total_amount > 0) || [];
  const expenseSummaries =
    data?.summaries.filter((s) => s.total_amount < 0) || [];

  return (
    <div className="container mx-auto py-4 sm:py-8 px-4 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            View financial summaries and category breakdowns
          </p>
        </div>
        {data && (
          <div className="w-full sm:w-auto">
            <ExportButton
              categorySummaries={data.summaries.map((s) => ({
                category_name: s.category_name,
                parent_category_name: s.parent_category_name,
                total_amount: s.total_amount,
                transaction_count: s.transaction_count,
              }))}
              filename={`reports-${format(startDate, "yyyy-MM-dd")}-${format(
                endDate,
                "yyyy-MM-dd"
              )}.csv`}
            />
          </div>
        )}
      </div>

      {/* Date Range Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Date Range</CardTitle>
          <CardDescription>Select the period for your report</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="space-y-2 flex-1">
              <label className="text-sm font-medium">Start Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? (
                      format(startDate, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(d) => d && setStartDate(d)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2 flex-1">
              <label className="text-sm font-medium">End Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? (
                      format(endDate, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(d) => d && setEndDate(d)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Total Income
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(data.total_income)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Total Expenses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(Math.abs(data.total_expenses))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  data.net_balance >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {formatCurrency(data.net_balance)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Category Summaries */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          Loading reports...
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Income Categories */}
          <Card>
            <CardHeader>
              <CardTitle>Income by Category</CardTitle>
              <CardDescription>Total income breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              {incomeSummaries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No income transactions in this period
                </div>
              ) : (
                <div className="space-y-4">
                  {incomeSummaries
                    .sort((a, b) => b.total_amount - a.total_amount)
                    .map((summary) => (
                      <div
                        key={summary.category_id}
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 p-3 border rounded-md"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">
                            <CategoryDisplay
                              categoryPath={
                                summary.parent_category_name
                                  ? `${summary.parent_category_name} > ${summary.category_name}`
                                  : summary.category_name
                              }
                              variant="medium"
                            />
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {summary.transaction_count} transaction
                            {summary.transaction_count !== 1 ? "s" : ""}
                          </div>
                        </div>
                        <div className="font-medium text-green-600 shrink-0">
                          {formatCurrency(summary.total_amount)}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Expense Categories */}
          <Card>
            <CardHeader>
              <CardTitle>Expenses by Category</CardTitle>
              <CardDescription>Total expense breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              {expenseSummaries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No expense transactions in this period
                </div>
              ) : (
                <div className="space-y-4">
                  {expenseSummaries
                    .sort(
                      (a, b) =>
                        Math.abs(a.total_amount) - Math.abs(b.total_amount)
                    )
                    .reverse()
                    .map((summary) => (
                      <div
                        key={summary.category_id}
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 p-3 border rounded-md"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">
                            <CategoryDisplay
                              categoryPath={
                                summary.parent_category_name
                                  ? `${summary.parent_category_name} > ${summary.category_name}`
                                  : summary.category_name
                              }
                              variant="medium"
                            />
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {summary.transaction_count} transaction
                            {summary.transaction_count !== 1 ? "s" : ""}
                          </div>
                        </div>
                        <div className="font-medium text-red-600 shrink-0">
                          {formatCurrency(Math.abs(summary.total_amount))}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Charts */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Expense Breakdown</CardTitle>
              <CardDescription>Distribution by category</CardDescription>
            </CardHeader>
            <CardContent>
              {expenseSummaries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No expense data to display
                </div>
              ) : (
                <CategoryPieChart
                  data={expenseSummaries.map((s) => {
                    const fullName = s.parent_category_name
                      ? `${s.parent_category_name} > ${s.category_name}`
                      : s.category_name;
                    return {
                      name: fullName,
                      value: Math.abs(s.total_amount),
                      fullName: fullName,
                    };
                  })}
                />
              )}
            </CardContent>
          </Card>

          {/* Line Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Trends</CardTitle>
              <CardDescription>Income and expenses over time</CardDescription>
            </CardHeader>
            <CardContent>
              {monthlyData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No data to display
                </div>
              ) : (
                <MonthlyTrendChart data={monthlyData} />
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

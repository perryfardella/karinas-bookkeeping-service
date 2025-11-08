"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Receipt,
  FolderTree,
  TrendingUp,
  Filter,
  BarChart3,
  FileDown,
  DollarSign,
  PieChart,
  LineChart,
} from "lucide-react";
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

// Fake data for demo charts
const categoryData = [
  { name: "Business Expenses", value: 3200, color: "hsl(var(--chart-1))" },
  { name: "Employee Payments", value: 2400, color: "hsl(var(--chart-2))" },
  { name: "Utilities", value: 1200, color: "hsl(var(--chart-3))" },
  { name: "Rent", value: 1800, color: "hsl(var(--chart-4))" },
  { name: "Healthcare Supplies", value: 800, color: "hsl(var(--chart-5))" },
];

const monthlyData = [
  { month: "Jan", income: 8500, expenses: 6200 },
  { month: "Feb", income: 9200, expenses: 6800 },
  { month: "Mar", income: 8800, expenses: 7100 },
  { month: "Apr", income: 10100, expenses: 6500 },
  { month: "May", income: 12450, expenses: 8230 },
  { month: "Jun", income: 11200, expenses: 7800 },
];

// Colors will be set dynamically using CSS variables
const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export default function Home() {
  return (
    <>
      {/* Hero Section */}
      <section className="container mx-auto flex flex-col items-center justify-center px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-2 text-sm">
            <DollarSign className="size-4" />
            <span>Simple bookkeeping for small businesses</span>
          </div>
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Simplify Your Business Finances
          </h2>
          <p className="mt-6 text-lg leading-8 text-muted-foreground sm:text-xl">
            A simple, intuitive bookkeeping service designed for small
            businesses. Track transactions, categorize expenses, and gain
            insights into your cash flow—all in one place.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/auth/sign-up">Get Started Free</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/auth/login">Log In</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y bg-muted/30">
        <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 sm:grid-cols-3">
            <div className="text-center">
              <div className="text-3xl font-bold">100%</div>
              <div className="mt-2 text-sm text-muted-foreground">
                Free Forever
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">5 min</div>
              <div className="mt-2 text-sm text-muted-foreground">
                Setup Time
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">Unlimited</div>
              <div className="mt-2 text-sm text-muted-foreground">
                Transactions
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h3 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need to manage your finances
          </h3>
          <p className="mt-4 text-lg text-muted-foreground">
            Built specifically for small businesses and freelancers who need
            clarity without complexity.
          </p>
        </div>
        <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="transition-all hover:shadow-md">
            <CardHeader>
              <div className="mb-4 inline-flex size-12 items-center justify-center rounded-lg bg-primary/10">
                <Receipt className="size-6 text-primary" />
              </div>
              <CardTitle>Transaction Management</CardTitle>
              <CardDescription>
                Easily input and track all your business transactions with
                manual entry. Keep a clear record of every income and expense.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="transition-all hover:shadow-md">
            <CardHeader>
              <div className="mb-4 inline-flex size-12 items-center justify-center rounded-lg bg-primary/10">
                <FolderTree className="size-6 text-primary" />
              </div>
              <CardTitle>Smart Categorization</CardTitle>
              <CardDescription>
                Organize transactions with customizable categories and
                sub-categories. Perfect for healthcare businesses, freelancers,
                and small service companies.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="transition-all hover:shadow-md">
            <CardHeader>
              <div className="mb-4 inline-flex size-12 items-center justify-center rounded-lg bg-primary/10">
                <TrendingUp className="size-6 text-primary" />
              </div>
              <CardTitle>Real-Time Balance</CardTitle>
              <CardDescription>
                Always know your current bank balance with automatic running
                totals that update as you add transactions.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="transition-all hover:shadow-md">
            <CardHeader>
              <div className="mb-4 inline-flex size-12 items-center justify-center rounded-lg bg-primary/10">
                <Filter className="size-6 text-primary" />
              </div>
              <CardTitle>Powerful Filtering</CardTitle>
              <CardDescription>
                Filter transactions by date range, category, amount, or search
                by description. Find what you need quickly.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="transition-all hover:shadow-md">
            <CardHeader>
              <div className="mb-4 inline-flex size-12 items-center justify-center rounded-lg bg-primary/10">
                <BarChart3 className="size-6 text-primary" />
              </div>
              <CardTitle>Visual Analytics</CardTitle>
              <CardDescription>
                Understand your spending patterns with charts and summaries. See
                category breakdowns and track trends over time.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="transition-all hover:shadow-md">
            <CardHeader>
              <div className="mb-4 inline-flex size-12 items-center justify-center rounded-lg bg-primary/10">
                <FileDown className="size-6 text-primary" />
              </div>
              <CardTitle>Export & Reports</CardTitle>
              <CardDescription>
                Export your transactions and summaries as CSV or PDF for tax
                preparation, audits, or further analysis.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Visual Demo Section */}
      <section className="border-t bg-muted/30">
        <div className="container mx-auto px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="text-center">
              <h3 className="text-3xl font-bold tracking-tight sm:text-4xl">
                See your finances at a glance
              </h3>
              <p className="mt-4 text-lg text-muted-foreground">
                Beautiful charts and visualizations help you understand your
                spending patterns instantly.
              </p>
            </div>
            <div className="mt-12 grid gap-8 lg:grid-cols-2">
              {/* Pie Chart Demo */}
              <Card className="overflow-hidden">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <PieChart className="size-5 text-primary" />
                    <CardTitle>Category Breakdown</CardTitle>
                  </div>
                  <CardDescription>
                    Visualize your expenses by category
                  </CardDescription>
                </CardHeader>
                <div className="px-6 pb-6">
                  <div className="h-64 w-full min-h-[256px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {categoryData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number, name: string) => [
                            `$${value.toLocaleString()}`,
                            name,
                          ]}
                          contentStyle={{
                            backgroundColor: "var(--card)",
                            border: "1px solid var(--border)",
                            borderRadius: "0.5rem",
                            color: "var(--card-foreground)",
                          }}
                        />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-4 text-sm">
                    {categoryData.map((item, index) => (
                      <div key={item.name} className="flex items-center gap-2">
                        <div
                          className="size-3 rounded-full"
                          style={{
                            backgroundColor: COLORS[index % COLORS.length],
                          }}
                        />
                        <span>{item.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              {/* Line Chart Demo */}
              <Card className="overflow-hidden">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <LineChart className="size-5 text-primary" />
                    <CardTitle>Monthly Trends</CardTitle>
                  </div>
                  <CardDescription>
                    Track your income and expenses over time
                  </CardDescription>
                </CardHeader>
                <div className="px-6 pb-6">
                  <div className="h-64 w-full min-h-[256px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart data={monthlyData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="var(--border)"
                          opacity={0.3}
                        />
                        <XAxis
                          dataKey="month"
                          className="text-xs"
                          tick={{ fill: "var(--muted-foreground)" }}
                        />
                        <YAxis
                          className="text-xs"
                          tick={{ fill: "var(--muted-foreground)" }}
                          tickFormatter={(value) => `$${value / 1000}k`}
                        />
                        <Tooltip
                          formatter={(value: number) =>
                            `$${value.toLocaleString()}`
                          }
                          contentStyle={{
                            backgroundColor: "var(--card)",
                            border: "1px solid var(--border)",
                            borderRadius: "0.5rem",
                            color: "var(--card-foreground)",
                          }}
                          labelStyle={{
                            color: "var(--card-foreground)",
                          }}
                        />
                        <Legend
                          wrapperStyle={{
                            color: "var(--card-foreground)",
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="income"
                          stroke="var(--chart-2)"
                          strokeWidth={2}
                          name="Income"
                          dot={{ fill: "var(--chart-2)", r: 4 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="expenses"
                          stroke="var(--chart-1)"
                          strokeWidth={2}
                          name="Expenses"
                          dot={{ fill: "var(--chart-1)", r: 4 }}
                        />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 flex justify-between text-sm">
                    <div>
                      <div className="font-medium">Total Income</div>
                      <div className="text-muted-foreground">
                        $
                        {monthlyData
                          .reduce((sum, item) => sum + item.income, 0)
                          .toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium">Total Expenses</div>
                      <div className="text-muted-foreground">
                        $
                        {monthlyData
                          .reduce((sum, item) => sum + item.expenses, 0)
                          .toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium">Net Balance</div>
                      <div className="text-muted-foreground">
                        $
                        {(
                          monthlyData.reduce(
                            (sum, item) => sum + item.income,
                            0
                          ) -
                          monthlyData.reduce(
                            (sum, item) => sum + item.expenses,
                            0
                          )
                        ).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t">
        <div className="container mx-auto px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h3 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to get started?
            </h3>
            <p className="mt-4 text-lg text-muted-foreground">
              Join today and take control of your business finances. It&apos;s
              free and takes just a minute to set up.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/auth/sign-up">Create Your Account</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/auth/login">Already have an account?</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

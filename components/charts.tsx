"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { getCategoryShortName } from "@/lib/utils/category-display";

type ChartData = {
  name: string;
  value: number;
  fullName?: string; // Store full name for tooltip
};

type MonthlyData = {
  month: string;
  income: number;
  expenses: number;
};

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function CategoryPieChart({ data }: { data: ChartData[] }) {
  // Transform data to include short names for labels and full names for tooltips
  const chartData = data.map((item) => ({
    ...item,
    shortName: getCategoryShortName(item.name),
    fullName: item.fullName || item.name,
  }));

  return (
    <ResponsiveContainer width="100%" height={250} minHeight={250}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ shortName, percent }) =>
            `${shortName}: ${(percent * 100).toFixed(0)}%`
          }
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={COLORS[index % COLORS.length]}
            />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number, name: string, props: any) => [
            `$${value.toLocaleString()}`,
            props.payload.fullName || name,
          ]}
          contentStyle={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "0.5rem",
            color: "var(--card-foreground)",
          }}
        />
        <Legend
          formatter={(value: string, entry: any) => entry.payload.fullName || value}
          wrapperStyle={{
            color: "var(--card-foreground)",
            fontSize: "0.875rem",
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function MonthlyTrendChart({ data }: { data: MonthlyData[] }) {
  return (
    <ResponsiveContainer width="100%" height={250} minHeight={250}>
      <LineChart data={data}>
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
          formatter={(value: number) => `$${value.toLocaleString()}`}
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
      </LineChart>
    </ResponsiveContainer>
  );
}


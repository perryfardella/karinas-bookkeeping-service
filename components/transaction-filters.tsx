"use client";

import { useState } from "react";
import { flattenCategoriesForSelect } from "@/lib/utils/category-display";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type TransactionFilters = {
  bank_account_ids?: number[];
  start_date?: string;
  end_date?: string;
  category_ids?: number[];
  min_amount?: number;
  max_amount?: number;
  search?: string;
};

type BankAccount = {
  id: number;
  name: string;
};

type Category = {
  id: number;
  name: string;
  parent_id: number | null;
};

type CategoryWithChildren = Category & {
  children?: CategoryWithChildren[];
};

type TransactionFiltersProps = {
  bankAccounts: BankAccount[];
  categories: CategoryWithChildren[];
  filters: TransactionFilters;
  onFiltersChange: (filters: TransactionFilters) => void;
};


export function TransactionFiltersComponent({
  bankAccounts,
  categories,
  filters,
  onFiltersChange,
}: TransactionFiltersProps) {
  const [startDate, setStartDate] = useState<Date | undefined>(
    filters.start_date ? new Date(filters.start_date) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    filters.end_date ? new Date(filters.end_date) : undefined
  );

  const flatCategories = flattenCategoriesForSelect(categories);

  const updateFilter = (key: keyof TransactionFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({});
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const hasActiveFilters = Object.keys(filters).length > 0;

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Filters</h3>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Bank Account</Label>
          <Select
            value={
              filters.bank_account_ids && filters.bank_account_ids.length > 0
                ? filters.bank_account_ids[0].toString()
                : "all"
            }
            onValueChange={(value) =>
              updateFilter("bank_account_ids", value === "all" ? undefined : [parseInt(value)])
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All accounts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All accounts</SelectItem>
              {bankAccounts.map((account) => (
                <SelectItem key={account.id} value={account.id.toString()}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Start Date</Label>
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
                {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={(d) => {
                  setStartDate(d);
                  updateFilter("start_date", d ? format(d, "yyyy-MM-dd") : undefined);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label>End Date</Label>
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
                {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={(d) => {
                  setEndDate(d);
                  updateFilter("end_date", d ? format(d, "yyyy-MM-dd") : undefined);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label>Category</Label>
          <Select
            value={
              filters.category_ids && filters.category_ids.length > 0
                ? filters.category_ids[0].toString()
                : "all"
            }
            onValueChange={(value) =>
              updateFilter("category_ids", value === "all" ? undefined : [parseInt(value)])
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {flatCategories.map((cat) => (
                <SelectItem 
                  key={cat.id} 
                  value={cat.id.toString()} 
                  title={cat.fullPath}
                  style={{ paddingLeft: `${8 + cat.level * 16}px` }}
                >
                  <span className="font-mono text-xs text-muted-foreground mr-2">
                    {cat.level > 0 && (cat.isLast ? "└─" : "├─")}
                  </span>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Min Amount</Label>
          <Input
            type="number"
            step="0.01"
            value={filters.min_amount ?? ""}
            onChange={(e) =>
              updateFilter(
                "min_amount",
                e.target.value ? parseFloat(e.target.value) : undefined
              )
            }
            placeholder="0.00"
          />
        </div>

        <div className="space-y-2">
          <Label>Max Amount</Label>
          <Input
            type="number"
            step="0.01"
            value={filters.max_amount ?? ""}
            onChange={(e) =>
              updateFilter(
                "max_amount",
                e.target.value ? parseFloat(e.target.value) : undefined
              )
            }
            placeholder="0.00"
          />
        </div>

        <div className="space-y-2 md:col-span-2 lg:col-span-3">
          <Label>Search Description</Label>
          <Input
            value={filters.search ?? ""}
            onChange={(e) =>
              updateFilter("search", e.target.value || undefined)
            }
            placeholder="Search transactions..."
          />
        </div>
      </div>
    </div>
  );
}


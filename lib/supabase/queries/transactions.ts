import { createClient } from "@/lib/supabase/server";

export type Transaction = {
  id: number;
  user_id: string;
  bank_account_id: number;
  date: string;
  amount: number;
  description: string;
  category_id: number;
  transfer_to_account_id: number | null;
  created_at: string;
};

export type TransactionWithDetails = Transaction & {
  bank_account: {
    id: number;
    name: string;
  };
  category: {
    id: number;
    name: string;
    parent_id: number | null;
  };
  transfer_to_account: {
    id: number;
    name: string;
  } | null;
  running_balance: number;
};

export type TransactionFilters = {
  bank_account_ids?: number[];
  start_date?: string;
  end_date?: string;
  category_ids?: number[];
  min_amount?: number;
  max_amount?: number;
  search?: string;
};

/**
 * Get transactions with filters
 */
export async function getTransactions(
  filters: TransactionFilters = {},
  limit: number = 20,
  offset: number = 0,
  orderBy: string = "date",
  orderDirection: "asc" | "desc" = "desc"
): Promise<TransactionWithDetails[]> {
  const supabase = await createClient();
  let query = supabase
    .from("transactions")
    .select(
      `
      *,
      bank_account:bank_accounts!bank_account_id(id, name),
      category:categories(id, name, parent_id),
      transfer_to_account:bank_accounts!transfer_to_account_id(id, name)
    `
    );

  // Apply filters
  if (filters.bank_account_ids && filters.bank_account_ids.length > 0) {
    query = query.in("bank_account_id", filters.bank_account_ids);
  }

  if (filters.start_date) {
    query = query.gte("date", filters.start_date);
  }

  if (filters.end_date) {
    query = query.lte("date", filters.end_date);
  }

  if (filters.category_ids && filters.category_ids.length > 0) {
    query = query.in("category_id", filters.category_ids);
  }

  if (filters.min_amount !== undefined) {
    query = query.gte("amount", filters.min_amount);
  }

  if (filters.max_amount !== undefined) {
    query = query.lte("amount", filters.max_amount);
  }

  if (filters.search) {
    query = query.ilike("description", `%${filters.search}%`);
  }

  // Apply ordering
  query = query.order(orderBy, { ascending: orderDirection === "asc" });

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch transactions: ${error.message}`);
  }

  // Calculate running balances
  const transactionsWithBalances = await Promise.all(
    (data || []).map(async (transaction, index) => {
      // Get all transactions up to this point for the same account, ordered by date
      const { data: previousTransactions } = await supabase
        .from("transactions")
        .select("amount")
        .eq("bank_account_id", transaction.bank_account_id)
        .lte("date", transaction.date)
        .order("date", { ascending: true })
        .order("id", { ascending: true });

      const runningBalance =
        previousTransactions?.reduce((sum, t) => sum + Number(t.amount), 0) ||
        0;

      return {
        ...transaction,
        running_balance: runningBalance,
      };
    })
  );

  return transactionsWithBalances;
}

/**
 * Get transaction totals (sum of amounts) matching filters
 */
export async function getTransactionTotals(
  filters: TransactionFilters = {}
): Promise<{ total: number; income: number; expenses: number; count: number }> {
  const supabase = await createClient();
  let query = supabase.from("transactions").select("amount");

  // Apply filters (same as getTransactionCount)
  if (filters.bank_account_ids && filters.bank_account_ids.length > 0) {
    query = query.in("bank_account_id", filters.bank_account_ids);
  }

  if (filters.start_date) {
    query = query.gte("date", filters.start_date);
  }

  if (filters.end_date) {
    query = query.lte("date", filters.end_date);
  }

  if (filters.category_ids && filters.category_ids.length > 0) {
    query = query.in("category_id", filters.category_ids);
  }

  if (filters.min_amount !== undefined) {
    query = query.gte("amount", filters.min_amount);
  }

  if (filters.max_amount !== undefined) {
    query = query.lte("amount", filters.max_amount);
  }

  if (filters.search) {
    query = query.ilike("description", `%${filters.search}%`);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get transaction totals: ${error.message}`);
  }

  const transactions = data || [];
  const total = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
  const income = transactions
    .filter((t) => Number(t.amount) > 0)
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const expenses = transactions
    .filter((t) => Number(t.amount) < 0)
    .reduce((sum, t) => sum + Number(t.amount), 0);

  return {
    total,
    income,
    expenses,
    count: transactions.length,
  };
}

/**
 * Get total count of transactions matching filters
 */
export async function getTransactionCount(
  filters: TransactionFilters = {}
): Promise<number> {
  const supabase = await createClient();
  let query = supabase.from("transactions").select("id", { count: "exact", head: true });

  // Apply filters
  if (filters.bank_account_ids && filters.bank_account_ids.length > 0) {
    query = query.in("bank_account_id", filters.bank_account_ids);
  }

  if (filters.start_date) {
    query = query.gte("date", filters.start_date);
  }

  if (filters.end_date) {
    query = query.lte("date", filters.end_date);
  }

  if (filters.category_ids && filters.category_ids.length > 0) {
    query = query.in("category_id", filters.category_ids);
  }

  if (filters.min_amount !== undefined) {
    query = query.gte("amount", filters.min_amount);
  }

  if (filters.max_amount !== undefined) {
    query = query.lte("amount", filters.max_amount);
  }

  if (filters.search) {
    query = query.ilike("description", `%${filters.search}%`);
  }

  const { count, error } = await query;

  if (error) {
    throw new Error(`Failed to count transactions: ${error.message}`);
  }

  return count || 0;
}

/**
 * Get a single transaction by ID
 */
export async function getTransaction(
  id: number
): Promise<TransactionWithDetails | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select(
      `
      *,
      bank_account:bank_accounts!bank_account_id(id, name),
      category:categories(id, name, parent_id),
      transfer_to_account:bank_accounts!transfer_to_account_id(id, name)
    `
    )
    .eq("id", id)
    .single();

  if (error) {
    throw new Error(`Failed to fetch transaction: ${error.message}`);
  }

  if (!data) return null;

  // Calculate running balance
  const { data: previousTransactions } = await supabase
    .from("transactions")
    .select("amount")
    .eq("bank_account_id", data.bank_account_id)
    .lte("date", data.date)
    .order("date", { ascending: true })
    .order("id", { ascending: true });

  const runningBalance =
    previousTransactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

  return {
    ...data,
    running_balance: runningBalance,
  };
}

/**
 * Create a new transaction
 */
export async function createTransaction(
  bankAccountId: number,
  date: string,
  amount: number,
  description: string,
  categoryId: number,
  transferToAccountId: number | null = null
): Promise<Transaction> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const { data, error } = await supabase
    .from("transactions")
    .insert({
      bank_account_id: bankAccountId,
      date,
      amount,
      description,
      category_id: categoryId,
      transfer_to_account_id: transferToAccountId,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create transaction: ${error.message}`);
  }

  return data;
}

/**
 * Update a transaction
 */
export async function updateTransaction(
  id: number,
  updates: {
    bank_account_id?: number;
    date?: string;
    amount?: number;
    description?: string;
    category_id?: number;
    transfer_to_account_id?: number | null;
  }
): Promise<Transaction> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update transaction: ${error.message}`);
  }

  return data;
}

/**
 * Delete a transaction
 */
export async function deleteTransaction(id: number): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("transactions").delete().eq("id", id);

  if (error) {
    throw new Error(`Failed to delete transaction: ${error.message}`);
  }
}

/**
 * Create transfer transactions (dual-entry)
 */
export async function createTransferTransaction(
  fromAccountId: number,
  toAccountId: number,
  date: string,
  amount: number,
  description: string,
  categoryId: number
): Promise<{ outgoing: Transaction; incoming: Transaction }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  // Create outgoing transaction (negative amount)
  const { data: outgoing, error: outgoingError } = await supabase
    .from("transactions")
    .insert({
      bank_account_id: fromAccountId,
      date,
      amount: -Math.abs(amount), // Ensure negative
      description,
      category_id: categoryId,
      transfer_to_account_id: toAccountId,
      user_id: user.id,
    })
    .select()
    .single();

  if (outgoingError) {
    throw new Error(`Failed to create outgoing transaction: ${outgoingError.message}`);
  }

  // Create incoming transaction (positive amount)
  const { data: incoming, error: incomingError } = await supabase
    .from("transactions")
    .insert({
      bank_account_id: toAccountId,
      date,
      amount: Math.abs(amount), // Ensure positive
      description: `Transfer from ${description}`,
      category_id: categoryId,
      transfer_to_account_id: fromAccountId,
      user_id: user.id,
    })
    .select()
    .single();

  if (incomingError) {
    // Rollback outgoing transaction if incoming fails
    await supabase.from("transactions").delete().eq("id", outgoing.id);
    throw new Error(`Failed to create incoming transaction: ${incomingError.message}`);
  }

  return { outgoing, incoming };
}


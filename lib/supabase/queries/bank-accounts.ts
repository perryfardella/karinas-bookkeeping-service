import { createClient } from "@/lib/supabase/server";

export type BankAccount = {
  id: number;
  user_id: string;
  name: string;
  created_at: string;
};

export type BankAccountWithBalance = BankAccount & {
  balance: number;
};

/**
 * Get all bank accounts for the current user
 */
export async function getBankAccounts(): Promise<BankAccount[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bank_accounts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch bank accounts: ${error.message}`);
  }

  return data || [];
}

/**
 * Get bank accounts with calculated balances
 */
export async function getBankAccountsWithBalances(): Promise<
  BankAccountWithBalance[]
> {
  const accounts = await getBankAccounts();
  const supabase = await createClient();

  const accountsWithBalances = await Promise.all(
    accounts.map(async (account) => {
      const { data, error } = await supabase.rpc("calculate_account_balance", {
        account_id: account.id,
      });

      if (error) {
        console.error(`Error calculating balance for account ${account.id}:`, error);
        return { ...account, balance: 0 };
      }

      return {
        ...account,
        balance: data || 0,
      };
    })
  );

  return accountsWithBalances;
}

/**
 * Get a single bank account by ID
 */
export async function getBankAccount(id: number): Promise<BankAccount | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bank_accounts")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    throw new Error(`Failed to fetch bank account: ${error.message}`);
  }

  return data;
}

/**
 * Get bank account with balance
 */
export async function getBankAccountWithBalance(
  id: number
): Promise<BankAccountWithBalance | null> {
  const account = await getBankAccount(id);
  if (!account) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("calculate_account_balance", {
    account_id: id,
  });

  if (error) {
    console.error(`Error calculating balance for account ${id}:`, error);
    return { ...account, balance: 0 };
  }

  return {
    ...account,
    balance: data || 0,
  };
}

/**
 * Create a new bank account
 */
export async function createBankAccount(name: string): Promise<BankAccount> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const { data, error } = await supabase
    .from("bank_accounts")
    .insert({ name, user_id: user.id })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create bank account: ${error.message}`);
  }

  // Create transfer category for this account
  await createTransferCategory(user.id, data.id, name);

  return data;
}

/**
 * Update a bank account
 */
export async function updateBankAccount(
  id: number,
  name: string
): Promise<BankAccount> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bank_accounts")
    .update({ name })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update bank account: ${error.message}`);
  }

  return data;
}

/**
 * Delete a bank account
 */
export async function deleteBankAccount(id: number): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("bank_accounts").delete().eq("id", id);

  if (error) {
    throw new Error(`Failed to delete bank account: ${error.message}`);
  }
}

/**
 * Create a transfer category for a bank account
 */
async function createTransferCategory(
  userId: string,
  accountId: number,
  accountName: string
): Promise<void> {
  const supabase = await createClient();

  // Find the Transfers parent category
  const { data: transfersCategory } = await supabase
    .from("categories")
    .select("id")
    .eq("user_id", userId)
    .eq("name", "Transfers")
    .is("parent_id", null)
    .single();

  if (!transfersCategory) {
    // If Transfers category doesn't exist, create it first
    const { data: newTransfersCategory } = await supabase
      .from("categories")
      .insert({
        user_id: userId,
        name: "Transfers",
        is_transfer_category: false,
      })
      .select()
      .single();

    if (newTransfersCategory) {
      await supabase.from("categories").insert({
        user_id: userId,
        name: `Transfer to ${accountName}`,
        parent_id: newTransfersCategory.id,
        is_transfer_category: true,
      });
    }
  } else {
    await supabase.from("categories").insert({
      user_id: userId,
      name: `Transfer to ${accountName}`,
      parent_id: transfersCategory.id,
      is_transfer_category: true,
    });
  }
}


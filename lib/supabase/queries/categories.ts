import { createClient } from "@/lib/supabase/server";

export type Category = {
  id: number;
  user_id: string;
  name: string;
  parent_id: number | null;
  is_transfer_category: boolean;
  created_at: string;
};

export type CategoryWithChildren = Category & {
  children?: CategoryWithChildren[];
};

/**
 * Get all categories for the current user, organized hierarchically
 */
export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch categories: ${error.message}`);
  }

  return data || [];
}

/**
 * Get categories organized as a tree structure
 */
export async function getCategoryTree(): Promise<CategoryWithChildren[]> {
  const categories = await getCategories();
  const categoryMap = new Map<number, CategoryWithChildren>();
  const roots: CategoryWithChildren[] = [];

  // First pass: create map of all categories
  categories.forEach((cat) => {
    categoryMap.set(cat.id, { ...cat, children: [] });
  });

  // Second pass: build tree structure
  categories.forEach((cat) => {
    const categoryWithChildren = categoryMap.get(cat.id)!;
    if (cat.parent_id === null) {
      roots.push(categoryWithChildren);
    } else {
      const parent = categoryMap.get(cat.parent_id);
      if (parent) {
        if (!parent.children) {
          parent.children = [];
        }
        parent.children.push(categoryWithChildren);
      }
    }
  });

  return roots;
}

/**
 * Get a single category by ID
 */
export async function getCategory(id: number): Promise<Category | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    throw new Error(`Failed to fetch category: ${error.message}`);
  }

  return data;
}

/**
 * Get all parent categories (categories without a parent)
 */
export async function getParentCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .is("parent_id", null)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch parent categories: ${error.message}`);
  }

  return data || [];
}

/**
 * Get sub-categories for a parent category
 */
export async function getSubCategories(
  parentId: number
): Promise<Category[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("parent_id", parentId)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch sub-categories: ${error.message}`);
  }

  return data || [];
}

/**
 * Create a new category
 */
export async function createCategory(
  name: string,
  parentId: number | null = null,
  isTransferCategory: boolean = false
): Promise<Category> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const { data, error } = await supabase
    .from("categories")
    .insert({
      name,
      parent_id: parentId,
      is_transfer_category: isTransferCategory,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create category: ${error.message}`);
  }

  return data;
}

/**
 * Update a category
 */
export async function updateCategory(
  id: number,
  name: string,
  parentId: number | null = null
): Promise<Category> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .update({ name, parent_id: parentId })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update category: ${error.message}`);
  }

  return data;
}

/**
 * Delete a category
 */
export async function deleteCategory(id: number): Promise<void> {
  const supabase = await createClient();

  // Check if category has transactions
  const { data: transactions, error: transactionsError } = await supabase
    .from("transactions")
    .select("id")
    .eq("category_id", id)
    .limit(1);

  if (transactionsError) {
    throw new Error(`Failed to check category usage: ${transactionsError.message}`);
  }

  if (transactions && transactions.length > 0) {
    throw new Error(
      "Cannot delete category that has transactions. Please reassign or delete transactions first."
    );
  }

  const { error } = await supabase.from("categories").delete().eq("id", id);

  if (error) {
    throw new Error(`Failed to delete category: ${error.message}`);
  }
}

/**
 * Check if a category has transactions
 */
export async function categoryHasTransactions(id: number): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("id")
    .eq("category_id", id)
    .limit(1);

  if (error) {
    return false;
  }

  return (data?.length ?? 0) > 0;
}


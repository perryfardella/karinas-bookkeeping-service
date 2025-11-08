import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCategoryTree } from "@/lib/supabase/queries/categories";

/**
 * Ensure default categories exist for the current user
 * This is called on first dashboard access if categories don't exist
 */
export async function ensureDefaultCategories() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  // Check if user has any categories
  const { data: existingCategories } = await supabase
    .from("categories")
    .select("id")
    .eq("user_id", user.id)
    .limit(1);

  // If no categories exist, seed them
  if (!existingCategories || existingCategories.length === 0) {
    const { error } = await supabase.rpc("seed_default_categories", {
      user_uuid: user.id,
    });

    if (error) {
      console.error("Error seeding default categories:", error);
    }
  }
}


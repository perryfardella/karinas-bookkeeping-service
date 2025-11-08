import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCategoryTree } from "@/lib/supabase/queries/categories";
import { CategoryTree } from "@/components/category-tree";

export default async function CategoriesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const categories = await getCategoryTree();

  return (
    <div className="container mx-auto py-8 px-4">
      <CategoryTree categories={categories} />
    </div>
  );
}


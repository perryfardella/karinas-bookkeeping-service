"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { flattenCategoriesForSelect } from "@/lib/utils/category-display";

type CategoryWithChildren = {
  id: number;
  name: string;
  parent_id: number | null;
  children?: CategoryWithChildren[];
};

// Helper function to filter out excluded categories and their descendants
function filterCategoriesWithExclusions<
  T extends { id: number; name: string; children?: T[] }
>(categories: T[], excludeIds: Set<number>): T[] {
  return categories
    .filter((cat) => !excludeIds.has(cat.id))
    .map((cat) => {
      if (cat.children && cat.children.length > 0) {
        const filteredChildren = filterCategoriesWithExclusions(
          cat.children,
          excludeIds
        );
        return { ...cat, children: filteredChildren };
      }
      return cat;
    });
}

// Helper function to find a category by ID in the tree
function findCategoryById(
  categories: CategoryWithChildren[],
  id: number
): CategoryWithChildren | null {
  for (const cat of categories) {
    if (cat.id === id) {
      return cat;
    }
    if (cat.children && cat.children.length > 0) {
      const found = findCategoryById(cat.children, id);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

// Helper function to collect all descendant IDs
function getDescendantIds(cat: CategoryWithChildren): number[] {
  const ids = [cat.id];
  if (cat.children && cat.children.length > 0) {
    cat.children.forEach((child) => {
      ids.push(...getDescendantIds(child));
    });
  }
  return ids;
}

type CategoryFormProps = {
  categoryId?: number;
  initialName?: string;
  initialParentId?: number | null;
  allCategories?: CategoryWithChildren[];
  onSuccess?: (newCategoryId?: number) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
};

export function CategoryForm({
  categoryId,
  initialName = "",
  initialParentId = null,
  allCategories = [],
  onSuccess,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  trigger,
}: CategoryFormProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const [name, setName] = useState(initialName);
  const [parentId, setParentId] = useState<string>(
    initialParentId?.toString() || "none"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use controlled open if provided, otherwise use internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;

  useEffect(() => {
    if (open) {
      setName(initialName);
      setParentId(initialParentId?.toString() || "none");
      setError(null);
    }
  }, [open, initialName, initialParentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const url = categoryId
        ? `/api/categories/${categoryId}`
        : "/api/categories";
      const method = categoryId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          parent_id:
            parentId && parentId !== "none" ? parseInt(parentId) : null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save category");
      }

      const result = await response.json();
      const newCategoryId = result.id;

      setOpen(false);
      setName("");
      setParentId("none");

      // Only refresh router if not controlled (to avoid double refresh)
      if (controlledOpen === undefined) {
        router.refresh();
      }

      onSuccess?.(newCategoryId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        !controlledOpen && (
          <DialogTrigger asChild>
            <Button variant={categoryId ? "outline" : "default"}>
              {categoryId ? "Edit" : "Add Category"}
            </Button>
          </DialogTrigger>
        )
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {categoryId ? "Edit Category" : "Add Category"}
          </DialogTitle>
          <DialogDescription>
            {categoryId
              ? "Update the category name or parent category."
              : "Create a new category or sub-category."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Category Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Office Supplies"
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="parent">Parent Category (Optional)</Label>
              <Select value={parentId || "none"} onValueChange={setParentId}>
                <SelectTrigger id="parent">
                  <SelectValue placeholder="Select a parent category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    None (Top-level category)
                  </SelectItem>
                  {(() => {
                    // Calculate exclude IDs once
                    const excludeIds = categoryId
                      ? (() => {
                          const catToExclude = findCategoryById(
                            allCategories,
                            categoryId
                          );
                          return catToExclude
                            ? new Set(getDescendantIds(catToExclude))
                            : new Set([categoryId]);
                        })()
                      : new Set<number>();

                    // Filter out excluded categories first
                    const filteredCategories = filterCategoriesWithExclusions(
                      allCategories,
                      excludeIds
                    );

                    // Then flatten with hierarchical display
                    const flatCategories =
                      flattenCategoriesForSelect(filteredCategories);

                    return flatCategories.map((cat) => (
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
                    ));
                  })()}
                </SelectContent>
              </Select>
            </div>
            {error && <div className="text-sm text-destructive">{error}</div>}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : categoryId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

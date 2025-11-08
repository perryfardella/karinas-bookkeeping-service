"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CategoryForm } from "./category-form";
import { useRouter } from "next/navigation";
import { Trash2, Edit, ChevronRight, ChevronDown } from "lucide-react";

export type CategoryWithChildren = {
  id: number;
  name: string;
  parent_id: number | null;
  is_transfer_category: boolean;
  children?: CategoryWithChildren[];
};

type CategoryTreeProps = {
  categories: CategoryWithChildren[];
};

export function CategoryTree({
  categories,
}: CategoryTreeProps) {
  const router = useRouter();
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(
    new Set()
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const toggleExpanded = (id: number) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedCategories(newExpanded);
  };

  const handleDeleteClick = (id: number) => {
    setCategoryToDelete(id);
    setDeleteDialogOpen(true);
    setDeleteError(null);
  };

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return;

    setIsDeleting(true);
    setDeleteError(null);
    try {
      const response = await fetch(`/api/categories/${categoryToDelete}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete category");
      }

      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
      router.refresh();
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : "Failed to delete category"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const renderCategory = (category: CategoryWithChildren, level: number = 0) => {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = expandedCategories.has(category.id);
    const indent = level * 24;

    return (
      <div key={category.id} className="space-y-1">
        <div
          className="flex items-center gap-2 py-2 px-3 rounded-md hover:bg-muted/50"
          style={{ paddingLeft: `${indent + 12}px` }}
        >
          {hasChildren ? (
            <button
              onClick={() => toggleExpanded(category.id)}
              className="p-1 hover:bg-muted rounded"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          ) : (
            <div className="w-6" />
          )}
          <span className="flex-1 font-medium">{category.name}</span>
          {category.is_transfer_category && (
            <span className="text-xs text-muted-foreground">Transfer</span>
          )}
          <div className="flex gap-2">
            <CategoryForm
              categoryId={category.id}
              initialName={category.name}
              initialParentId={category.parent_id}
              allCategories={categories}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleDeleteClick(category.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {hasChildren && isExpanded && (
          <div>
            {category.children!.map((child) =>
              renderCategory(child, level + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Categories</h2>
          <CategoryForm allCategories={categories} />
        </div>

        {categories.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No categories yet.</p>
            <p className="text-sm mt-2">
              Create your first category to get started.
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <div className="divide-y">
              {categories.map((category) => renderCategory(category))}
            </div>
          </div>
        )}
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this category? This action cannot
              be undone. If this category has transactions, you will need to
              reassign or delete them first.
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <div className="text-sm text-destructive">{deleteError}</div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setCategoryToDelete(null);
                setDeleteError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}


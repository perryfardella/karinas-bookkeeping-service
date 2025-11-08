/**
 * Utility functions for displaying category names in a user-friendly way
 */

/**
 * Formats a category path for display, intelligently truncating long paths
 * @param categoryPath - Full category path (e.g., "Expenses > Business Expenses > Healthcare Supplies")
 * @param maxLength - Maximum length before truncation (default: 30)
 * @returns Formatted category name
 */
export function formatCategoryName(
  categoryPath: string,
  maxLength: number = 30
): string {
  if (categoryPath.length <= maxLength) {
    return categoryPath;
  }

  const parts = categoryPath.split(" > ");
  
  // If it's a single category, just truncate it
  if (parts.length === 1) {
    return truncateWithEllipsis(categoryPath, maxLength);
  }

  // For multi-level categories, try to show the last 2-3 levels
  // If that's still too long, abbreviate parent levels
  if (parts.length === 2) {
    // Two levels: show both if possible, otherwise abbreviate parent
    const full = categoryPath;
    if (full.length <= maxLength) {
      return full;
    }
    // Abbreviate parent to first 3 chars
    return `${abbreviate(parts[0])} > ${parts[1]}`;
  }

  // Three or more levels: show last 2 levels, abbreviate parents
  const lastTwo = parts.slice(-2).join(" > ");
  if (lastTwo.length <= maxLength) {
    const parents = parts.slice(0, -2);
    if (parents.length > 0) {
      const abbreviatedParents = abbreviateParents(parents);
      return `${abbreviatedParents} > ${lastTwo}`;
    }
    return lastTwo;
  }

  // If even last two levels are too long, just show the leaf category
  return truncateWithEllipsis(parts[parts.length - 1], maxLength);
}

/**
 * Abbreviates a category name to its first 3-4 characters
 */
function abbreviate(name: string): string {
  if (name.length <= 4) {
    return name;
  }
  // Take first 3-4 chars, preferring whole words
  const words = name.split(" ");
  if (words.length > 1 && words[0].length <= 4) {
    return words[0];
  }
  return name.substring(0, 3);
}

/**
 * Abbreviates multiple parent categories
 */
function abbreviateParents(parents: string[]): string {
  return parents.map(abbreviate).join(" > ");
}

/**
 * Truncates a string with ellipsis
 */
function truncateWithEllipsis(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.substring(0, maxLength - 3) + "...";
}

/**
 * Gets a short display name for a category (just the leaf name)
 * Useful for charts and compact displays
 */
export function getCategoryShortName(categoryPath: string): string {
  const parts = categoryPath.split(" > ");
  return parts[parts.length - 1];
}

/**
 * Gets a medium display name (last 2 levels)
 * Useful for dropdowns and lists
 */
export function getCategoryMediumName(categoryPath: string): string {
  const parts = categoryPath.split(" > ");
  if (parts.length <= 2) {
    return categoryPath;
  }
  return parts.slice(-2).join(" > ");
}

/**
 * Formats a category name with indentation for hierarchical display in selects
 * @param name - Category name
 * @param level - Depth level (0 = root, 1 = first child, etc.)
 * @param isLast - Whether this is the last child at this level
 * @returns Formatted category name with indentation and visual indicators
 */
export function formatCategoryForSelect(
  name: string,
  level: number = 0,
  isLast: boolean = false
): string {
  if (level === 0) {
    return name;
  }

  // Use visual indicators: ├─ for middle items, └─ for last items
  const connector = isLast ? "└─" : "├─";
  const indent = "  ".repeat(level - 1); // 2 spaces per level
  return `${indent}${connector} ${name}`;
}

/**
 * Type for category with level information
 */
export type CategoryWithLevel = {
  id: number;
  name: string;
  displayName: string;
  level: number;
  isLast: boolean;
  fullPath: string; // Keep full path for tooltip/search
  is_transfer_category?: boolean; // Preserve transfer category flag
};

/**
 * Flattens categories with level information for select dropdowns
 */
export function flattenCategoriesForSelect<T extends { id: number; name: string; is_transfer_category?: boolean; children?: T[] }>(
  categories: T[],
  level: number = 0,
  parentPath: string[] = []
): CategoryWithLevel[] {
  const result: CategoryWithLevel[] = [];

  categories.forEach((cat, index) => {
    const isLast = index === categories.length - 1;
    const fullPath = [...parentPath, cat.name].join(" > ");

    result.push({
      id: cat.id,
      name: cat.name,
      displayName: formatCategoryForSelect(cat.name, level, isLast),
      level,
      isLast,
      fullPath,
      is_transfer_category: cat.is_transfer_category,
    });

    if (cat.children && cat.children.length > 0) {
      result.push(
        ...flattenCategoriesForSelect(cat.children, level + 1, [...parentPath, cat.name])
      );
    }
  });

  return result;
}



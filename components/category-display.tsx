"use client";

import { getCategoryMediumName, getCategoryShortName } from "@/lib/utils/category-display";

type CategoryDisplayProps = {
  categoryPath: string;
  variant?: "short" | "medium" | "full";
  showTooltip?: boolean;
  className?: string;
};

/**
 * Component for displaying category names with intelligent truncation
 * - short: Just the leaf category name
 * - medium: Last 2 levels (default)
 * - full: Complete path
 */
export function CategoryDisplay({
  categoryPath,
  variant = "medium",
  showTooltip = true,
  className = "",
}: CategoryDisplayProps) {
  let displayName: string;
  
  switch (variant) {
    case "short":
      displayName = getCategoryShortName(categoryPath);
      break;
    case "medium":
      displayName = getCategoryMediumName(categoryPath);
      break;
    case "full":
      displayName = categoryPath;
      break;
  }

  // If the display name is the same as the full path, no need for tooltip
  const needsTooltip = showTooltip && displayName !== categoryPath;

  return (
    <span 
      className={className}
      title={needsTooltip ? categoryPath : undefined}
    >
      {displayName}
    </span>
  );
}



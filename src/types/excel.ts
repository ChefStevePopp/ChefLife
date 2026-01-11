import type React from "react";

export interface ExcelColumn {
  key: string;
  name: string;
  type:
    | "text"
    | "currency"
    | "percent"
    | "imageUrl"
    | "number"
    | "boolean"
    | "date"
    | "allergen"
    | "status"
    | "custom";
  width: number;
  sortable?: boolean;
  filterable?: boolean;
  align?: "left" | "center" | "right";
  /** Custom render function for 'custom' type */
  render?: (value: any, row: any) => React.ReactNode;
  /** Pre-defined filter options for dropdown (instead of auto-detecting) */
  filterOptions?: { value: string; label: string }[];
}

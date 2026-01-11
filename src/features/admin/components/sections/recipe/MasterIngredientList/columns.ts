import { MasterIngredient } from "@/types/master-ingredient";
import type { ExcelColumn } from "@/types/excel";
import { AllergenCell } from "./components/AllergenCell";
import { StatusCell } from "./components/StatusCell";

export const masterIngredientColumns: ExcelColumn[] = [
  {
    key: "status",
    name: "Status",
    type: "status",
    width: 100,
    sortable: true,
    filterable: true,
    cell: (info) => {
      return {
        component: StatusCell,
        props: { ingredient: info.row.original },
      };
    },
  },
  {
    key: "item_code",
    name: "Vendor ID",
    type: "text",
    width: 120,
    sortable: true,
    filterable: true,
  },
  {
    key: "product",
    name: "Product Name",
    type: "text",
    width: 200,
    sortable: true,
    filterable: true,
  },
  {
    key: "major_group_name",
    name: "Major Group",
    type: "text",
    width: 150,
    sortable: true,
    filterable: true,
  },
  {
    key: "category_name",
    name: "Category",
    type: "text",
    width: 150,
    sortable: true,
    filterable: true,
  },
  {
    key: "sub_category_name",
    name: "Sub Category",
    type: "text",
    width: 150,
    sortable: true,
    filterable: true,
  },
  {
    key: "recipe_unit_type",
    name: "Recipe Unit",
    type: "text",
    width: 120,
    sortable: true,
    filterable: true,
  },
  {
    key: "cost_per_recipe_unit",
    name: "Cost per Unit",
    type: "currency",
    width: 120,
    sortable: true,
    filterable: true,
  },
  {
    key: "storage_area",
    name: "Storage Area",
    type: "text",
    width: 150,
    sortable: true,
    filterable: true,
  },
  {
    key: "id",
    name: "Allergens",
    type: "allergen",
    width: 150,
    sortable: false,
    filterable: false,
    cell: (info) => {
      return {
        component: AllergenCell,
        props: { ingredient: info.row.original },
      };
    },
  },
];

// Allergen-focused columns for Allergens tab
export const allergenViewColumns: ExcelColumn[] = [
  {
    key: "product",
    name: "Product Name",
    type: "text",
    width: 250,
    sortable: true,
    filterable: true,
  },
  {
    key: "category_name",
    name: "Category",
    type: "text",
    width: 150,
    sortable: true,
    filterable: true,
  },
  {
    key: "id",
    name: "Allergens",
    type: "allergen",
    width: 300,
    sortable: false,
    filterable: false,
  },
  {
    key: "storage_area",
    name: "Storage Area",
    type: "text",
    width: 150,
    sortable: true,
    filterable: true,
  },
];

// For backward compatibility
export const columns = masterIngredientColumns;

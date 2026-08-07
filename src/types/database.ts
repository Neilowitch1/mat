export type InventoryStatus =
  | "full"
  | "three_quarters"
  | "half"
  | "low"
  | "empty";

export interface Product {
  id: string;
  name: string;
  category: string | null;
  default_unit: string | null;
  created_at: string;
}

export interface ShoppingItem {
  id: string;
  product_id: string;
  checked: boolean;
  created_at: string;

  product?: Product;
}

export interface InventoryItem {
  id: string;
  product_id: string;
  quantity: number;
  unit: string | null;
  status: InventoryStatus;
  expires_at: string | null;
  created_at: string;
  updated_at: string;

  product?: Product;
}
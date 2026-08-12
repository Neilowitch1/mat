export type InventoryLocation = string;

export interface InventoryCategory {
  id: string;
  household_id: string;
  key: InventoryLocation;
  name: string;
  is_default: boolean;
  is_enabled: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type RecipeCategory = "cooking" | "baking";

export type HouseholdRole = "owner" | "member";

export interface Profile {
  id: string;
  display_name: string | null;
  active_household_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Household {
  id: string;
  name: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface HouseholdMember {
  household_id: string;
  user_id: string;
  role: HouseholdRole;
  created_at: string;
}

export interface HouseholdMemberDetails extends HouseholdMember {
  display_name: string | null;
  email: string;
}

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
  household_id: string;
  product_id: string;
  checked: boolean;
  completed: boolean;
  created_at: string;

  product?: Product;
}

export interface InventoryItem {
  id: string;
  household_id: string;
  product_id: string;
  quantity: number;
  unit: string | null;
  status: InventoryStatus;
  location: InventoryLocation;
  expires_at: string | null;
  created_at: string;
  updated_at: string;

  product?: Product;
}

export interface Recipe {
  id: string;
  household_id: string;
  name: string;
  description: string | null;
  instructions: string | null;
  servings: number;
  prep_time_minutes: number | null;
  image_url: string | null;
  favorite: boolean;
  category: RecipeCategory;
  created_at: string;
  updated_at: string;

  ingredients?: RecipeIngredient[];
}

export interface RecipeIngredient {
  id: string;
  recipe_id: string;
  product_id: string;
  amount: string | null;
  unit: string | null;
  created_at: string;

  product?: Product;
}

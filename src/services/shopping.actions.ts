"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";

export async function revalidateShoppingList(): Promise<void> {
  await requireUser();
  revalidatePath("/handla", "page");
}

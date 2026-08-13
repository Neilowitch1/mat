"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";

export async function revalidateInventory(): Promise<void> {
  await requireUser();
  revalidatePath("/hemma", "page");
}

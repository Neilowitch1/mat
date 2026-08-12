import { supabase } from "@/lib/supabase";
import { getActiveHouseholdId } from "@/lib/householdContext";
import {
  mergeCompatibleQuantities,
  normalizeStoredUnit,
  type QuantityWithUnit,
} from "@/lib/unitConversion";
import { updateProductDefaultUnit } from "@/services/products.service";

import type {
  InventoryItem,
  InventoryLocation,
  InventoryStatus,
} from "@/types/database";

export type AddInventoryItemInput = {
  productId: string;
  quantity?: number;
  unit?: string | null;
  status?: InventoryStatus;
  location?: InventoryLocation;
  expiresAt?: string | null;
};

export type AddInventoryItemResult = {
  inventoryItem: InventoryItem;
  alreadyExists: boolean;
};

export type RefillInventoryItemInput = {
  productId: string;
  quantity: number;
  unit: string;
  location: InventoryLocation;
  expiresAt: string | null;
  replaceIncompatibleUnit?: boolean;
};

export type RefillInventoryItemResult = {
  inventoryItem: InventoryItem;
  created: boolean;
};

export type InventoryRefillPreview = {
  existingItem: InventoryItem;
  result: QuantityWithUnit | null;
  hasUnitConflict: boolean;
};

export type UpdateInventoryItemInput = {
  productId: string;
  quantity: number;
  unit: string;
  status: InventoryStatus;
  location: InventoryLocation;
  expiresAt: string | null;
};

export type UpdateInventoryItemResult = {
  inventoryItem: InventoryItem;
  alreadyExists: boolean;
};

/*
 * Dessa enheter beskriver en exakt mätbar mängd.
 *
 * De ska fortsatt summeras vid smart put-away.
 *
 * Exempel:
 * 500 g + 700 g = 1,2 kg
 * 5 dl + 1 l = 1,5 l
 */
const MERGEABLE_MEASURED_UNITS = new Set([
  "g",
  "kg",
  "ml",
  "cl",
  "dl",
  "l",
]);

/*
 * Alla andra enheter behandlas som separata
 * förpackningar/batcher.
 *
 * Exempel:
 * st
 * Burk
 * Flaska
 * Limpa
 * Förpackning
 * Paket
 * custom units
 */
export function isMergeableInventoryUnit(
  unit: string | null | undefined
): boolean {
  if (!unit?.trim()) return false;

  const normalizedUnit =
    normalizeStoredUnit(unit);

  return MERGEABLE_MEASURED_UNITS.has(
    normalizedUnit
  );
}

async function getInventoryItemsByProductAndLocation(
  productId: string,
  location: InventoryLocation
): Promise<InventoryItem[]> {
  const householdId = await getActiveHouseholdId();
  const { data, error } = await supabase
    .from("inventory")
    .select(`
      *,
      product:products(*)
    `)
    .eq("household_id", householdId)
    .eq("product_id", productId)
    .eq("location", location)
    .order("created_at", {
      ascending: true,
    });

  if (error) throw error;

  return data ?? [];
}

export async function getInventoryItemsByProduct(
  productId: string
): Promise<InventoryItem[]> {
  const householdId = await getActiveHouseholdId();
  const { data, error } = await supabase
    .from("inventory")
    .select(`
      *,
      product:products(*)
    `)
    .eq("household_id", householdId)
    .eq("product_id", productId)
    .order("created_at", {
      ascending: true,
    });

  if (error) throw error;

  return data ?? [];
}

export async function getInventory(client = supabase, activeHouseholdId?: string): Promise<
  InventoryItem[]
> {
  const householdId = activeHouseholdId ?? await getActiveHouseholdId(client);
  const { data, error } = await client
    .from("inventory")
    .select(`
      *,
      product:products(*)
    `)
    .eq("household_id", householdId)
    .order("created_at", {
      ascending: true,
    });

  if (error) throw error;

  return data ?? [];
}

export async function getInventoryItem(
  id: string
): Promise<InventoryItem | null> {
  const householdId = await getActiveHouseholdId();
  const { data, error } = await supabase
    .from("inventory")
    .select(`
      *,
      product:products(*)
    `)
    .eq("household_id", householdId)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;

  return data;
}

export async function removeInventoryItem(
  id: string
): Promise<void> {
  const householdId = await getActiveHouseholdId();
  const { error } = await supabase
    .from("inventory")
    .delete()
    .eq("household_id", householdId)
    .eq("id", id);

  if (error) throw error;
}

async function removeEmptyInventoryItemsForProductAndLocation(
  productId: string,
  location: InventoryLocation,
  excludeId?: string
): Promise<void> {
  const householdId = await getActiveHouseholdId();
  let query = supabase
    .from("inventory")
    .delete()
    .eq("household_id", householdId)
    .eq("product_id", productId)
    .eq("location", location)
    .eq("status", "empty");

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { error } = await query;

  if (error) {
    throw error;
  }
}

/*
 * Hittar den inventory-post som ett exakt
 * mått ska fyllas på i.
 *
 * Batch-enheter, exempelvis st/Burk/Flaska,
 * returnerar alltid null eftersom de ska
 * skapas som separata poster.
 */
export function findInventoryRefillTarget(
  items: InventoryItem[],
  location: InventoryLocation,
  incomingUnit: string
): InventoryItem | null {
  const normalizedIncomingUnit =
    normalizeStoredUnit(incomingUnit);

  if (
    !isMergeableInventoryUnit(
      normalizedIncomingUnit
    )
  ) {
    return null;
  }

  const itemsAtLocation = items.filter(
    (item) =>
      item.location === location &&
      isMergeableInventoryUnit(
        item.unit
      )
  );

  /*
   * Försök först hitta en post vars enhet
   * faktiskt går att konvertera mot den nya.
   */
  const compatibleItem =
    itemsAtLocation.find((item) => {
      const existingUnit =
        normalizeStoredUnit(
          item.unit?.trim() || "st"
        );

      return (
        mergeCompatibleQuantities(
          {
            quantity: item.quantity,
            unit: existingUnit,
          },
          {
            quantity: 1,
            unit: normalizedIncomingUnit,
          }
        ) !== null
      );
    });

  if (compatibleItem) {
    return compatibleItem;
  }

  /*
   * Finns redan en exakt mätbar post men av
   * inkompatibel typ, exempelvis gram kontra
   * liter, returnerar vi den så befintligt
   * conflict-flow kan användas.
   */
  return itemsAtLocation[0] ?? null;
}

async function insertInventoryItem({
  productId,
  quantity,
  unit,
  status,
  location,
  expiresAt,
}: {
  productId: string;
  quantity: number;
  unit: string;
  status: InventoryStatus;
  location: InventoryLocation;
  expiresAt: string | null;
}): Promise<InventoryItem> {
  const householdId = await getActiveHouseholdId();
  const normalizedUnit =
    normalizeStoredUnit(unit);

  const { data, error } = await supabase
    .from("inventory")
    .insert({
      household_id: householdId,
      product_id: productId,
      quantity,
      unit: normalizedUnit,
      status,
      location,
      expires_at: expiresAt,
    })
    .select(`
      *,
      product:products(*)
    `)
    .single();

  if (error) throw error;

  if (!data) {
    throw new Error(
      "Kunde inte lägga till produkten hemma."
    );
  }

  if (data.unit?.trim()) {
    try {
      await updateProductDefaultUnit(
        productId,
        data.unit
      );
    } catch (defaultUnitError) {
      const { error: rollbackError } =
        await supabase
          .from("inventory")
          .delete()
          .eq("household_id", householdId)
          .eq("id", data.id);

      if (rollbackError) {
        throw new Error(
          "Produkten lades till hemma men standardenheten kunde inte sparas."
        );
      }

      throw defaultUnitError;
    }
  }

  return data;
}

export async function addInventoryItem({
  productId,
  quantity = 1,
  unit = "st",
  status = "full",
  location = "pantry",
  expiresAt = null,
}: AddInventoryItemInput): Promise<AddInventoryItemResult> {
  const normalizedUnit =
    normalizeStoredUnit(
      unit?.trim() || "st"
    );

  /*
   * Exakta mängdenheter behåller gamla
   * beteendet:
   *
   * om produkten redan finns på platsen
   * säger vi "alreadyExists".
   *
   * Put-away-flödet hanterar sedan merge.
   */
  if (
    isMergeableInventoryUnit(
      normalizedUnit
    )
  ) {
    const existingItems =
      await getInventoryItemsByProductAndLocation(
        productId,
        location
      );

    const existingMeasuredItem =
      existingItems.find((item) =>
        isMergeableInventoryUnit(
          item.unit
        )
      );

    if (existingMeasuredItem) {
      return {
        inventoryItem:
          existingMeasuredItem,
        alreadyExists: true,
      };
    }
  }

  /*
   * Batch-enheter skapas ALLTID separat.
   *
   * Exempel:
   *
   * Romsås
   * 1 Burk – Lite kvar
   *
   * +
   *
   * 1 Burk – Full
   *
   * ger två inventory-rader.
   */
const inventoryItem =
  await insertInventoryItem({
    productId,
    quantity,
    unit: normalizedUnit,
    status,
    location,
    expiresAt,
  });

/*
 * När en ny full batch läggs hemma
 * behövs gamla "Slut"-batcher av samma
 * produkt på samma plats inte längre.
 *
 * Detta gäller endast batch-/förpackningsenheter.
 * g/kg/ml/cl/dl/l fortsätter använda merge-logiken.
 */
if (
  status === "full" &&
  !isMergeableInventoryUnit(normalizedUnit)
) {
  try {
    await removeEmptyInventoryItemsForProductAndLocation(
      productId,
      location,
      inventoryItem.id
    );
  } catch (cleanupError) {
    /*
     * Om cleanup misslyckas rullar vi tillbaka
     * den nya posten så användaren inte hamnar
     * i ett halvt genomfört läge.
     */
    const { error: rollbackError } = await supabase
      .from("inventory")
      .delete()
      .eq("id", inventoryItem.id);

    if (rollbackError) {
      throw new Error(
        "Den nya varan lades till, men den gamla slut-markerade varan kunde inte tas bort."
      );
    }

    throw cleanupError;
  }
}

  return {
    inventoryItem,
    alreadyExists: false,
  };
}

export function getInventoryRefillPreview(
  existingItem: InventoryItem,
  quantity: number,
  unit: string,
  replaceIncompatibleUnit = false
): InventoryRefillPreview {
  const existingUnit =
    normalizeStoredUnit(
      existingItem.unit?.trim() ||
        "st"
    );

  const incomingUnit =
    normalizeStoredUnit(unit);

  const result =
    mergeCompatibleQuantities(
      {
        /*
         * För g/kg/ml/cl/dl/l är quantity
         * redan exakt.
         *
         * Status ska därför INTE påverka
         * mängdberäkningen.
         */
        quantity:
          existingItem.quantity,
        unit: existingUnit,
      },
      {
        quantity,
        unit: incomingUnit,
      }
    );

  return {
    existingItem,

    result:
      result ??
      (replaceIncompatibleUnit
        ? {
            quantity,
            unit: incomingUnit,
          }
        : null),

    hasUnitConflict:
      result === null,
  };
}

export async function refillInventoryItem({
  productId,
  quantity,
  unit,
  location,
  expiresAt,
  replaceIncompatibleUnit = false,
}: RefillInventoryItemInput): Promise<RefillInventoryItemResult> {
  const normalizedUnit =
    normalizeStoredUnit(unit);

  /*
   * =================================================
   * BATCH / FÖRPACKNING
   * =================================================
   *
   * ALLT som inte är g/kg/ml/cl/dl/l
   * läggs som en NY separat inventory-post.
   *
   * Detta inkluderar:
   *
   * st
   * Burk
   * Flaska
   * Limpa
   * Förpackning
   * Paket
   * Påse
   * Ask
   * Kartong
   * Tub
   * Rulle
   * custom units
   */
if (
  !isMergeableInventoryUnit(
    normalizedUnit
  )
) {
  const inventoryItem =
    await insertInventoryItem({
      productId,
      quantity,
      unit: normalizedUnit,
      status: "full",
      location,
      expiresAt,
    });

  try {
    /*
     * Den nya batchen är full.
     * Gamla batcher av samma produkt på
     * samma plats som är markerade "Slut"
     * tas därför bort automatiskt.
     */
    await removeEmptyInventoryItemsForProductAndLocation(
      productId,
      location,
      inventoryItem.id
    );
  } catch (cleanupError) {
    /*
     * Om cleanup misslyckas tar vi bort den
     * nyss skapade posten igen.
     */
    const { error: rollbackError } = await supabase
      .from("inventory")
      .delete()
      .eq("id", inventoryItem.id);

    if (rollbackError) {
      throw new Error(
        "Den nya varan lades till, men den gamla slut-markerade varan kunde inte tas bort."
      );
    }

    throw cleanupError;
  }

  return {
    inventoryItem,
    created: true,
  };
}

  /*
   * =================================================
   * EXAKT MÄNGD
   * =================================================
   *
   * g/kg och ml/cl/dl/l fortsätter använda
   * befintlig smart merge.
   */
  const existingItems =
    await getInventoryItemsByProductAndLocation(
      productId,
      location
    );

  const refillTarget =
    findInventoryRefillTarget(
      existingItems,
      location,
      normalizedUnit
    );

  /*
   * Ingen befintlig exakt mängd:
   * skapa första posten.
   */
  if (!refillTarget) {
    const inventoryItem =
      await insertInventoryItem({
        productId,
        quantity,
        unit: normalizedUnit,
        status: "full",
        location,
        expiresAt,
      });

    return {
      inventoryItem,
      created: true,
    };
  }

  const preview =
    getInventoryRefillPreview(
      refillTarget,
      quantity,
      normalizedUnit,
      replaceIncompatibleUnit
    );

  if (!preview.result) {
    throw new Error(
      "Enheten skiljer sig från den befintliga enheten."
    );
  }

  const updated =
    await updateInventoryItem(
      refillTarget.id,
      {
        productId,
        quantity:
          preview.result.quantity,
        unit:
          preview.result.unit,
        status: "full",
        location,

        /*
         * Nytt bäst före ersätter.
         * Saknas nytt datum behåller vi det
         * befintliga.
         */
        expiresAt:
          expiresAt ??
          refillTarget.expires_at,
      }
    );

  return {
    inventoryItem:
      updated.inventoryItem,
    created: false,
  };
}

export async function updateInventoryQuantity(
  id: string,
  quantity: number
): Promise<InventoryItem> {
  const householdId = await getActiveHouseholdId();
  const { data, error } = await supabase
    .from("inventory")
    .update({
      quantity,
    })
    .eq("household_id", householdId)
    .eq("id", id)
    .select(`
      *,
      product:products(*)
    `)
    .single();

  if (error) throw error;

  return data;
}

export async function updateInventoryItem(
  id: string,
  {
    productId,
    quantity,
    unit,
    status,
    location,
    expiresAt,
  }: UpdateInventoryItemInput
): Promise<UpdateInventoryItemResult> {
  const householdId = await getActiveHouseholdId();
  /*
   * Vi blockerar INTE längre en annan rad
   * med samma product_id + location.
   *
   * Flera batcher på samma plats är numera
   * ett avsiktligt beteende.
   */

  const previousItem =
    await getInventoryItem(id);

  if (!previousItem) {
    throw new Error(
      "Produkten finns inte längre hemma."
    );
  }

  const normalizedUnit =
    normalizeStoredUnit(unit);

  const { data, error } = await supabase
    .from("inventory")
    .update({
      product_id: productId,
      quantity,
      unit: normalizedUnit,
      status,
      location,
      expires_at: expiresAt,
    })
    .eq("household_id", householdId)
    .eq("id", id)
    .select(`
      *,
      product:products(*)
    `)
    .single();

  if (error) throw error;

  if (!data) {
    throw new Error(
      "Kunde inte uppdatera produkten hemma."
    );
  }

  if (data.unit?.trim()) {
    try {
      await updateProductDefaultUnit(
        productId,
        data.unit
      );
    } catch (defaultUnitError) {
      const { error: rollbackError } =
        await supabase
          .from("inventory")
          .update({
            product_id:
              previousItem.product_id,
            quantity:
              previousItem.quantity,
            unit:
              previousItem.unit,
            status:
              previousItem.status,
            location:
              previousItem.location,
            expires_at:
              previousItem.expires_at,
          })
          .eq("household_id", householdId)
          .eq("id", id);

      if (rollbackError) {
        throw new Error(
          "Produkten uppdaterades hemma men standardenheten kunde inte sparas."
        );
      }

      throw defaultUnitError;
    }
  }

  return {
    inventoryItem: data,

    /*
     * Flera poster är nu tillåtna.
     */
    alreadyExists: false,
  };
}

export async function updateInventoryStatus(
  id: string,
  status: InventoryStatus
): Promise<InventoryItem> {
  const householdId = await getActiveHouseholdId();
  const { data, error } = await supabase
    .from("inventory")
    .update({
      status,
    })
    .eq("household_id", householdId)
    .eq("id", id)
    .select(`
      *,
      product:products(*)
    `)
    .single();

  if (error) throw error;

  return data;
}

export async function updateInventoryExpiration(
  id: string,
  expiresAt: string | null
): Promise<InventoryItem> {
  const householdId = await getActiveHouseholdId();
  const { data, error } = await supabase
    .from("inventory")
    .update({
      expires_at: expiresAt,
    })
    .eq("household_id", householdId)
    .eq("id", id)
    .select(`
      *,
      product:products(*)
    `)
    .single();

  if (error) throw error;

  return data;
}

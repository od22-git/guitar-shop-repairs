"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";

import {
  deleteProductPhoto,
  moveProductPhoto,
  PhotoError,
  updatePhotoAlt,
} from "@/lib/admin/photos";
import {
  archiveProduct,
  createProduct,
  deleteDraft,
  parseProductForm,
  ProductError,
  publishProduct,
  PublishError,
  unarchiveProduct,
  updateProduct,
  type ProductProblem,
} from "@/lib/admin/products";
import {
  createVariant,
  deleteVariant,
  parseVariantForm,
  updateVariant,
  VariantError,
  type VariantProblem,
} from "@/lib/admin/variants";
import { requireAdmin } from "@/lib/auth";
import { CATALOG_TAG } from "@/lib/catalog";
import { endOfDubaiDay } from "@/lib/datetime";
import { db } from "@/lib/db/client";
import {
  InventoryError,
  release,
  reserve,
  restock,
  sell,
  type InventoryProblem,
} from "@/lib/inventory";
import { storage } from "@/lib/storage";

import type { ActionState } from "../../_components/action-state";

// Every action starts with requireAdmin(): server actions are public endpoints, whatever
// page they sit on (e2e/admin-access.spec.ts calls each one signed out). Each change to a
// product, its photos or stock expires the catalog cache, so the shop shows it at once.

const productMessages: Record<ProductProblem, string> = {
  not_found: "This product no longer exists.",
  slug_locked:
    "The link can't change once the product has been published, so shared links keep working.",
  slug_taken: "Another product already uses this link.",
  sku_taken: "Another product already has this SKU.",
  listed_needs_price_and_category: "A listed product needs a price and a category.",
  guitar_single: "There's more than one in stock, so it can't be a guitar.",
  addon_kind:
    "A product becomes a service add-on only with no stock, and stops being one only as a draft.",
  not_draft: "Only drafts can be published.",
  cannot_archive: "Release the hold before archiving.",
  not_archived: "Only archived products can be restored.",
  already_published: "Published products can't be deleted. Archive it instead.",
};

const inventoryMessages: Record<InventoryProblem, string> = {
  not_available: "It isn't available, or there aren't that many in stock.",
  not_reserved: "It isn't on hold.",
  cannot_restock: "Can't restock: a guitar is one item, and a held item needs releasing first.",
};

const variantMessages: Record<VariantProblem, string> = {
  not_found: "This variant no longer exists.",
  product_not_found: "This product no longer exists.",
  kind: "Guitars and service add-ons are sold one way only, so they have no variants.",
};

const fieldOf: Partial<Record<ProductProblem, string>> = {
  slug_locked: "slug",
  slug_taken: "slug",
  sku_taken: "sku",
};

/** Turns a known failure into a message for the form; anything else is a real error. */
function failure(error: unknown): ActionState {
  if (error instanceof ProductError) {
    const message = productMessages[error.problem];
    const field = fieldOf[error.problem];
    return { ok: false, message, errors: field ? { [field]: message } : undefined };
  }
  if (error instanceof PublishError) {
    return { ok: false, message: `Not published yet. ${error.problems.join(" ")}` };
  }
  if (error instanceof VariantError) return { ok: false, message: variantMessages[error.problem] };
  if (error instanceof InventoryError)
    return { ok: false, message: inventoryMessages[error.problem] };
  if (error instanceof PhotoError) {
    return {
      ok: false,
      message:
        error.problem === "last_photo"
          ? "A listed product needs a photo. Add another one first, or archive the product."
          : "This photo no longer exists.",
    };
  }
  throw error;
}

function done(message: string): ActionState {
  updateTag(CATALOG_TAG);
  return { ok: true, message, at: Date.now() };
}

/** Ids come from bound arguments, which a caller can change: check them. */
function toId(value: unknown): number {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw new Error("Invalid id");
  return id;
}

function toQuantity(form: FormData): number | null {
  const quantity = Number(form.get("quantity"));
  return Number.isSafeInteger(quantity) && quantity >= 1 && quantity <= 999 ? quantity : null;
}

const invalid: ActionState = { ok: false, message: "Check the highlighted fields." };

export async function createProductAction(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = parseProductForm(form);
  if (!parsed.ok) return { ...invalid, errors: parsed.errors };
  let id: number;
  try {
    id = await createProduct(db, parsed.data);
  } catch (error) {
    return failure(error);
  }
  redirect(`/admin/products/${id}?created=1`);
}

export async function updateProductAction(
  productId: number,
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const parsed = parseProductForm(form);
  if (!parsed.ok) return { ...invalid, errors: parsed.errors };
  try {
    await updateProduct(db, toId(productId), parsed.data);
  } catch (error) {
    return failure(error);
  }
  return done("Saved.");
}

export async function publishAction(productId: number): Promise<ActionState> {
  await requireAdmin();
  try {
    await publishProduct(db, toId(productId));
  } catch (error) {
    return failure(error);
  }
  return done("Published. It's in the shop now.");
}

export async function archiveAction(productId: number): Promise<ActionState> {
  await requireAdmin();
  try {
    await archiveProduct(db, toId(productId));
  } catch (error) {
    return failure(error);
  }
  return done("Archived. It's no longer in the shop.");
}

export async function unarchiveAction(productId: number): Promise<ActionState> {
  await requireAdmin();
  try {
    await unarchiveProduct(db, toId(productId));
  } catch (error) {
    return failure(error);
  }
  return done("Restored as a draft.");
}

export async function deleteDraftAction(productId: number): Promise<ActionState> {
  await requireAdmin();
  try {
    await deleteDraft(db, storage, toId(productId));
  } catch (error) {
    return failure(error);
  }
  redirect("/admin/products?deleted=1");
}

export async function holdAction(
  productId: number,
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const note =
    String(form.get("note") ?? "")
      .trim()
      .slice(0, 500) || null;
  const untilValue = String(form.get("until") ?? "");
  const until = untilValue ? endOfDubaiDay(untilValue) : null;
  if (untilValue && !until) return { ok: false, message: "Enter a valid date." };
  try {
    await reserve(db, toId(productId), { note, until });
  } catch (error) {
    return failure(error);
  }
  return done("On hold.");
}

export async function releaseAction(productId: number): Promise<ActionState> {
  await requireAdmin();
  try {
    await release(db, toId(productId));
  } catch (error) {
    return failure(error);
  }
  return done("Hold released. It's available again.");
}

export async function sellAction(
  productId: number,
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const quantity = toQuantity(form);
  if (!quantity) return { ok: false, message: "Enter how many were sold." };
  try {
    // Selling a held item is the sale to the customer holding it.
    await sell(db, [{ productId: toId(productId), quantity }], { includeReserved: true });
  } catch (error) {
    return failure(error);
  }
  return done(quantity === 1 ? "Marked one as sold." : `Marked ${quantity} as sold.`);
}

export async function restockAction(
  productId: number,
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const quantity = toQuantity(form);
  if (!quantity) return { ok: false, message: "Enter how many to add." };
  try {
    await restock(db, toId(productId), quantity);
  } catch (error) {
    return failure(error);
  }
  return done(quantity === 1 ? "Added one to stock." : `Added ${quantity} to stock.`);
}

export async function deletePhotoAction(imageId: number): Promise<ActionState> {
  await requireAdmin();
  try {
    await deleteProductPhoto(db, storage, toId(imageId));
  } catch (error) {
    return failure(error);
  }
  return done("Photo deleted.");
}

export async function movePhotoAction(imageId: number, direction: -1 | 1): Promise<ActionState> {
  await requireAdmin();
  try {
    await moveProductPhoto(db, toId(imageId), direction === -1 ? -1 : 1);
  } catch (error) {
    return failure(error);
  }
  return done("Moved.");
}

export async function updatePhotoAltAction(
  imageId: number,
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const text = (name: string) =>
    String(form.get(name) ?? "")
      .trim()
      .slice(0, 300) || null;
  try {
    await updatePhotoAlt(db, toId(imageId), { altEn: text("altEn"), altAr: text("altAr") });
  } catch (error) {
    return failure(error);
  }
  return done("Description saved.");
}

export async function createVariantAction(
  productId: number,
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const parsed = parseVariantForm(form);
  if (!parsed.ok) return { ...invalid, errors: parsed.errors };
  try {
    await createVariant(db, toId(productId), parsed.data);
  } catch (error) {
    return failure(error);
  }
  return done("Variant added.");
}

export async function updateVariantAction(
  variantId: number,
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const parsed = parseVariantForm(form);
  if (!parsed.ok) return { ...invalid, errors: parsed.errors };
  try {
    await updateVariant(db, toId(variantId), parsed.data);
  } catch (error) {
    return failure(error);
  }
  return done("Variant saved.");
}

export async function deleteVariantAction(variantId: number): Promise<ActionState> {
  await requireAdmin();
  try {
    await deleteVariant(db, toId(variantId));
  } catch (error) {
    return failure(error);
  }
  return done("Variant deleted.");
}

"use client";

import {
  Check,
  Clock,
  Heart,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";

import { useRouter } from "next/navigation";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import AppCard from "@/components/AppCard";
import ScrollToTopButton from "@/components/ScrollToTopButton";
import { Button } from "@/components/ui/button";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import {
  deleteRecipe,
  updateRecipe,
} from "@/services/recipes.service";

import type {
  InventoryItem,
  Recipe,
} from "@/types/database";

import EditRecipeSheet from "./EditRecipeSheet";
import RecipeIngredientsSection from "./RecipeIngredientsSection";

import type {
  RecipeIngredientEditorHandle,
} from "./RecipeIngredientEditor";

interface RecipeDetailsProps {
  initialRecipe: Recipe;
  inventoryItems: InventoryItem[];
}

export default function RecipeDetails({
  initialRecipe,
  inventoryItems,
}: RecipeDetailsProps) {
  const [
    recipe,
    setRecipe,
  ] = useState(initialRecipe);

  const [
    isEditOpen,
    setIsEditOpen,
  ] = useState(false);

  const [
    isDeleteOpen,
    setIsDeleteOpen,
  ] = useState(false);

  const [
    isUpdatingFavorite,
    setIsUpdatingFavorite,
  ] = useState(false);

  const [
    isDeleting,
    setIsDeleting,
  ] = useState(false);

  const [
    isSavingRecipe,
    setIsSavingRecipe,
  ] = useState(false);

  const [
    saveSuccess,
    setSaveSuccess,
  ] = useState(false);

  const [
    hasUnsavedChanges,
    setHasUnsavedChanges,
  ] = useState(false);

  const [
    pendingNavigationUrl,
    setPendingNavigationUrl,
  ] = useState<string | null>(
    null
  );

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<string | null>(
    null
  );

  const ingredientEditorRef =
    useRef<RecipeIngredientEditorHandle>(
      null
    );

  const allowNavigationRef =
    useRef(false);

  const router = useRouter();

  /*
   * Skydd för osparade ändringar.
   *
   * - F5 / stäng flik / stäng webbläsare:
   *   webbläsarens standarddialog.
   *
   * - Vanliga länkklick inne i appen:
   *   vår egen Sheet-dialog.
   */
  useEffect(() => {
    if (!hasUnsavedChanges) {
      return;
    }

function handleBeforeUnload(
  event: BeforeUnloadEvent
) {
  if (allowNavigationRef.current) {
    return;
  }

  event.preventDefault();
  event.returnValue = "";
}

    function handleDocumentClick(
      event: MouseEvent
    ) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target =
        event.target as HTMLElement | null;

      const link =
        target?.closest<HTMLAnchorElement>(
          "a[href]"
        );

      if (
        !link ||
        link.target === "_blank" ||
        link.hasAttribute("download")
      ) {
        return;
      }

      const nextUrl = new URL(
        link.href,
        window.location.href
      );

      const currentUrl = new URL(
        window.location.href
      );

      /*
       * Om länken pekar till exakt samma
       * adress behöver vi inte stoppa den.
       */
      if (
        nextUrl.pathname ===
          currentUrl.pathname &&
        nextUrl.search ===
          currentUrl.search &&
        nextUrl.hash ===
          currentUrl.hash
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      setPendingNavigationUrl(
        nextUrl.href
      );
    }

    window.addEventListener(
      "beforeunload",
      handleBeforeUnload
    );

    document.addEventListener(
      "click",
      handleDocumentClick,
      true
    );

    return () => {
      window.removeEventListener(
        "beforeunload",
        handleBeforeUnload
      );

      document.removeEventListener(
        "click",
        handleDocumentClick,
        true
      );
    };
  }, [hasUnsavedChanges]);

  function cancelPendingNavigation() {
    setPendingNavigationUrl(null);
  }

function confirmPendingNavigation() {
  if (!pendingNavigationUrl) {
    return;
  }

  const nextUrl =
    pendingNavigationUrl;

  /*
   * Den här navigationen är medvetet
   * godkänd av användaren.
   *
   * beforeunload ska därför inte visa
   * webbläsarens egen varning.
   */
  allowNavigationRef.current =
    true;

  setHasUnsavedChanges(false);
  setPendingNavigationUrl(null);

  window.location.href =
    nextUrl;
}

  async function saveAndContinueNavigation() {
    if (
      !pendingNavigationUrl ||
      isSavingRecipe
    ) {
      return;
    }

    const nextUrl =
      pendingNavigationUrl;

    setIsSavingRecipe(true);
    setSaveSuccess(false);
    setErrorMessage(null);

    try {
      const success =
        await ingredientEditorRef.current?.saveRecipe();

      if (!success) {
        return;
      }

      /*
      * Receptet är nu sparat och navigationen
      * är godkänd. Hoppa över beforeunload.
      */
      allowNavigationRef.current =
        true;

      setHasUnsavedChanges(false);
      setPendingNavigationUrl(null);

      window.location.href =
        nextUrl;
    } catch {
      setErrorMessage(
        "Kunde inte spara receptet."
      );
    } finally {
      setIsSavingRecipe(false);
    }
  }

  function handleRecipeUpdated(
    updated: Recipe
  ) {
    setRecipe((current) => ({
      ...updated,
      ingredients:
        current.ingredients,
    }));

    setErrorMessage(null);
  }

  async function toggleFavorite() {
    if (
      isUpdatingFavorite
    ) {
      return;
    }

    const previousRecipe =
      recipe;

    const favorite =
      !recipe.favorite;

    setRecipe({
      ...recipe,
      favorite,
    });

    setIsUpdatingFavorite(
      true
    );

    setErrorMessage(null);

    try {
      const updated =
        await updateRecipe(
          recipe.id,
          {
            favorite,
          }
        );

      handleRecipeUpdated(
        updated
      );
    } catch {
      setRecipe(
        previousRecipe
      );

      setErrorMessage(
        "Kunde inte uppdatera favoritmarkeringen."
      );
    } finally {
      setIsUpdatingFavorite(
        false
      );
    }
  }

  async function handleSaveRecipe() {
    if (isSavingRecipe) {
      return;
    }

    setIsSavingRecipe(true);
    setSaveSuccess(false);
    setErrorMessage(null);

    try {
      const success =
        await ingredientEditorRef.current?.saveRecipe();

      if (success) {
        setSaveSuccess(true);
      }
    } catch {
      setErrorMessage(
        "Kunde inte spara receptet."
      );
    } finally {
      setIsSavingRecipe(false);
    }
  }

  async function handleDelete() {
    if (isDeleting) {
      return;
    }

    setIsDeleting(true);
    setErrorMessage(null);

    try {
      await deleteRecipe(
        recipe.id
      );

      router.push(
        "/recept"
      );

      router.refresh();
    } catch {
      setErrorMessage(
        "Kunde inte ta bort receptet."
      );

      setIsDeleting(false);
    }
  }

  return (
    <>
      <div className="space-y-3">
        <AppCard className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold leading-tight tracking-[-0.025em] text-primary">
                {recipe.name}
              </h1>

              {recipe.description && (
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                  {
                    recipe.description
                  }
                </p>
              )}
            </div>

            <div className="shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={
                  isUpdatingFavorite
                }
                onClick={() =>
                  void toggleFavorite()
                }
                aria-label={
                  recipe.favorite
                    ? "Ta bort favoritmarkering"
                    : "Markera som favorit"
                }
                className={`rounded-full ${
                  recipe.favorite
                    ? "bg-[#eee7f4] text-[#7c5e9e]"
                    : "text-muted-foreground"
                }`}
              >
                <Heart
                  aria-hidden="true"
                  className={
                    recipe.favorite
                      ? "fill-current"
                      : ""
                  }
                />
              </Button>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 border-t border-border/70 pt-2.5">
            <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Users
                  aria-hidden="true"
                  size={15}
                />

                {recipe.servings}{" "}
                portioner
              </span>

              {recipe.prep_time_minutes !==
                null && (
                <>
                  <span
                    aria-hidden="true"
                    className="text-border"
                  >
                    •
                  </span>

                  <span className="flex items-center gap-1.5">
                    <Clock
                      aria-hidden="true"
                      size={15}
                    />

                    {
                      recipe.prep_time_minutes
                    }{" "}
                    min
                  </span>
                </>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() =>
                  setIsEditOpen(
                    true
                  )
                }
                aria-label="Redigera recept"
                className="rounded-full text-muted-foreground hover:bg-secondary hover:text-primary"
              >
                <Pencil
                  aria-hidden="true"
                  className="size-4"
                />
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() =>
                  setIsDeleteOpen(
                    true
                  )
                }
                aria-label="Ta bort recept"
                className="rounded-full text-muted-foreground/75 hover:bg-[#f5e8e6] hover:text-destructive"
              >
                <Trash2
                  aria-hidden="true"
                  className="size-4"
                />
              </Button>
            </div>
          </div>

          {errorMessage && (
            <p
              role="alert"
              className="mt-3 text-sm text-destructive"
            >
              {errorMessage}
            </p>
          )}
        </AppCard>

        <RecipeIngredientsSection
          recipeId={recipe.id}
          initialIngredients={
            recipe.ingredients ??
            []
          }
          inventoryItems={
            inventoryItems
          }
          editorRef={
            ingredientEditorRef
          }
          onDirtyChange={(
            dirty
          ) => {
            setHasUnsavedChanges(
              dirty
            );

            if (dirty) {
              setSaveSuccess(
                false
              );
            }
          }}
        >
          <AppCard className="p-4">
            <h2 className="text-base font-semibold text-primary">
              Instruktioner
            </h2>

            {recipe.instructions ? (
              <p className="mt-2.5 max-w-prose whitespace-pre-wrap text-[0.9375rem] leading-7 text-foreground">
                {
                  recipe.instructions
                }
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Inga instruktioner
                har lagts till ännu.
              </p>
            )}
          </AppCard>
        </RecipeIngredientsSection>

        {hasUnsavedChanges &&
          !isSavingRecipe && (
            <p
              role="status"
              className="flex items-center justify-center gap-2 py-1 text-sm font-medium text-[#96643d]"
            >
              <span
                aria-hidden="true"
                className="size-2 rounded-full bg-current"
              />

              Osparade ändringar
            </p>
          )}

        {saveSuccess && (
          <p
            role="status"
            className="flex items-center justify-center gap-1.5 py-1 text-sm font-medium text-primary"
          >
            <Check
              aria-hidden="true"
              className="size-4"
            />

            Receptet är sparat
          </p>
        )}

        <Button
          type="button"
          disabled={
            isSavingRecipe ||
            !hasUnsavedChanges
          }
          onClick={() =>
            void handleSaveRecipe()
          }
          className={`h-12 w-full rounded-2xl text-base transition-all ${
            hasUnsavedChanges
              ? ""
              : "opacity-60"
          }`}
        >
          {isSavingRecipe
            ? "Sparar..."
            : "Spara recept"}
        </Button>
      </div>

      <EditRecipeSheet
        key={
          recipe.updated_at
        }
        recipe={recipe}
        open={isEditOpen}
        onOpenChange={
          setIsEditOpen
        }
        onRecipeUpdated={
          handleRecipeUpdated
        }
      />

      {/* OSAPARADE ÄNDRINGAR */}
      <Sheet
        open={Boolean(
          pendingNavigationUrl
        )}
        onOpenChange={(open) => {
          if (!open) {
            cancelPendingNavigation();
          }
        }}
      >
        <SheetContent
          side="bottom"
          role="alertdialog"
          className="mx-auto max-w-md px-5 pb-[calc(1.75rem+env(safe-area-inset-bottom))]"
        >
          <SheetHeader className="px-0 pt-4">
            <div className="mb-1 flex size-11 items-center justify-center rounded-2xl bg-[#f5eadc] text-[#96643d]">
              <Pencil
                aria-hidden="true"
                className="size-5"
              />
            </div>

            <SheetTitle className="text-xl">
              Osparade ändringar
            </SheetTitle>

            <SheetDescription className="leading-6">
              Du har ändrat receptet
              utan att spara. Om du
              lämnar sidan nu
              försvinner ändringarna.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-1 flex flex-col gap-2">
            <Button
              type="button"
              disabled={
                isSavingRecipe
              }
              onClick={() =>
                void saveAndContinueNavigation()
              }
              className="h-12 w-full rounded-2xl text-base"
            >
              {isSavingRecipe
                ? "Sparar..."
                : "Spara och fortsätt"}
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={
                isSavingRecipe
              }
              onClick={
                cancelPendingNavigation
              }
              className="h-11 w-full rounded-2xl"
            >
              Fortsätt redigera
            </Button>

            <Button
              type="button"
              variant="ghost"
              disabled={
                isSavingRecipe
              }
              onClick={
                confirmPendingNavigation
              }
              className="h-11 w-full rounded-2xl text-destructive hover:bg-[#f5e8e6] hover:text-destructive"
            >
              Lämna utan att spara
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* TA BORT RECEPT */}
      <Sheet
        open={isDeleteOpen}
        onOpenChange={
          setIsDeleteOpen
        }
      >
        <SheetContent
          side="bottom"
          role="alertdialog"
          className="mx-auto max-w-md px-5 pb-7"
        >
          <SheetHeader className="px-0 pt-4">
            <SheetTitle className="text-xl">
              Ta bort recept?
            </SheetTitle>

            <SheetDescription>
              Receptet och dess
              ingredienser tas bort
              permanent. Det går inte
              att ångra.
            </SheetDescription>
          </SheetHeader>

          {errorMessage && (
            <p
              role="alert"
              className="rounded-2xl bg-[#f5e8e6] px-3 py-2 text-sm text-destructive"
            >
              {errorMessage}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="secondary"
              disabled={
                isDeleting
              }
              onClick={() =>
                setIsDeleteOpen(
                  false
                )
              }
            >
              Avbryt
            </Button>

            <Button
              type="button"
              variant="destructive"
              disabled={
                isDeleting
              }
              onClick={() =>
                void handleDelete()
              }
            >
              {isDeleting
                ? "Tar bort..."
                : "Ta bort"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <ScrollToTopButton />
    </>
  );
}

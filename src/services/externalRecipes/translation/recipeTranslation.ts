export interface RecipeTranslationProvider {
  translateText(text: string, targetLanguage: "sv"): Promise<string>;
}

class PassthroughRecipeTranslationProvider implements RecipeTranslationProvider {
  async translateText(text: string): Promise<string> {
    return text;
  }
}

const translationProvider: RecipeTranslationProvider =
  new PassthroughRecipeTranslationProvider();

export async function translateRecipeText(text: string): Promise<string> {
  return translationProvider.translateText(text, "sv");
}

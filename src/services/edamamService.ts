import { EdamamNutritionResponse } from '../types';

export class EdamamService {
  private static APP_ID = import.meta.env.VITE_EDAMAM_APP_ID || process.env.EDAMAM_APP_ID || 'b127df94';
  private static APP_KEY = import.meta.env.VITE_EDAMAM_APP_KEY || process.env.EDAMAM_APP_KEY || '5a85df825dbd63c71850abb917668fe2';
  private static BASE_URL = 'https://api.edamam.com/api/nutrition-data';

  /**
   * إرسال النص المترجم واستخراج الماكروز والسكريات بدقة حتى لو كانت في العناصر التفصيلية
   */
  public static async fetchNutritionData(translatedTextEn: string): Promise<EdamamNutritionResponse> {
    if (!translatedTextEn || !translatedTextEn.trim()) {
      return this.createEmptyResponse();
    }

    try {
      const url = `${this.BASE_URL}?app_id=${this.APP_ID}&app_key=${this.APP_KEY}&ingr=${encodeURIComponent(translatedTextEn.trim())}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Edamam API returned HTTP status ${response.status}`);
      }

      const data: EdamamNutritionResponse = await response.json();

      let cal = data.calories || 0;
      let prot = data.totalNutrients?.PROCNT?.quantity || 0;
      let carbs = data.totalNutrients?.CHOCDF?.quantity || 0;
      let fat = data.totalNutrients?.FAT?.quantity || 0;
      let sugar = data.totalNutrients?.SUGAR?.quantity || 0;
      let weight = data.totalWeight || 0;

      // تجميع القيم من العناصر التفصيلية المحللة في حال غيابها في الجذر
      if (data.ingredients && data.ingredients.length > 0) {
        data.ingredients.forEach((ing) => {
          if (ing.parsed && ing.parsed.length > 0) {
            ing.parsed.forEach((parsedItem) => {
              if (parsedItem.weight && !weight) weight += parsedItem.weight;
              if (parsedItem.nutrients) {
                if (!cal) cal += parsedItem.nutrients.ENERC_KCAL?.quantity || 0;
                if (!prot) prot += parsedItem.nutrients.PROCNT?.quantity || 0;
                if (!carbs) carbs += parsedItem.nutrients.CHOCDF?.quantity || 0;
                if (!fat) fat += parsedItem.nutrients.FAT?.quantity || 0;
                if (!sugar) sugar += parsedItem.nutrients.SUGAR?.quantity || 0;
              }
            });
          }
        });
      }

      // ضخ الماكروز المحسوبة كقيم افتراضية مضمونة
      data.calories = Math.round(cal);
      data.totalWeight = Math.round(weight || 100);
      data.totalNutrients = {
        ENERC_KCAL: { label: 'Energy', quantity: Math.round(cal), unit: 'kcal' },
        PROCNT: { label: 'Protein', quantity: Number(prot.toFixed(1)), unit: 'g' },
        CHOCDF: { label: 'Carbs', quantity: Number(carbs.toFixed(1)), unit: 'g' },
        FAT: { label: 'Fat', quantity: Number(fat.toFixed(1)), unit: 'g' },
        SUGAR: { label: 'Sugar', quantity: Number(sugar.toFixed(1)), unit: 'g' },
      };

      return data;
    } catch (error) {
      console.warn('تنبيه Edamam Service:', error);
      return this.createEmptyResponse();
    }
  }

  private static createEmptyResponse(): EdamamNutritionResponse {
    return {
      calories: 0,
      totalWeight: 100,
      totalNutrients: {
        ENERC_KCAL: { label: 'Energy', quantity: 0, unit: 'kcal' },
        PROCNT: { label: 'Protein', quantity: 0, unit: 'g' },
        CHOCDF: { label: 'Carbs', quantity: 0, unit: 'g' },
        FAT: { label: 'Fat', quantity: 0, unit: 'g' },
        SUGAR: { label: 'Sugar', quantity: 0, unit: 'g' },
      },
      ingredients: [],
    };
  }
}

/**
 * قاموس ومترجم الأطعمة والمكونات الغذائية باللهجة العراقية والعربية إلى الإنجليزية
 * (Iraqi Dialect & Arabic to English Nutrition Translator)
 */

// قاموس مفردات اللهجة العراقية والأطعمة الشائعة
const IRAQI_DIALECT_DICTIONARY: Record<string, string> = {
  // الأطعمة العراقية الشائعة
  'تمن': 'rice',
  'تمّن': 'rice',
  'صمون': 'bread bun',
  'صمونه': 'bread bun',
  'صمونة': 'bread bun',
  'بتيتة': 'potato',
  'بتيته': 'potato',
  'طماطة': 'tomato',
  'طماطه': 'tomato',
  'زلاطة': 'salad',
  'زلاطه': 'salad',
  'جاي': 'tea',
  'طرشي': 'pickles',
  'قيمر': 'clotted cream',
  'دولمة': 'stuffed grape leaves',
  'دولمه': 'stuffed grape leaves',
  'كص': 'shawarma',
  'كص دجاج': 'chicken shawarma',
  'كص لحم': 'beef shawarma',
  'كباب': 'kebab',
  'معلاق': 'liver',
  'علاق': 'liver',
  'خاثر': 'yogurt',
  'لبن خاثر': 'yogurt',

  // اللحوم والدواجن والأسماك
  'لحم غنم': 'lamb',
  'لحم بقر': 'beef',
  'لحم مفروم': 'minced beef',
  'صدر دجاج': 'chicken breast',
  'فخذ دجاج': 'chicken thigh',
  'دجاج': 'chicken',
  'دجاجة': 'chicken',
  'سمك': 'fish',
  'سلمون': 'salmon',
  'تونه': 'tuna',
  'تونة': 'tuna',
  'روبيان': 'shrimp',
  'جمبري': 'shrimp',
  'كبدة': 'liver',
  'كبده': 'liver',

  // البيض والألبان
  'بيض': 'egg',
  'بيضه': 'egg',
  'بيضات': 'eggs',
  'حليب': 'milk',
  'لبن': 'yogurt',
  'زبادي': 'yogurt',
  'جبن': 'cheese',
  'جبنه': 'cheese',
  'زبده': 'butter',
  'زبدة': 'butter',

  // الكاربوهيدرات والحبوب
  'خبز': 'bread',
  'خبز ابيض': 'white bread',
  'خبز اسمر': 'whole wheat bread',
  'خبز بلدي': 'pita bread',
  'تنسوت': 'toast bread',
  'توست': 'toast bread',
  'معكرونه': 'pasta',
  'مكرونه': 'pasta',
  'شوفان': 'oats',
  'بطاطس': 'potato',
  'بطاطا': 'potato',

  // الخضروات والفواكه
  'تفاح': 'apple',
  'تفاحه': 'apple',
  'موز': 'banana',
  'موزه': 'banana',
  'برتقال': 'orange',
  'تمر': 'dates',
  'تمرات': 'dates',
  'عنب': 'grapes',
  'فراوله': 'strawberry',
  'مانجو': 'mango',
  'بطيخ': 'watermelon',
  'افوكادو': 'avocado',
  'خيار': 'cucumber',
  'خس': 'lettuce',
  'سبانخ': 'spinach',
  'بروكلي': 'broccoli',
  'بصل': 'onion',
  'ثوم': 'garlic',
  'جزر': 'carrot',

  // أدوات القياس العراقية والعربية
  'خاشوقة': 'tbsp',
  'خاشوقه': 'tbsp',
  'خاشوكه': 'tbsp',
  'خواكة': 'tbsp',
  'معلقة': 'tbsp',
  'ملعقة': 'tbsp',
  'كاسة': 'cup',
  'كاسه': 'cup',
  'كوب': 'cup',
  'ماعون': 'plate',
  'صحن': 'plate',
  'علبة': 'can',
  'علبه': 'can',
  'حبة': 'piece',
  'قطعة': 'piece',

  // طرق التحضير والأدوات
  'مشوي': 'grilled',
  'مسلوق': 'boiled',
  'مقلي': 'fried',
  'مطبوخ': 'cooked',
  'مع': 'and',
  'و': 'and',
};

/**
 * 1. تطبيع النص العربي واللهجة العراقية باستبدال المصطلحات بالإنجليزية
 */
export function normalizeIraqiDialect(text: string): string {
  if (!text) return '';

  let result = text.toLowerCase().trim();

  // ترتيب القاموس حسب طول الكلمة لمنع التداخل
  const keys = Object.keys(IRAQI_DIALECT_DICTIONARY).sort((a, b) => b.length - a.length);

  for (const key of keys) {
    const regex = new RegExp(`\\b${key}\\b`, 'gi');
    result = result.replace(regex, IRAQI_DIALECT_DICTIONARY[key] || key);
  }

  return result.replace(/\s+/g, ' ').trim();
}

/**
 * 2. خدمة الترجمة الإلكترونية (MyMemory API) للنصوص التي لا تزال تحتوي على كلمات عربية
 */
export async function translateArabicToEnglishAsync(rawArabicText: string): Promise<string> {
  // الخطوة 1: الفحص بالقاموس العراقي المحلي أولاً
  const locallyTranslated = normalizeIraqiDialect(rawArabicText);

  // إذا تم تحويل النص كاملاً للإنجليزية دون وجود أحرف عربية
  const hasArabicChars = /[\u0600-\u06FF]/.test(locallyTranslated);

  if (!hasArabicChars) {
    return locallyTranslated;
  }

  // الخطوة 2: الاستعلام من MyMemory Translation API للترجمة الدقيقة
  try {
    const endpoint = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
      locallyTranslated
    )}&langpair=ar|en`;

    const response = await fetch(endpoint);
    if (response.ok) {
      const data = await response.json();
      if (data && data.responseData && data.responseData.translatedText) {
        let apiTranslated = data.responseData.translatedText as string;
        // تنظيف وتحسين النص المترجم
        apiTranslated = apiTranslated
          .replace(/[^\w\s\d.]/gi, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        if (apiTranslated.length > 0) {
          return apiTranslated;
        }
      }
    }
  } catch (err) {
    console.warn('تعذر الاتصال بـ MyMemory Translator، سيتم استخدام القاموس المحلي:', err);
  }

  // Fallback للنص المنظم محلياً
  return locallyTranslated.replace(/[\u0600-\u06FF]/g, '').trim() || 'food item';
}

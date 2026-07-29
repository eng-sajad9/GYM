/**
 * وحدة معالجة وتطبيع النصوص العربية للوجبات التغذوية (Arabic Text Normalizer)
 */

// خريطة تحويل الأرقام المشرقية إلى أرقام غربية
const ARABIC_INDIC_DIGITS: Record<string, string> = {
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
};

// خريطة توحيد وحدات القياس العربية إلى صيغ قياسية
const UNIT_MAPPINGS: Array<[RegExp, string]> = [
  [/(?:جرام|غرام|غم|غ)/gi, 'g'],
  [/(?:كيلو|كيلوغرام|كغم)/gi, 'kg'],
  [/(?:ملعقة|معلقة|ملاق|معالق)\s*(?:كبيرة|طعام)?/gi, 'tbsp'],
  [/(?:ملعقة|معلقة|ملاق|معالق)\s*(?:صغيرة|شاي)?/gi, 'tsp'],
  [/(?:كوب|أكواب|كاسه|كاسة|كوبايات)/gi, 'cup'],
  [/(?:علبة|علب|علبه)/gi, 'can'],
  [/(?:شريحة|شرائح)/gi, 'slice'],
  [/(?:حبة|حبات|قطع|قطعة)/gi, 'piece'],
  [/(?:بيضة|بيضات|بيض)/gi, 'egg'],
];

/**
 * دالة تطبيع النص العربي الأساسية
 */
export function normalizeArabicText(text: string): string {
  if (!text || typeof text !== 'string') return '';

  let result = text.trim();

  // 1. تحويل الأرقام الهندية/العربية المشرقية إلى أرقام إنجليزية standard digits
  result = result.replace(/[٠-٩]/g, (digit) => ARABIC_INDIC_DIGITS[digit] || digit);

  // 2. إزالة التشكيل (Tashkeel / Diacritics)
  result = result.replace(/[\u064B-\u0652\u0640]/g, '');

  // 3. توحيد حروف الألف (أ ، إ ، آ -> ا)
  result = result.replace(/[أإآ]/g, 'ا');

  // 4. توحيد التاء المربوطة والهاء (ة -> ه) في نهاية الكلمات
  result = result.replace(/ة\b/g, 'ه');

  // 5. توحيد الألف المقصورة والياء (ى -> ي)
  result = result.replace(/ى\b/g, 'ي');

  // 6. استبدال الكلمات الزائدة ومفردات العطف البدائية لضبط المعالجة
  result = result.replace(/\b(?:أكلت|تناولت|وجبة|شربت|أخذت)\b/gi, '');

  // 7. تحويل وحدات القياس الشائعة
  for (const [regex, replacement] of UNIT_MAPPINGS) {
    result = result.replace(regex, ` ${replacement} `);
  }

  // 8. تنظيف الفواصل والرموز المزدوجة والمسافات الزائدة
  result = result
    .replace(/[^\w\s\u0600-\u06FF]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return result;
}

/**
 * دالة مقارنة السلاسل النصية المنظمة لتقييم التطابق مع الوجبات المخصصة
 */
export function isArabicTextMatch(input: string, target: string): boolean {
  const normalizedInput = normalizeArabicText(input).toLowerCase();
  const normalizedTarget = normalizeArabicText(target).toLowerCase();

  return normalizedInput === normalizedTarget || normalizedInput.includes(normalizedTarget);
}

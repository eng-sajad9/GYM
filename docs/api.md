# توثيق الـ APIs ونماذج التحقق (API Specification & Schemas)

يوثق هذا المستند واجهات البرمجة (Serverless API Endpoints) ونماذج التحقق باستخدام مكتبة **Zod** لضمان صحة البيانات المدخلة والمخرجة.

---

## 1. نماذج التحقق (Zod Schemas)

### أ. نموذج إدخال وجبة بنص طبيعي (`ParseMealSchema`)
```typescript
import { z } from 'zod';

export const ParseMealSchema = z.object({
  userId: z.string().uuid({ message: 'معرف المستخدم غير صالح' }),
  rawInputAr: z.string().min(2, { message: 'يرجى إدخال وصف الوجبة باللغة العربية' }),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack', 'other']).default('other'),
  source: z.enum(['web', 'telegram']).default('web'),
  loggedAt: z.string().datetime().optional(),
});

export type ParseMealInput = z.infer<typeof ParseMealSchema>;
```

### ب. نموذج إنشاء وجبة مخصصة (`CreateCustomMealSchema`)
```typescript
export const CreateCustomMealSchema = z.object({
  nameAr: z.string().min(2, { message: 'اسم الوجبة مطلوب' }),
  servingSizeG: z.number().positive({ message: 'حجم الوجبة يجب أن يكون أكبر من 0' }),
  calories: z.number().nonnegative({ message: 'السعرات يجب أن تكون 0 أو أكثر' }),
  proteinG: z.number().nonnegative(),
  carbsG: z.number().nonnegative(),
  fatG: z.number().nonnegative(),
});

export type CreateCustomMealInput = z.infer<typeof CreateCustomMealSchema>;
```

### ج. نموذج webhook التليجرام (`TelegramWebhookSchema`)
```typescript
export const TelegramWebhookSchema = z.object({
  update_id: z.number(),
  message: z.object({
    message_id: z.number(),
    from: z.object({
      id: z.number(),
      first_name: z.string().optional(),
      username: z.string().optional(),
    }),
    chat: z.object({
      id: z.number(),
    }),
    text: z.string().optional(),
    date: z.number(),
  }).optional(),
});
```

---

## 2. المسارات والوظائف (API Endpoints)

### `POST /api/parse-meal`
- **الوصف:** تحليل النص العربي، التطبيع، الترجمة، والاستعلام من Edamam Nutrition Analysis API أو الوجبات المخصصة.
- **Request Body:**
```json
{
  "rawInputAr": "200 جرام صدر دجاج ومعلقتين رز",
  "mealType": "lunch",
  "source": "web"
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "mealLogId": "uuid-v4",
    "rawInputAr": "200 جرام صدر دجاج ومعلقتين رز",
    "normalizedInputAr": "200 جرام صدر دجاج 2 ملعقة أرز",
    "translatedInputEn": "200g chicken breast and 2 tbsp rice",
    "totalCalories": 440,
    "totalProteinG": 48.2,
    "totalCarbsG": 42.0,
    "totalFatG": 7.5,
    "items": [
      {
        "nameAr": "صدر دجاج 200 جرام",
        "nameEn": "chicken breast",
        "servingSizeG": 200,
        "calories": 330,
        "proteinG": 44.2,
        "carbsG": 0,
        "fatG": 7.0
      }
    ]
  }
}
```

---

### `POST /api/telegram-webhook`
- **الوصف:** استقبال رسائل تليجرام التلقائية وتسجيل الوجبات فوراً للمستخدم المطابق لـ `telegram_chat_id`.
- **Response (200 OK):**
```json
{
  "status": "ok",
  "message": "Meal logged successfully"
}
```

---

## 3. تكامل الخدمات الخارجية (External Services Integration)

### أ. Edamam Nutrition Analysis API
- **Endpoint:** `https://api.edamam.com/api/nutrition-data?app_id={EDAMAM_APP_ID}&app_key={EDAMAM_APP_KEY}&ingr={text}`
- **Credentials:** `EDAMAM_APP_ID`, `EDAMAM_APP_KEY`

### ب. Telegram Bot API
- **Endpoint:** `https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage`
- **Payload:**
```json
{
  "chat_id": 123456789,
  "text": "✅ تم تسجيل الوجبة بنجاح!\n\n🔥 السعرات: 440 كالوري\n🍗 البروتين: 48.2ج\n🍚 الكاربوهيدرات: 42ج\n🥑 الدهون: 7.5ج",
  "parse_mode": "HTML"
}
```

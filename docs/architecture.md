# المعمارية والهيكلية البرمجية (System Architecture)

نظام تتبع التغذية والسعرات الحرارية المؤتمت باللغة العربية مبني وفق مبادئ **Clean Architecture** و **Modular Monorepo/Serverless Architecture** لضمان سهولة الصيانة، تدرج التوسع، واستبدال الخدمات الخارجية دون التأثير على منطق العمل الأساسي (Business Logic).

---

## 1. الطبقات المعمارية (Architectural Layers)

```
┌─────────────────────────────────────────────────────────┐
│                    Presentation Layer                   │
│   (React.js + TypeScript + Tailwind CSS + Recharts)    │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│                      Application /                      │
│                   Service Engine Layer                  │
│       (Vercel Serverless Functions + Zod Validation)    │
└──────────────┬───────────────────────────┬──────────────┘
               │                           │
               ▼                           ▼
┌────────────────────────────┐ ┌──────────────────────────┐
│   External Infrastructure  │ │    Data Storage Layer    │
│ (Edamam API + Telegram)    │ │   (Firebase Firestore)   │
└────────────────────────────┘ └──────────────────────────┘
```

### أ. طبقة العرض (Presentation Layer - UI)
- **التقنيات:** React 18 / Vite, TypeScript (Strict Mode), Tailwind CSS, Lucide Icons, Recharts.
- **اللغة والاتجاه:** لغة عربية كاملة، اتجاه من اليمين لليسار (`dir="rtl"`).
- **التصميم:** مظهر رياض داكن (`bg-neutral-900`, `bg-neutral-800`, نيون أخضر للبروتين، أصفر/برتقالي للكاربوهيدرات والسعرات).
- **المسؤوليات:** إدارة حالة الواجهة، تصفح التقويم والتواريخ اليومية، عرض المخططات البيانية، إدخال الوجبات بالنص الطبيعي، وإدارة الوجبات المخصصة.

### ب. طبقة الخدمة والمعالجة (Service Layer / API)
- **التقنيات:** Vercel Serverless Functions (Node.js/TypeScript).
- **المسؤوليات:**
  1. **Arabic Normalizer Service:** تنظيف وتطبيع النص العربي (حذف التشكيل، توحيد الهمزات والتاء المربوطة والأرقام العربية).
  2. **Translation Service:** ترجمة الوجبة المنظمة من العربية إلى الإنجليزية.
  3. **Edamam Nutrition Analysis Service:** التواصل مع Edamam API (باستخدام `EDAMAM_APP_ID` و `EDAMAM_APP_KEY`) لجلب السعرات والماكروز.
  4. **Custom Meals Matcher:** فحص الوجبات المخصصة في قاعدة البيانات لتفادي الاستدعاءات الخارجية.
  5. **Telegram Webhook Handler:** استقبال رسائل تليجرام، التحقق من هوية المستخدم، وتسجيل الوجبة تلقائياً.
  6. **Data Validation:** استخدام مكتبة `Zod` للتحقق الصارم من كل البيانات المدخلة والمستقبلة.

### ج. طبقة البيانات والأمان (Data Access Layer - Firebase)
- **التقنيات:** Firebase Auth + Firebase Firestore (NoSQL) + Real-Time Snapshots.
- **المسؤوليات:** التخزين اللحظي والآمن، تفعيل الأمان عبر Firebase Auth، والتحديث اللحظي المباشر بدون ريفريش.

---

## 2. هيكلية المجلدات المستهدفة (Project Folder Structure)

```
├── docs/
│   ├── architecture.md       # توثيق المعمارية العامة للأنظمة
│   ├── database.md           # توثيق قواعد البيانات ورسم العلاقات
│   └── api.md                # توثيق الـ APIs ونماذج Validation Zod
├── api/                      # Vercel Serverless Functions
│   ├── parse-meal.ts         # دالة تحليل الوجبات المدخلة وتجهيزها
│   ├── telegram-webhook.ts   # دالة استقبال رسائل بوت تليجرام
│   └── custom-meals.ts       # دالة إضافة وإدارة الوجبات المخصصة
├── src/                      # React Frontend Application
│   ├── components/           # المكونات الرسومية القابلة للإعادة
│   │   ├── common/           # الأزرار، الحقول، البطاقات
│   │   ├── dashboard/        # بطاقات الإحصائيات، شريط التقدم، اختيار التاريخ
│   │   ├── meals/            # نماذج إضافة الوجبات، قائمة الوجبات
│   │   └── charts/           # المخططات البيانية (Recharts)
│   ├── services/             # طبقة التواصل مع API وقاعدة البيانات
│   │   ├── firebaseConfig.ts      # تهيئة Firebase & Firestore
│   │   ├── edamamService.ts  # خدمة التكامل مع Edamam API
│   │   ├── mealService.ts    # خدمات الوجبات وتدفق التغذية
│   │   └── userService.ts    # خدمات ملف المستخدم والأهداف
│   ├── utils/                # الأدوات المساعدة
│   │   ├── arabicNormalizer.ts # دالة معالجة النص العربي
│   │   └── translators.ts    # دالة الترجمة
│   ├── types/                # التعاريف والأنواع (TypeScript Types)
│   ├── hooks/                # Custom React Hooks
│   ├── App.tsx
│   └── main.tsx
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── vite.config.ts
```

---

## 3. تدفق البيانات (Data Flow Sequence)

```
[مستخدم ينشئ وجبة بنص عربي]
           │
           ▼
1. فحص جدول custom_meals لتطابق النص المنظّم.
   ├── [إذا وُجدت]: استخدام القيم الغذائية المخزنة مباشرة (توفير API).
   └── [إذا لم تُوجد]: 
           │
           ▼
2. تطبيع النص العربي (Arabic Normalizer) -> "صدر دجاج 200 جرام ورز 150 جرام".
           │
           ▼
3. ترجمة النص للإنجليزية -> "200g chicken breast and 150g rice".
           │
           ▼
4. إرسال الطلب إلى Edamam Nutrition Analysis API وتلقي JSON.
           │
           ▼
5. حفظ جميع مراحل البيانات في جدول meal_logs و meal_items.
           │
           ▼
6. تحديث لوحة التحكم والمخططات البيانية فوراً.
```

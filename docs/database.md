# توثيق قاعدة البيانات (Firebase Firestore Collections)

يعتمد النظام بالكامل على قاعدة بيانات **Firebase Firestore (NoSQL)** مصممة لدعم السرعة، الأمان، والتحديثات اللحظية الحية (Real-Time Live Snapshots) بدون الحاجة لإعادة تحميل الصفحة.

---

## 1. هيكل المجموعات (Firestore Collections Structure)

```mermaid
erDiagram
    users ||--o| subscriptions : "has subscription"
    users ||--o| nutrition_settings : "has nutrition goals"
    users ||--o{ meal_logs : "subcollection"
    users ||--o{ custom_meals : "subcollection"

    users {
        string uid PK
        string full_name
        string email
        string role
        string account_status
        timestamp created_at
        timestamp updated_at
    }

    subscriptions {
        string uid PK
        string plan_type
        string status
        timestamp starts_at
        timestamp ends_at
        timestamp updated_at
    }

    nutrition_settings {
        string uid PK
        int daily_calorie_goal
        numeric daily_protein_goal_g
        numeric daily_carbs_goal_g
        numeric daily_fat_goal_g
        numeric daily_sugar_limit_g
        number telegram_chat_id
    }
```

---

## 2. تفاصيل المجموعات (Collections Details)

### 1️⃣ مجموعة `users/{uid}`
تحتوي على البيانات الأساسية لحساب المستخدم:
- `id`: المعرف الفريد للمستخدم في Firebase Auth.
- `full_name`: الاسم الكامل للمستخدم.
- `email`: البريد الإلكتروني.
- `role`: دور المستخدم (`user`, `admin`, `super_admin`).
- `account_status`: حالة الحساب (`active`, `trial`, `expired`, `blocked`).

### 2️⃣ مجموعة `subscriptions/{uid}`
تحتوي على بيانات اشتراك المستخدم وصلاحية الوصول:
- `plan_type`: نوع الخطة (`monthly`, `quarterly`, `yearly`, `lifetime`).
- `status`: حالة الاشتراك الحالية.
- `ends_at`: تاريخ انتهاء الصلاحية والاشتراك.

### 3️⃣ مجموعة `nutrition_settings/{uid}`
تحتوي على أهداف السعرات والماكروز اليومية:
- `daily_calorie_goal`: هدف السعرات الحرارية اليومي.
- `daily_protein_goal_g`: هدف البروتين اليومي (غرام).
- `daily_carbs_goal_g`: هدف الكربوهيدرات اليومي (غرام).
- `daily_fat_goal_g`: هدف الدهون اليومي (غرام).
- `daily_sugar_limit_g`: حد السكر اليومي (غرام).
- `telegram_chat_id`: معرف حساب تليجرام المربوط بالمنصة.

### 4️⃣ المجموعة الفرعية `users/{uid}/meal_logs/{logId}`
تحتوي على سجلات الوجبات المسجلة يومياً من قِبل المستخدم.

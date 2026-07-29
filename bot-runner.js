import fs from 'fs';
import path from 'path';

const LOCK_FILE = path.resolve(process.cwd(), 'bot.lock');
try {
  if (fs.existsSync(LOCK_FILE)) {
    const pid = fs.readFileSync(LOCK_FILE, 'utf8');
    fs.unlinkSync(LOCK_FILE);
  }
  fs.writeFileSync(LOCK_FILE, String(process.pid));
} catch {}

process.on('exit', () => {
  try {
    if (fs.existsSync(LOCK_FILE)) fs.unlinkSync(LOCK_FILE);
  } catch {}
});
process.on('SIGINT', () => process.exit());
process.on('SIGTERM', () => process.exit());

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key) {
          process.env[key.trim()] = valueParts.join('=').trim();
        }
      }
    });
  }
}

loadEnv();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8350967794:AAG7ZVnlTjvc9kUoK8-qC-TqL0jpDx_Z4Ik';
const FIREBASE_API_KEY = process.env.VITE_FIREBASE_API_KEY || 'AIzaSyANFgwZ6gg85rw7JQ6Q2htp-LHf_Npe9iU';
const FIREBASE_PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || 'school-project-d725e';
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;
const EDAMAM_APP_ID = process.env.EDAMAM_APP_ID || 'b127df94';
const EDAMAM_APP_KEY = process.env.EDAMAM_APP_KEY || '5a85df825dbd63c71850abb917668fe2';

console.log('⚡ جاري تشغيل بوت تليجرام بالمصادقة المباشرة لحل مشكلة الصلاحيات (Firebase Auth Enabled)...');

let botIdToken = null;
let tokenExpiresAt = 0;
let lastUpdateId = 0;
const processedUpdateIds = new Set();
const userStates = new Map();
const pendingMeals = new Map();

async function getAuthHeaders() {
  const now = Date.now();
  if (botIdToken && now < tokenExpiresAt) {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${botIdToken}`,
    };
  }

  try {
    let res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'telegram-bot@gym-tracker.internal',
        password: 'GymBotPassword123!',
        returnSecureToken: true,
      }),
    });

    if (!res.ok) {
      res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'telegram-bot@gym-tracker.internal',
          password: 'GymBotPassword123!',
          returnSecureToken: true,
        }),
      });
    }

    if (res.ok) {
      const data = await res.json();
      botIdToken = data.idToken;
      const expiresInSec = Number(data.expiresIn || 3600);
      tokenExpiresAt = now + (expiresInSec - 300) * 1000;
      return {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${botIdToken}`,
      };
    }
  } catch (err) {
    console.error('Error acquiring Firebase Auth token for bot:', err);
  }

  return { 'Content-Type': 'application/json' };
}

function getMainMenuKeyboard() {
  return {
    keyboard: [
      [{ text: '📝 تسجيل وجبة' }, { text: '🔍 فحص سعرات (بدون حفظ)' }],
      [{ text: '📊 ملخص اليوم' }, { text: '🍽 عرض وجبات اليوم' }],
    ],
    resize_keyboard: true,
    persistent: true,
  };
}

async function verifySaaSAuth(chatId) {
  try {
    const strChatId = String(chatId).trim();
    const headers = await getAuthHeaders();

    // Fetch all nutrition_settings documents directly using authenticated token
    const res = await fetch(`${FIRESTORE_BASE}/nutrition_settings`, { headers });
    if (res.ok) {
      const data = await res.json();
      const docs = data.documents || [];

      for (const docItem of docs) {
        const fields = docItem.fields || {};
        const chatVal = fields.telegram_chat_id?.integerValue ?? fields.telegram_chat_id?.stringValue;

        if (chatVal != null && String(chatVal).trim() === strChatId) {
          const docName = docItem.name || '';
          const userId = docName.split('/').pop();

          // Fetch subscription status for this userId
          const subRes = await fetch(`${FIRESTORE_BASE}/subscriptions/${userId}`, { headers });
          let status = 'active';
          let trialEndDate = new Date(Date.now() + 30 * 86400000).toISOString();

          if (subRes.ok) {
            const subData = await subRes.json();
            status = subData.fields?.status?.stringValue || 'active';
            trialEndDate = subData.fields?.ends_at?.stringValue || subData.fields?.ends_at?.timestampValue || trialEndDate;
          }

          const isExpired = ['expired', 'cancelled', 'blocked', 'paused'].includes(status) ||
            (trialEndDate && new Date(trialEndDate).getTime() < Date.now());

          return {
            allowed: !isExpired,
            user_id: userId,
            account_status: status,
            trial_end_date: trialEndDate,
          };
        }
      }
    }
    return { allowed: false, reason: 'unlinked' };
  } catch (err) {
    console.error('Verify SaaS Auth error:', err);
    return { allowed: false, reason: 'unlinked' };
  }
}

async function sendTelegramMessage(chatId, text, replyMarkup = null) {
  try {
    const payload = {
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML',
    };
    if (replyMarkup) payload.reply_markup = replyMarkup;

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error('Error sending message:', err.message);
  }
}

async function saveMealToFirestore(userId, rawInputAr, result, mealType = 'lunch') {
  try {
    const headers = await getAuthHeaders();
    await fetch(`${FIRESTORE_BASE}/users/${userId}/meal_logs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        fields: {
          raw_input_ar: { stringValue: rawInputAr },
          source: { stringValue: 'telegram' },
          meal_type: { stringValue: mealType },
          logged_at: { timestampValue: new Date().toISOString() },
          total_calories: { integerValue: result.calories },
          total_protein_g: { doubleValue: result.protein },
          total_carbs_g: { doubleValue: result.carbs },
          total_fat_g: { doubleValue: result.fat },
          total_sugar_g: { doubleValue: result.sugar || 0 },
        },
      }),
    });
  } catch (err) {
    console.error('Error saving meal to Firestore:', err);
  }
}

async function handleUpdate(update) {
  if (!update.message || !update.message.text) return;
  const chatId = update.message.chat.id;
  const text = update.message.text.trim();

  // STRICT AUTH CHECK FIRST — NEVER LOG MEALS FOR UNLINKED USERS
  const saasAuth = await verifySaaSAuth(chatId);

  if (!saasAuth.allowed) {
    userStates.delete(chatId);
    pendingMeals.delete(chatId);

    if (saasAuth.reason === 'unlinked') {
      await sendTelegramMessage(
        chatId,
        `⚠️ <b>عذراً، حساب تليجرام هذا غير مرتبط بأي ملف لاعب في المنصة!</b>\n\n` +
        `لكي يتمكن البوت من تسجيل الوجبات في ملفك التغذوي الخاص بدون أي اختلاط:\n` +
        `1️⃣ افتح التطبيق وتوجه إلى <b>الملف الشخصي (Profile Settings)</b>\n` +
        `2️⃣ أدخل معرّف تليجرام الخاص بك:\n<code>${chatId}</code> ثم اضغط <b>حفظ التغييرات ✨</b>\n\n` +
        `بعد الحفظ، يرجى إعادة إرسال رسالتك هنا وسيتم التعرف عليك فوراً.`
      );
      return;
    }

    await sendTelegramMessage(
      chatId,
      `⚠️ <b>عذراً، انتهت صلاحية اشتراكك في المنصة!</b>\n\n` +
      `تاريخ الانتهاء: <code>${new Date(saasAuth.trial_end_date || Date.now()).toLocaleDateString('ar-EG')}</code>\n` +
      `يرجى تجديد الاشتراك عبر التطبيق لاستئناف استخدام البوت.`
    );
    return;
  }

  const state = userStates.get(chatId) || 'IDLE';

  if (text === '/start') {
    userStates.set(chatId, 'IDLE');
    await sendTelegramMessage(
      chatId,
      `👋 <b>أهلاً بك في نظام التغذية الذكي!</b>\n\nحسابك مرتبط بنجاح مع ملفك الشخصي ✅\nاختر من القائمة أدناه لتسجيل الوجبات وتتبع السعرات:`,
      getMainMenuKeyboard()
    );
    return;
  }

  if (text === '📝 تسجيل وجبة') {
    userStates.set(chatId, 'WAITING_FOR_MEAL_INPUT');
    await sendTelegramMessage(
      chatId,
      '✍️ <b>يرجى كتابة الوجبة الآن بالنص الطبيعي:</b>\n<i>مثال: 150 غرام صدر دجاج مع 200 غرام تمن</i>'
    );
    return;
  }

  if (text === '📊 ملخص اليوم') {
    const logs = await getTodayLogsFromFirestore(saasAuth.user_id);
    const totalCal = logs.reduce((sum, item) => sum + (item.total_calories || 0), 0);
    const totalProt = logs.reduce((sum, item) => sum + (item.total_protein_g || 0), 0);
    const totalCarb = logs.reduce((sum, item) => sum + (item.total_carbs_g || 0), 0);
    const totalFat = logs.reduce((sum, item) => sum + (item.total_fat_g || 0), 0);

    await sendTelegramMessage(
      chatId,
      `📊 <b>ملخص التغذية لليوم:</b>\n\n🔥 السعرات: <b>${Math.round(totalCal)}</b> كالس\n🥩 البروتين: <b>${totalProt.toFixed(1)}</b> غرام\n🍚 الكارب: <b>${totalCarb.toFixed(1)}</b> غرام\n🥑 الدهون: <b>${totalFat.toFixed(1)}</b> غرام\n\nعدد الوجبات المسجلة: <b>${logs.length}</b>`
    );
    return;
  }

  if (state === 'WAITING_FOR_MEAL_INPUT' || (text !== '📝 تسجيل وجبة' && text !== '📊 ملخص اليوم' && text !== '🔍 فحص سعرات (بدون حفظ)' && text !== '🍽 عرض وجبات اليوم')) {
    await sendTelegramMessage(chatId, '⏳ جاري تحليل الوجبة وحساب القيم الغذائية لملفك الشخصي...');
    const result = await analyzeMealText(text);

    if (result.success) {
      await saveMealToFirestore(saasAuth.user_id, text, result);
      userStates.set(chatId, 'IDLE');

      await sendTelegramMessage(
        chatId,
        `✅ <b>تم تحليل الوجبة وحفظها بنجاح في ملفك الشخصي 🍽️</b>\n\n` +
        `<b>المدخل:</b> ${text}\n\n` +
        `<b>إجمالي الماكروز المسجلة:</b>\n` +
        `🔥 <b>السعرات:</b> ${result.calories} كالوري\n` +
        `🟢 <b>البروتين:</b> ${result.protein}g\n` +
        `🟡 <b>الكارب:</b> ${result.carbs}g\n` +
        `🟠 <b>الدهون:</b> ${result.fat}g`
      );
    } else {
      userStates.set(chatId, 'IDLE');
      await sendTelegramMessage(chatId, '❌ لم نتمكن من تحليل الوجبة تلقائياً. يرجى كتابة الكميات بشكل واضح.');
    }
  }
}

async function analyzeMealText(text) {
  try {
    const translated = await translateToEnglish(text);
    const res = await fetch(
      `https://api.edamam.com/api/nutrition-data?app_id=${EDAMAM_APP_ID}&app_key=${EDAMAM_APP_KEY}&nutrition-type=logging&ingr=${encodeURIComponent(translated)}`
    );
    const data = await res.json();
    const calories = data.calories || data.totalNutrients?.ENERC_KCAL?.quantity || 0;
    const protein = data.totalNutrients?.PROCNT?.quantity || 0;
    const carbs = data.totalNutrients?.CHOCDF?.quantity || 0;
    const fat = data.totalNutrients?.FAT?.quantity || 0;

    return {
      success: true,
      calories: Math.round(calories),
      protein: Number(protein.toFixed(1)),
      carbs: Number(carbs.toFixed(1)),
      fat: Number(fat.toFixed(1)),
      translatedEn: translated,
    };
  } catch {
    return { success: false };
  }
}

async function getTodayLogsFromFirestore(userId) {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${FIRESTORE_BASE}/users/${userId}/meal_logs`, { headers });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.documents) return [];

    return data.documents.map((docItem) => {
      const fields = docItem.fields || {};
      return {
        total_calories: Number(fields.total_calories?.integerValue || fields.total_calories?.doubleValue || 0),
        total_protein_g: Number(fields.total_protein_g?.doubleValue || fields.total_protein_g?.integerValue || 0),
        total_carbs_g: Number(fields.total_carbs_g?.doubleValue || fields.total_carbs_g?.integerValue || 0),
        total_fat_g: Number(fields.total_fat_g?.doubleValue || fields.total_fat_g?.integerValue || 0),
      };
    });
  } catch {
    return [];
  }
}

async function translateToEnglish(text) {
  let result = text.toLowerCase();
  const dict = {
    'تمن': 'rice', 'تمّن': 'rice', 'صمون': 'bread bun', 'بتيتة': 'potato',
    'طماطة': 'tomato', 'زلاطة': 'salad', 'لحم': 'meat', 'دجاج': 'chicken',
  };
  Object.keys(dict).forEach((k) => {
    result = result.replace(new RegExp(k, 'g'), dict[k]);
  });
  return result;
}

async function pollUpdates() {
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${lastUpdateId + 1}&timeout=30`);
    if (res.ok) {
      const data = await res.json();
      if (data.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          lastUpdateId = update.update_id;
          if (!processedUpdateIds.has(update.update_id)) {
            processedUpdateIds.add(update.update_id);
            await handleUpdate(update);
          }
        }
      }
    }
  } catch {}
  setTimeout(pollUpdates, 1000);
}

pollUpdates();

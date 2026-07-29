/**
 * ============================================================
 * Telegram Service — Firebase Firestore Implementation
 * Strictly verifies player identity via Telegram Chat ID linkage.
 * Guarantees zero mixing of player meal logs or orphan accounts.
 * ============================================================
 */

import {
  doc,
  getDoc,
  collection,
  getDocs,
} from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { MealType } from '../types';
import { FirebaseMealService } from './firebaseMealService';

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      first_name?: string;
      username?: string;
    };
    text?: string;
    date: number;
  };
}

interface PendingMealData {
  chatId: number;
  userId: string;
  rawInputAr: string;
  normalizedInputAr: string;
  translatedInputEn: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export class TelegramService {
  private static botToken = (typeof import.meta !== 'undefined' ? import.meta.env?.VITE_TELEGRAM_BOT_TOKEN : '') || '';
  private static offset = 0;
  private static pendingConfirmations: Map<number, PendingMealData> = new Map();

  public static isConfigured(): boolean {
    return Boolean(this.botToken);
  }

  public static async processIncomingTelegramMessage(chatId: number, text: string): Promise<boolean> {
    await this.handleIncomingMessage(chatId, text, 'لاعب');
    return true;
  }

  public static async sendMessage(chatId: number, text: string): Promise<boolean> {
    if (!this.botToken) return false;
    try {
      const response = await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  public static async pollUpdates(): Promise<void> {
    if (!this.botToken) return;
    try {
      const url = `https://api.telegram.org/bot${this.botToken}/getUpdates?offset=${this.offset}&timeout=10`;
      const response = await fetch(url);
      if (!response.ok) return;
      const data = await response.json();
      if (!data.ok || !data.result?.length) return;

      for (const update of data.result as TelegramUpdate[]) {
        this.offset = Math.max(this.offset, update.update_id + 1);
        if (update.message?.text) {
          await this.handleIncomingMessage(
            update.message.from.id,
            update.message.text,
            update.message.from.first_name || 'لاعب'
          );
        }
      }
    } catch (err) {
      console.warn('تنبيه استلام رسائل تليجرام:', err);
    }
  }

  private static async handleIncomingMessage(chatId: number, text: string, firstName: string): Promise<void> {
    const trimmed = text.trim();

    // ── 1. Strictly verify if this Telegram Chat ID belongs to a linked player ─────
    const userId = await this.getUserIdByChatId(chatId);

    if (!userId) {
      await this.sendMessage(
        chatId,
        `⚠️ <b>حساب تليجرام هذا غير مرتبط بأي ملف لاعب!</b>\n\nيا ${firstName}، يرجى الدخول إلى التطبيق ← إعدادات الملف الشخصي (Profile Settings) ← وربط رقم تليجرام الخاص بك:\n<code>${chatId}</code>\n\nبعد الحفظ، ستتمكن من تسجيل وجباتك ومزامنتها لحظياً مع حسابك التغذوي الخاص بدون أي اختلاط.`
      );
      return;
    }

    // ── 2. Verify subscription status ──────────────────────────────
    try {
      const [userSnap, subSnap] = await Promise.all([
        getDoc(doc(db, 'users', userId)),
        getDoc(doc(db, 'subscriptions', userId)),
      ]);

      const subStatus = subSnap.data()?.['status'] || userSnap.data()?.['account_status'] || 'trial';
      const endsAt = subSnap.data()?.['ends_at']?.toDate?.()?.toISOString() || subSnap.data()?.['ends_at'];
      const isExpired = ['expired', 'cancelled', 'blocked', 'paused'].includes(subStatus) ||
        (endsAt && new Date(endsAt).getTime() < Date.now());

      if (isExpired) {
        await this.sendMessage(
          chatId,
          `⚠️ <b>عذراً، انتهت صلاحية اشتراكك في المنصة!</b>\n\nيرجى تجديد الاشتراك عبر التطبيق لاستكمال استخدام البوت وتسجيل الوجبات.`
        );
        return;
      }
    } catch {
      // Proceed if check fails non-fatally
    }

    // ── 3. Handle Bot Commands & Meal Logging ──────────────────────
    if (trimmed.startsWith('/start')) {
      await this.sendMessage(
        chatId,
        `أهلاً بك يا ${firstName} في <b>نظام التغذية الذكي</b> 🥗🏋️‍♂️!\n\nحسابك مرتبط ومكتمل مع ملفك التغذوي في المنصة ✅\n\nأرسل لي وجبتك بالنص الطبيعي (مثال: <code>أكلت 150 غرام صدر دجاج مع 200 غرام تمن</code>).\n\n<b>أوامر سريعة:</b>\n/today - عرض سجل وجباتك اليوم\n/confirm - تأكيد الوجبة المعلقة\n/cancel - إلغاء الوجبة المعلقة`
      );
      return;
    }

    if (trimmed.startsWith('/today')) {
      const logs = await FirebaseMealService.getTodayMealLogs(userId);
      if (!logs.length) {
        await this.sendMessage(chatId, 'لا توجد وجبات مسجلة في ملفك اليوم حتى الآن.');
        return;
      }
      let lines = '<b>سجل وجباتك لليوم 📊:</b>\n\n';
      let totalCal = 0, totalP = 0, totalC = 0, totalF = 0;
      logs.forEach((log, i) => {
        totalCal += log.total_calories || 0;
        totalP += log.total_protein_g || 0;
        totalC += log.total_carbs_g || 0;
        totalF += log.total_fat_g || 0;
        lines += `${i + 1}. <b>${log.raw_input_ar}</b>\n   🔥 ${log.total_calories} | P:${log.total_protein_g}g | C:${log.total_carbs_g}g | F:${log.total_fat_g}g\n\n`;
      });
      lines += `<b>الإجمالي:</b> 🔥 ${Math.round(totalCal)} | P:${totalP.toFixed(1)}g | C:${totalC.toFixed(1)}g | F:${totalF.toFixed(1)}g`;
      await this.sendMessage(chatId, lines);
      return;
    }

    if (trimmed.startsWith('/confirm')) {
      const pending = this.pendingConfirmations.get(chatId);
      if (!pending) {
        await this.sendMessage(chatId, 'لا توجد وجبة معلقة للتأكيد.');
        return;
      }
      await FirebaseMealService.processAndSaveMeal({
        userId: pending.userId,
        rawInputAr: pending.rawInputAr,
        mealType: 'lunch' as MealType,
        source: 'telegram',
        loggedAt: new Date().toISOString(),
      });
      this.pendingConfirmations.delete(chatId);
      await this.sendMessage(chatId, '✅ تم تأكيد وحفظ الوجبة بنجاح في ملفك الشخصي بالمنصة!');
      return;
    }

    if (trimmed.startsWith('/cancel')) {
      if (this.pendingConfirmations.has(chatId)) {
        this.pendingConfirmations.delete(chatId);
        await this.sendMessage(chatId, '❌ تم إلغاء الوجبة المعلقة.');
      } else {
        await this.sendMessage(chatId, 'لا توجد وجبة معلقة للإلغاء.');
      }
      return;
    }

    // ── 4. Natural Language Meal Processing ────────────────────────
    await this.sendMessage(chatId, '🔍 جاري تحليل الوجبة واحتساب القيم التغذوية لملفك الشخصي...');

    try {
      const result = await FirebaseMealService.processAndSaveMeal({
        userId,
        rawInputAr: trimmed,
        mealType: 'lunch' as MealType,
        source: 'telegram',
        loggedAt: new Date().toISOString(),
      });

      this.pendingConfirmations.set(chatId, {
        chatId,
        userId,
        rawInputAr: trimmed,
        normalizedInputAr: result.normalizedInputAr,
        translatedInputEn: result.translatedInputEn,
        calories: result.totalCalories,
        protein: result.totalProteinG,
        carbs: result.totalCarbsG,
        fat: result.totalFatG,
      });

      const itemsText = result.items
        .map((item) => `• <b>${item.nameAr}</b> (${item.servingSizeG}g): ${item.calories} cal | P:${item.proteinG}g | C:${item.carbsG}g | F:${item.fatG}g`)
        .join('\n');

      await this.sendMessage(
        chatId,
        `<b>تم تحليل الوجبة وحفظها في ملفك الشخصي 🍽️</b>\n\n<b>المدخل:</b> ${trimmed}\n\n<b>المكونات:</b>\n${itemsText || '• وجبة مخصصة'}\n\n<b>إجمالي الماكروز:</b>\n🔥 <b>السعرات:</b> ${result.totalCalories} كالوري\n🟢 <b>البروتين:</b> ${result.totalProteinG}g\n🟡 <b>الكارب:</b> ${result.totalCarbsG}g\n🟠 <b>الدهون:</b> ${result.totalFatG}g\n\n<i>أرسل /confirm للحفظ في السجل، أو /cancel للإلغاء.</i>`
      );
    } catch {
      await this.sendMessage(chatId, 'حدث خطأ أثناء معالجة الوجبة، يرجى المحاولة مرة أخرى.');
    }
  }

  /**
   * Lookup exact player Firebase userId by Telegram chatId in nutrition_settings
   */
  private static async getUserIdByChatId(chatId: number): Promise<string | null> {
    try {
      const snap = await getDocs(collection(db, 'nutrition_settings'));
      const strChatId = String(chatId).trim();

      for (const d of snap.docs) {
        const data = d.data();
        const chatVal = data['telegram_chat_id'];
        if (chatVal != null && String(chatVal).trim() === strChatId) {
          return d.id; // Document ID is player UID
        }
      }

      return null;
    } catch (err) {
      console.error('[TelegramService] getUserIdByChatId error:', err);
      return null;
    }
  }
}

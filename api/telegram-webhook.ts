import { TelegramWebhookSchema } from '../src/types';
import { TelegramService } from '../src/services/telegramService';

export interface VercelRequest {
  method?: string;
  body: Record<string, unknown>;
  query?: Record<string, string | string[]>;
}

export interface VercelResponse {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => VercelResponse;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'error', error: 'Method not allowed' });
  }

  try {
    const validation = TelegramWebhookSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({ status: 'error', error: 'Invalid telegram webhook payload' });
    }

    const { message } = validation.data;

    if (!message || !message.text) {
      return res.status(200).json({ status: 'ignored', reason: 'No text message' });
    }

    const chatId = message.chat.id;
    const text = message.text.trim();

    const result = await TelegramService.processIncomingTelegramMessage(chatId, text);

    return res.status(200).json({ status: 'ok', result });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown webhook error';
    console.error('Telegram Webhook Handler Error:', error);
    return res.status(500).json({ status: 'error', error: errMsg });
  }
}

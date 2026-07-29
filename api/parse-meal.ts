import { ParseMealInputSchema } from '../src/types';
import { MealService } from '../src/services/mealService';

export interface VercelRequest {
  method?: string;
  body: Record<string, unknown>;
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
    const validation = ParseMealInputSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        status: 'error',
        error: 'Invalid input format',
        details: validation.error.format(),
      });
    }

    const result = await MealService.processAndSaveMeal(validation.data);

    return res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Processing error';
    console.error('Meal processing handler error:', error);
    return res.status(500).json({ status: 'error', error: errMsg });
  }
}

import { z } from 'zod';

export const exchangeOAuthCodeSchema = z.object({
  code: z.string().min(1, 'Código é obrigatório'),
});

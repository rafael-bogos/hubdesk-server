import { z } from 'zod';

export const updateSlaSettingsSchema = z
  .object({
    lowPriorityHours: z.number().int().positive().optional(),
    mediumPriorityHours: z.number().int().positive().optional(),
    highPriorityHours: z.number().int().positive().optional(),
    urgentPriorityHours: z.number().int().positive().optional(),
    warningThresholdPercent: z.number().int().min(1).max(99).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'Nenhum campo para atualizar foi enviado' });

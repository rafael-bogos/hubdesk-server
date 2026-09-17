import { z } from 'zod';

export const updateNotificationPreferencesSchema = z
  .object({
    emailOnTicketUpdated: z.boolean().optional(),
    emailOnTicketClosed: z.boolean().optional(),
    emailOnSlaWarning: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'Nenhum campo para atualizar foi enviado' });

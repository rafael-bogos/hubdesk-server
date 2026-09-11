import { z } from 'zod';

const priorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
const statusEnum = z.enum(['OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED']);

export const createTicketSchema = z.object({
  title: z.string().min(3, 'Título deve ter ao menos 3 caracteres'),
  description: z.string().min(1, 'Descrição é obrigatória'),
  priority: priorityEnum.optional(),
  categoryId: z.string().optional(),
});

export const listTicketsQuerySchema = z.object({
  status: statusEnum.optional(),
  priority: priorityEnum.optional(),
  categoryId: z.string().optional(),
  assigneeId: z.string().optional(),
  search: z.string().min(1).max(200).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
});

export const updateTicketStatusSchema = z.object({
  status: statusEnum,
});

export const assignTicketSchema = z.object({
  assigneeIds: z.array(z.string().min(1)).max(50, 'No máximo 50 responsáveis por chamado'),
});

export const addCommentSchema = z.object({
  body: z.string().min(1, 'Comentário não pode ser vazio'),
  isInternal: z.boolean().optional(),
});

export const updateCommentInternalSchema = z.object({
  isInternal: z.boolean(),
});

export const updateAttachmentInternalSchema = z.object({
  isInternal: z.boolean(),
});

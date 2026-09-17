import { z } from 'zod';

const roleEnum = z.enum(['ADMIN', 'AGENT', 'CUSTOMER']);

export const listUsersQuerySchema = z.object({
  role: roleEnum.optional(),
  // z.coerce.boolean() faria Boolean("false") === true (qualquer string não
  // vazia é truthy) — precisa comparar o texto, não só coagir o tipo.
  active: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
});

export const createUserSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(8, 'Senha deve ter ao menos 8 caracteres'),
  role: roleEnum,
});

export const updateUserSchema = z
  .object({
    name: z.string().min(1).optional(),
    email: z.string().email('E-mail inválido').optional(),
    role: roleEnum.optional(),
    active: z.boolean().optional(),
    categoryIds: z.array(z.string()).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'Nenhum campo para atualizar foi enviado' });

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  active: z.boolean().optional(),
});

export const updateCategorySchema = z
  .object({
    name: z.string().min(1).optional(),
    active: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'Nenhum campo para atualizar foi enviado' });

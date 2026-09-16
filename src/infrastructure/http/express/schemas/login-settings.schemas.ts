import { z } from 'zod';

export const updateLoginSettingsSchema = z.object({
  emailPasswordEnabled: z.boolean().optional(),

  googleEnabled: z.boolean().optional(),
  googleClientId: z.string().min(1).optional(),
  googleClientSecret: z.string().min(1).optional(),

  customOAuthEnabled: z.boolean().optional(),
  customOAuthProviderId: z
    .string()
    .regex(/^[a-z0-9-]+$/, 'Use apenas letras minúsculas, números e hífen')
    .optional(),
  customOAuthProviderName: z.string().min(1).optional(),
  customOAuthClientId: z.string().min(1).optional(),
  customOAuthClientSecret: z.string().min(1).optional(),
  customOAuthAuthorizationUrl: z.string().url().optional(),
  customOAuthTokenUrl: z.string().url().optional(),
  customOAuthUserInfoUrl: z.string().url().optional(),
  customOAuthScopes: z.string().optional(),

  defaultMethod: z.enum(['google', 'custom', 'email']).optional(),
});

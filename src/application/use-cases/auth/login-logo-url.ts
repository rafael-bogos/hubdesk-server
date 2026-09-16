import { LoginSettings } from '../../../domain/entities/login-settings.entity';
import { env } from '../../../main/config/env';

// `?v=` com o updatedAt muda sempre que a logo é trocada/removida (mesma
// linha da tabela) — cache-busting simples sem precisar de hash do arquivo.
export const buildLoginLogoUrl = (settings: LoginSettings): string | null =>
  settings.customOAuthLogoPath
    ? `${env.backendPublicUrl}/auth/login-logo?v=${settings.updatedAt.getTime()}`
    : null;

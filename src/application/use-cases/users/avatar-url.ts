import { User } from '../../../domain/entities/user.entity';
import { env } from '../../../main/config/env';

// Prioridade: foto enviada pelo próprio usuário (servida por nós, com
// cache-busting via `?v=` no updatedAt) > foto já existente na conta do
// provedor OAuth (Google, etc. — `image`, preenchido pelo better-auth na
// criação da conta) > nenhuma (cai pras iniciais no client).
export const buildAvatarUrl = (
  user: Pick<User, 'id' | 'avatarPath' | 'image' | 'updatedAt'>,
): string | null => {
  if (user.avatarPath) {
    return `${env.backendPublicUrl}/users/${user.id}/avatar?v=${user.updatedAt.getTime()}`;
  }
  return user.image ?? null;
};

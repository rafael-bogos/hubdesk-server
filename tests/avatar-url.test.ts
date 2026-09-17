import { describe, expect, it } from 'vitest';
import { buildAvatarUrl } from '../src/application/use-cases/users/avatar-url';

const baseUser = {
  id: 'user-1',
  avatarPath: null as string | null,
  image: null as string | null,
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

describe('buildAvatarUrl', () => {
  it('sem avatarPath nem image, retorna null (client cai pras iniciais)', () => {
    expect(buildAvatarUrl(baseUser)).toBeNull();
  });

  it('com avatarPath, retorna a URL própria servida pelo backend, com cache-busting no updatedAt', () => {
    const url = buildAvatarUrl({ ...baseUser, avatarPath: 'avatars/user-1.png' });
    expect(url).toContain('/users/user-1/avatar?v=');
    expect(url).toContain(String(baseUser.updatedAt.getTime()));
  });

  it('sem avatarPath mas com image (foto do provedor OAuth), retorna a URL do provedor direto', () => {
    const providerUrl = 'https://lh3.googleusercontent.com/a/fake-photo.jpg';
    expect(buildAvatarUrl({ ...baseUser, image: providerUrl })).toBe(providerUrl);
  });

  it('com avatarPath e image, a foto própria tem prioridade', () => {
    const url = buildAvatarUrl({
      ...baseUser,
      avatarPath: 'avatars/user-1.png',
      image: 'https://lh3.googleusercontent.com/a/fake-photo.jpg',
    });
    expect(url).toContain('/users/user-1/avatar');
  });
});

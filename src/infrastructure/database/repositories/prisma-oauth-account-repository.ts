import { PrismaClient } from '@prisma/client';
import { OAuthAccountRepository } from '../../../domain/repositories/oauth-account-repository';

export class PrismaOAuthAccountRepository implements OAuthAccountRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findUserIdByAccount(providerId: string, accountId: string): Promise<string | null> {
    const account = await this.prisma.account.findFirst({
      where: { providerId, accountId },
      select: { userId: true },
    });
    return account?.userId ?? null;
  }
}

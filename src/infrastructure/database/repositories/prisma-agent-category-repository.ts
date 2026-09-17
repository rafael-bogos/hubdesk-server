import { PrismaClient } from '@prisma/client';
import { AgentCategoryRepository } from '../../../domain/repositories/agent-category-repository';

export class PrismaAgentCategoryRepository implements AgentCategoryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async listCategoryIdsForUser(userId: string): Promise<string[]> {
    const rows = await this.prisma.agentCategory.findMany({
      where: { userId },
      select: { categoryId: true },
    });
    return rows.map((row) => row.categoryId);
  }

  async setCategoriesForUser(userId: string, categoryIds: string[]): Promise<void> {
    const uniqueCategoryIds = [...new Set(categoryIds)];

    await this.prisma.$transaction([
      this.prisma.agentCategory.deleteMany({ where: { userId } }),
      this.prisma.agentCategory.createMany({
        data: uniqueCategoryIds.map((categoryId) => ({ userId, categoryId })),
      }),
    ]);
  }

  async listCategoryIdsForUsers(userIds: string[]): Promise<Map<string, string[]>> {
    const rows = await this.prisma.agentCategory.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, categoryId: true },
    });

    const byUserId = new Map<string, string[]>();
    for (const row of rows) {
      const existing = byUserId.get(row.userId);
      if (existing) {
        existing.push(row.categoryId);
      } else {
        byUserId.set(row.userId, [row.categoryId]);
      }
    }
    return byUserId;
  }
}

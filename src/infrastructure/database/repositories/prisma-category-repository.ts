import { Category as PrismaCategory, PrismaClient } from '@prisma/client';
import { Category } from '../../../domain/entities/category.entity';
import {
  CategoryRepository,
  CreateCategoryData,
  UpdateCategoryData,
} from '../../../domain/repositories/category-repository';

const toDomain = (category: PrismaCategory): Category => ({
  id: category.id,
  name: category.name,
  active: category.active,
  createdAt: category.createdAt,
  updatedAt: category.updatedAt,
});

export class PrismaCategoryRepository implements CategoryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Category | null> {
    const category = await this.prisma.category.findUnique({ where: { id } });
    return category ? toDomain(category) : null;
  }

  async list(): Promise<Category[]> {
    const categories = await this.prisma.category.findMany({ orderBy: { name: 'asc' } });
    return categories.map(toDomain);
  }

  async create(data: CreateCategoryData): Promise<Category> {
    const category = await this.prisma.category.create({
      data: { name: data.name, active: data.active ?? true },
    });

    return toDomain(category);
  }

  async update(id: string, data: UpdateCategoryData): Promise<Category> {
    const category = await this.prisma.category.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.active !== undefined ? { active: data.active } : {}),
      },
    });

    return toDomain(category);
  }
}

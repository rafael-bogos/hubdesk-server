import { Category } from '../../../../domain/entities/category.entity';
import { AuditLogger } from '../../../../domain/ports/audit-logger';
import { CategoryRepository } from '../../../../domain/repositories/category-repository';
import { CreateCategoryInput } from '../../../dtos/admin.dto';

export class CreateCategoryUseCase {
  constructor(
    private readonly categoryRepository: CategoryRepository,
    private readonly auditLogger: AuditLogger,
  ) {}

  async execute(input: CreateCategoryInput, actorId: string): Promise<Category> {
    const category = await this.categoryRepository.create({ name: input.name, active: input.active });

    await this.auditLogger.record({
      actorId,
      action: 'CREATE_CATEGORY',
      entity: 'Category',
      entityId: category.id,
      metadata: { name: category.name },
    });

    return category;
  }
}

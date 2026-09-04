import { Category } from '../../../../domain/entities/category.entity';
import { CategoryNotFoundError } from '../../../../domain/errors/category-errors';
import { AuditLogger } from '../../../../domain/ports/audit-logger';
import { CategoryRepository } from '../../../../domain/repositories/category-repository';
import { UpdateCategoryInput } from '../../../dtos/admin.dto';

export class UpdateCategoryUseCase {
  constructor(
    private readonly categoryRepository: CategoryRepository,
    private readonly auditLogger: AuditLogger,
  ) {}

  async execute(id: string, input: UpdateCategoryInput, actorId: string): Promise<Category> {
    const existingCategory = await this.categoryRepository.findById(id);

    if (!existingCategory) {
      throw new CategoryNotFoundError();
    }

    const category = await this.categoryRepository.update(id, { name: input.name, active: input.active });

    await this.auditLogger.record({
      actorId,
      action: 'UPDATE_CATEGORY',
      entity: 'Category',
      entityId: id,
      metadata: { name: category.name, active: category.active },
    });

    return category;
  }
}

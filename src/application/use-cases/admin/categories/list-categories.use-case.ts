import { Category } from '../../../../domain/entities/category.entity';
import { CategoryRepository } from '../../../../domain/repositories/category-repository';

export class ListCategoriesUseCase {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async execute(): Promise<Category[]> {
    return this.categoryRepository.list();
  }
}

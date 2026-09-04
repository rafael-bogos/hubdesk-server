import { Category } from '../../../domain/entities/category.entity';
import { CategoryRepository } from '../../../domain/repositories/category-repository';

export class ListActiveCategoriesUseCase {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async execute(): Promise<Category[]> {
    const categories = await this.categoryRepository.list();
    return categories.filter((category) => category.active);
  }
}

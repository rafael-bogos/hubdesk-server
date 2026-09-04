import { Category } from '../entities/category.entity';

export interface CreateCategoryData {
  name: string;
  active?: boolean;
}

export interface UpdateCategoryData {
  name?: string;
  active?: boolean;
}

export interface CategoryRepository {
  findById(id: string): Promise<Category | null>;
  list(): Promise<Category[]>;
  create(data: CreateCategoryData): Promise<Category>;
  update(id: string, data: UpdateCategoryData): Promise<Category>;
}

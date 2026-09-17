import { User } from '../../../../domain/entities/user.entity';
import { AgentCategoryRepository } from '../../../../domain/repositories/agent-category-repository';
import { UserRepository } from '../../../../domain/repositories/user-repository';
import { ListUsersInput } from '../../../dtos/admin.dto';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export interface ListUsersOutput {
  items: Array<{ user: User; categoryIds: string[] }>;
  total: number;
  page: number;
  pageSize: number;
}

export class ListUsersUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly agentCategoryRepository: AgentCategoryRepository,
  ) {}

  async execute(input: ListUsersInput): Promise<ListUsersOutput> {
    const page = input.page && input.page > 0 ? input.page : DEFAULT_PAGE;
    const pageSize =
      input.pageSize && input.pageSize > 0 ? Math.min(input.pageSize, MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE;

    const result = await this.userRepository.list({ role: input.role, active: input.active, page, pageSize });

    // Busca em lote (não N+1) — uma query só pra todos os usuários da página.
    const categoryIdsByUser = await this.agentCategoryRepository.listCategoryIdsForUsers(
      result.items.map((user) => user.id),
    );

    return {
      items: result.items.map((user) => ({ user, categoryIds: categoryIdsByUser.get(user.id) ?? [] })),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    };
  }
}

import { ListUsersResult, UserRepository } from '../../../../domain/repositories/user-repository';
import { ListUsersInput } from '../../../dtos/admin.dto';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export class ListUsersUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(input: ListUsersInput): Promise<ListUsersResult> {
    const page = input.page && input.page > 0 ? input.page : DEFAULT_PAGE;
    const pageSize =
      input.pageSize && input.pageSize > 0 ? Math.min(input.pageSize, MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE;

    return this.userRepository.list({ role: input.role, active: input.active, page, pageSize });
  }
}

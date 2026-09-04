import { User } from '../../../domain/entities/user.entity';
import { UserRepository } from '../../../domain/repositories/user-repository';

export class ListAgentsUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(): Promise<User[]> {
    const { items } = await this.userRepository.list({
      role: ['AGENT', 'ADMIN'],
      active: true,
      page: 1,
      pageSize: 100,
    });

    return items;
  }
}

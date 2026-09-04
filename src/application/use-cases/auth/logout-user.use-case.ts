import { UserRepository } from '../../../domain/repositories/user-repository';
import { LogoutInput } from '../../dtos/auth.dto';

export class LogoutUserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(input: LogoutInput): Promise<void> {
    await this.userRepository.incrementTokenVersion(input.userId);
  }
}

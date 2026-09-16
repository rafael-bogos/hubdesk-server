import { User } from '../../../domain/entities/user.entity';
import { UserNotFoundError } from '../../../domain/errors/auth-errors';
import { UserRepository } from '../../../domain/repositories/user-repository';

export interface UpdateNotificationPreferencesInput {
  emailOnTicketUpdated?: boolean;
  emailOnTicketClosed?: boolean;
}

export class UpdateNotificationPreferencesUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(userId: string, input: UpdateNotificationPreferencesInput): Promise<User> {
    const existingUser = await this.userRepository.findById(userId);

    if (!existingUser) {
      throw new UserNotFoundError();
    }

    return this.userRepository.update(userId, {
      emailOnTicketUpdated: input.emailOnTicketUpdated,
      emailOnTicketClosed: input.emailOnTicketClosed,
    });
  }
}

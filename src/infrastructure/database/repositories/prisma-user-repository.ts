import { Prisma, PrismaClient, Role as PrismaRole, User as PrismaUser } from '@prisma/client';
import { Role, User } from '../../../domain/entities/user.entity';
import { CreateUserData, ListUsersFilters, ListUsersResult, UserRepository } from '../../../domain/repositories/user-repository';

const toDomain = (user: PrismaUser): User => ({
  id: user.id,
  name: user.name,
  email: user.email,
  passwordHash: user.passwordHash,
  role: user.role as Role,
  tokenVersion: user.tokenVersion,
  active: user.active,
  emailOnTicketUpdated: user.emailOnTicketUpdated,
  emailOnTicketClosed: user.emailOnTicketClosed,
  emailOnSlaWarning: user.emailOnSlaWarning,
  avatarPath: user.avatarPath,
  avatarMimeType: user.avatarMimeType,
  image: user.image,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? toDomain(user) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    return user ? toDomain(user) : null;
  }

  async create(data: CreateUserData): Promise<User> {
    const user = await this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash: data.passwordHash,
        role: (data.role ?? 'CUSTOMER') as PrismaRole,
      },
    });

    return toDomain(user);
  }

  async update(id: string, data: Partial<Omit<User, 'id'>>): Promise<User> {
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.email !== undefined ? { email: data.email } : {}),
        ...(data.passwordHash !== undefined ? { passwordHash: data.passwordHash } : {}),
        ...(data.role !== undefined ? { role: data.role as PrismaRole } : {}),
        ...(data.active !== undefined ? { active: data.active } : {}),
        ...(data.tokenVersion !== undefined ? { tokenVersion: data.tokenVersion } : {}),
        ...(data.emailOnTicketUpdated !== undefined
          ? { emailOnTicketUpdated: data.emailOnTicketUpdated }
          : {}),
        ...(data.emailOnTicketClosed !== undefined
          ? { emailOnTicketClosed: data.emailOnTicketClosed }
          : {}),
        ...(data.emailOnSlaWarning !== undefined ? { emailOnSlaWarning: data.emailOnSlaWarning } : {}),
        ...(data.avatarPath !== undefined ? { avatarPath: data.avatarPath } : {}),
        ...(data.avatarMimeType !== undefined ? { avatarMimeType: data.avatarMimeType } : {}),
        ...(data.image !== undefined ? { image: data.image } : {}),
      },
    });

    return toDomain(user);
  }

  async incrementTokenVersion(id: string): Promise<User> {
    const user = await this.prisma.user.update({
      where: { id },
      data: { tokenVersion: { increment: 1 } },
    });

    return toDomain(user);
  }

  async list(filters: ListUsersFilters): Promise<ListUsersResult> {
    const where: Prisma.UserWhereInput = {
      ...(filters.role
        ? { role: Array.isArray(filters.role) ? { in: filters.role as PrismaRole[] } : (filters.role as PrismaRole) }
        : {}),
      ...(filters.active !== undefined ? { active: filters.active } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items: items.map(toDomain), total, page: filters.page, pageSize: filters.pageSize };
  }
}

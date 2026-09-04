import { PrismaClient, Role as PrismaRole, User as PrismaUser } from '@prisma/client';
import { Role, User } from '../../../domain/entities/user.entity';
import { CreateUserData, UserRepository } from '../../../domain/repositories/user-repository';

const toDomain = (user: PrismaUser): User => ({
  id: user.id,
  name: user.name,
  email: user.email,
  passwordHash: user.passwordHash,
  role: user.role as Role,
  tokenVersion: user.tokenVersion,
  active: user.active,
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
}

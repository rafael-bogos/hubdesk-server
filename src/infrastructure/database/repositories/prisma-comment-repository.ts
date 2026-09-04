import { Comment as PrismaComment, PrismaClient } from '@prisma/client';
import { Comment } from '../../../domain/entities/comment.entity';
import { CommentRepository, CreateCommentData } from '../../../domain/repositories/comment-repository';

const toDomain = (comment: PrismaComment): Comment => ({
  id: comment.id,
  ticketId: comment.ticketId,
  authorId: comment.authorId,
  body: comment.body,
  isInternal: comment.isInternal,
  createdAt: comment.createdAt,
});

export class PrismaCommentRepository implements CommentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateCommentData): Promise<Comment> {
    const comment = await this.prisma.comment.create({
      data: {
        ticketId: data.ticketId,
        authorId: data.authorId,
        body: data.body,
        isInternal: data.isInternal,
      },
    });

    return toDomain(comment);
  }

  async listByTicketId(ticketId: string): Promise<Comment[]> {
    const comments = await this.prisma.comment.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'asc' },
    });

    return comments.map(toDomain);
  }
}

import { Comment } from '../entities/comment.entity';

export interface CreateCommentData {
  ticketId: string;
  authorId: string;
  body: string;
  isInternal: boolean;
}

export interface CommentRepository {
  create(data: CreateCommentData): Promise<Comment>;
  listByTicketId(ticketId: string): Promise<Comment[]>;
  findById(id: string): Promise<Comment | null>;
  updateIsInternal(id: string, isInternal: boolean): Promise<Comment>;
}

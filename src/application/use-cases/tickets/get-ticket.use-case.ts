import { Attachment } from '../../../domain/entities/attachment.entity';
import { Comment } from '../../../domain/entities/comment.entity';
import { Ticket } from '../../../domain/entities/ticket.entity';
import { TicketNotFoundError } from '../../../domain/errors/ticket-errors';
import { AttachmentRepository } from '../../../domain/repositories/attachment-repository';
import { CommentRepository } from '../../../domain/repositories/comment-repository';
import { TicketRepository } from '../../../domain/repositories/ticket-repository';
import { Actor } from '../../dtos/ticket.dto';
import { assertCanViewTicket } from './ticket-access';

export interface GetTicketOutput {
  ticket: Ticket;
  comments: Comment[];
  attachments: Attachment[];
}

export class GetTicketUseCase {
  constructor(
    private readonly ticketRepository: TicketRepository,
    private readonly commentRepository: CommentRepository,
    private readonly attachmentRepository: AttachmentRepository,
  ) {}

  async execute(ticketId: string, actor: Actor): Promise<GetTicketOutput> {
    const ticket = await this.ticketRepository.findById(ticketId);

    if (!ticket) {
      throw new TicketNotFoundError();
    }

    assertCanViewTicket(actor, ticket);

    const [comments, attachments] = await Promise.all([
      this.commentRepository.listByTicketId(ticketId),
      this.attachmentRepository.listByTicketId(ticketId),
    ]);

    const visibleComments =
      actor.role === 'CUSTOMER' ? comments.filter((comment) => !comment.isInternal) : comments;

    return { ticket, comments: visibleComments, attachments };
  }
}

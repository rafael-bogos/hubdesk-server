import { Attachment } from '../../../domain/entities/attachment.entity';
import { Comment } from '../../../domain/entities/comment.entity';
import { TicketNotFoundError } from '../../../domain/errors/ticket-errors';
import { AttachmentRepository } from '../../../domain/repositories/attachment-repository';
import { CategoryRepository } from '../../../domain/repositories/category-repository';
import { CommentRepository } from '../../../domain/repositories/comment-repository';
import { TicketRepository } from '../../../domain/repositories/ticket-repository';
import { UserRepository } from '../../../domain/repositories/user-repository';
import { Actor } from '../../dtos/ticket.dto';
import { assertCanViewTicket } from './ticket-access';
import { EnrichedTicket, enrichTicket } from './ticket-presenter';

export interface GetTicketOutput {
  ticket: EnrichedTicket;
  comments: Comment[];
  attachments: Attachment[];
}

export class GetTicketUseCase {
  constructor(
    private readonly ticketRepository: TicketRepository,
    private readonly commentRepository: CommentRepository,
    private readonly attachmentRepository: AttachmentRepository,
    private readonly userRepository: UserRepository,
    private readonly categoryRepository: CategoryRepository,
  ) {}

  async execute(ticketId: string, actor: Actor): Promise<GetTicketOutput> {
    const ticket = await this.ticketRepository.findById(ticketId);

    if (!ticket) {
      throw new TicketNotFoundError();
    }

    assertCanViewTicket(actor, ticket);

    const [comments, attachments, enrichedTicket] = await Promise.all([
      this.commentRepository.listByTicketId(ticketId),
      this.attachmentRepository.listByTicketId(ticketId),
      enrichTicket(ticket, this.userRepository, this.categoryRepository),
    ]);

    const visibleComments =
      actor.role === 'CUSTOMER' ? comments.filter((comment) => !comment.isInternal) : comments;
    const visibleAttachments =
      actor.role === 'CUSTOMER' ? attachments.filter((attachment) => !attachment.isInternal) : attachments;

    return { ticket: enrichedTicket, comments: visibleComments, attachments: visibleAttachments };
  }
}

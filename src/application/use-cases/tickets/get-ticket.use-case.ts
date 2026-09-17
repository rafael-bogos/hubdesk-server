import { Attachment } from '../../../domain/entities/attachment.entity';
import { Comment } from '../../../domain/entities/comment.entity';
import { AttachmentRepository } from '../../../domain/repositories/attachment-repository';
import { CategoryRepository } from '../../../domain/repositories/category-repository';
import { CommentRepository } from '../../../domain/repositories/comment-repository';
import { SlaSettingsRepository } from '../../../domain/repositories/sla-settings-repository';
import { TicketRepository } from '../../../domain/repositories/ticket-repository';
import { UserRepository } from '../../../domain/repositories/user-repository';
import { Actor } from '../../dtos/ticket.dto';
import { assertCanViewTicket, resolveTicketByNumber } from './ticket-access';
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
    private readonly slaSettingsRepository: SlaSettingsRepository,
  ) {}

  async execute(ticketIdParam: string, actor: Actor): Promise<GetTicketOutput> {
    const ticket = await resolveTicketByNumber(this.ticketRepository, ticketIdParam);

    assertCanViewTicket(actor, ticket);

    const [comments, attachments, slaSettings] = await Promise.all([
      this.commentRepository.listByTicketId(ticket.id),
      this.attachmentRepository.listByTicketId(ticket.id),
      this.slaSettingsRepository.get(),
    ]);
    const enrichedTicket = await enrichTicket(ticket, this.userRepository, this.categoryRepository, slaSettings);

    const visibleComments =
      actor.role === 'CUSTOMER' ? comments.filter((comment) => !comment.isInternal) : comments;
    const visibleAttachments =
      actor.role === 'CUSTOMER' ? attachments.filter((attachment) => !attachment.isInternal) : attachments;

    return { ticket: enrichedTicket, comments: visibleComments, attachments: visibleAttachments };
  }
}

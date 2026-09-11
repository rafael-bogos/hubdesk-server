import { Attachment } from '../../../domain/entities/attachment.entity';
import { ForbiddenError } from '../../../domain/errors/auth-errors';
import { AttachmentNotFoundError } from '../../../domain/errors/ticket-errors';
import { AttachmentRepository } from '../../../domain/repositories/attachment-repository';
import { TicketRepository } from '../../../domain/repositories/ticket-repository';
import { Actor, UpdateAttachmentInternalInput } from '../../dtos/ticket.dto';
import { assertCanViewTicket, resolveTicketByNumber } from './ticket-access';

export class UpdateAttachmentInternalUseCase {
  constructor(
    private readonly ticketRepository: TicketRepository,
    private readonly attachmentRepository: AttachmentRepository,
  ) {}

  async execute(
    ticketIdParam: string,
    attachmentId: string,
    input: UpdateAttachmentInternalInput,
    actor: Actor,
  ): Promise<Attachment> {
    if (actor.role === 'CUSTOMER') {
      throw new ForbiddenError();
    }

    const ticket = await resolveTicketByNumber(this.ticketRepository, ticketIdParam);

    assertCanViewTicket(actor, ticket);

    const attachment = await this.attachmentRepository.findById(attachmentId);
    if (!attachment || attachment.ticketId !== ticket.id) {
      throw new AttachmentNotFoundError();
    }

    // Agentes/admins só podem alterar a visibilidade de arquivos que eles mesmos enviaram.
    if (attachment.uploadedById !== actor.userId) {
      throw new ForbiddenError();
    }

    return this.attachmentRepository.updateIsInternal(attachmentId, input.isInternal);
  }
}

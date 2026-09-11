import { FileStorage } from '../../../domain/ports/file-storage';
import { AttachmentNotFoundError } from '../../../domain/errors/ticket-errors';
import { AttachmentRepository } from '../../../domain/repositories/attachment-repository';
import { TicketRepository } from '../../../domain/repositories/ticket-repository';
import { Actor } from '../../dtos/ticket.dto';
import { assertCanViewTicket, resolveTicketByNumber } from './ticket-access';

export interface DownloadAttachmentOutput {
  filename: string;
  mimeType: string;
  buffer: Buffer;
}

export class DownloadAttachmentUseCase {
  constructor(
    private readonly ticketRepository: TicketRepository,
    private readonly attachmentRepository: AttachmentRepository,
    private readonly fileStorage: FileStorage,
  ) {}

  async execute(ticketIdParam: string, attachmentId: string, actor: Actor): Promise<DownloadAttachmentOutput> {
    const ticket = await resolveTicketByNumber(this.ticketRepository, ticketIdParam);

    assertCanViewTicket(actor, ticket);

    const attachment = await this.attachmentRepository.findById(attachmentId);

    if (!attachment || attachment.ticketId !== ticket.id) {
      throw new AttachmentNotFoundError();
    }

    // Mascara anexos internos de customers como "não encontrado", igual ao
    // tratamento de comentários internos e de chamados fora da visibilidade do actor.
    if (attachment.isInternal && actor.role === 'CUSTOMER') {
      throw new AttachmentNotFoundError();
    }

    const buffer = await this.fileStorage.read(attachment.path);

    return { filename: attachment.filename, mimeType: attachment.mimeType, buffer };
  }
}

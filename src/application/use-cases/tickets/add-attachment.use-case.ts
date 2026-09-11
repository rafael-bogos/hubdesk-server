import { Attachment } from '../../../domain/entities/attachment.entity';
import { TicketNotFoundError } from '../../../domain/errors/ticket-errors';
import { FileStorage } from '../../../domain/ports/file-storage';
import { AttachmentRepository } from '../../../domain/repositories/attachment-repository';
import { CommentRepository } from '../../../domain/repositories/comment-repository';
import { TicketRepository } from '../../../domain/repositories/ticket-repository';
import { Actor, AddAttachmentInput } from '../../dtos/ticket.dto';
import { assertCanViewTicket } from './ticket-access';

export class AddAttachmentUseCase {
  constructor(
    private readonly ticketRepository: TicketRepository,
    private readonly attachmentRepository: AttachmentRepository,
    private readonly fileStorage: FileStorage,
    private readonly commentRepository: CommentRepository,
  ) {}

  async execute(ticketId: string, input: AddAttachmentInput, actor: Actor): Promise<Attachment> {
    const ticket = await this.ticketRepository.findById(ticketId);

    if (!ticket) {
      throw new TicketNotFoundError();
    }

    assertCanViewTicket(actor, ticket);

    const isInternal = await this.resolveIsInternal(input, actor);

    const saved = await this.fileStorage.save({
      originalName: input.originalName,
      mimeType: input.mimeType,
      buffer: input.buffer,
    });

    return this.attachmentRepository.create({
      ticketId,
      commentId: input.commentId,
      filename: saved.filename,
      path: saved.path,
      mimeType: input.mimeType,
      size: input.buffer.length,
      uploadedById: actor.userId,
      isInternal,
    });
  }

  // Customer nunca pode enviar anexo interno. Agent/admin: respeita o valor
  // explícito enviado; se não vier, herda do comentário ao qual o anexo está
  // vinculado (mesma mensagem = mesma visibilidade), senão assume público.
  private async resolveIsInternal(input: AddAttachmentInput, actor: Actor): Promise<boolean> {
    if (actor.role === 'CUSTOMER') {
      return false;
    }

    if (input.isInternal !== undefined) {
      return input.isInternal;
    }

    if (input.commentId) {
      const comment = await this.commentRepository.findById(input.commentId);
      if (comment) {
        return comment.isInternal;
      }
    }

    return false;
  }
}

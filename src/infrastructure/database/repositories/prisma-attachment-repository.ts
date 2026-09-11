import { Attachment as PrismaAttachment, PrismaClient } from '@prisma/client';
import { Attachment } from '../../../domain/entities/attachment.entity';
import {
  AttachmentRepository,
  CreateAttachmentData,
} from '../../../domain/repositories/attachment-repository';

const toDomain = (attachment: PrismaAttachment): Attachment => ({
  id: attachment.id,
  ticketId: attachment.ticketId,
  commentId: attachment.commentId,
  filename: attachment.filename,
  path: attachment.path,
  mimeType: attachment.mimeType,
  size: attachment.size,
  uploadedById: attachment.uploadedById,
  isInternal: attachment.isInternal,
  createdAt: attachment.createdAt,
});

export class PrismaAttachmentRepository implements AttachmentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateAttachmentData): Promise<Attachment> {
    const attachment = await this.prisma.attachment.create({
      data: {
        ticketId: data.ticketId,
        commentId: data.commentId ?? undefined,
        filename: data.filename,
        path: data.path,
        mimeType: data.mimeType,
        size: data.size,
        uploadedById: data.uploadedById,
        isInternal: data.isInternal,
      },
    });

    return toDomain(attachment);
  }

  async listByTicketId(ticketId: string): Promise<Attachment[]> {
    const attachments = await this.prisma.attachment.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'asc' },
    });

    return attachments.map(toDomain);
  }

  async findById(id: string): Promise<Attachment | null> {
    const attachment = await this.prisma.attachment.findUnique({ where: { id } });
    return attachment ? toDomain(attachment) : null;
  }

  async updateIsInternal(id: string, isInternal: boolean): Promise<Attachment> {
    const attachment = await this.prisma.attachment.update({ where: { id }, data: { isInternal } });
    return toDomain(attachment);
  }
}

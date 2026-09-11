import { Attachment } from '../entities/attachment.entity';

export interface CreateAttachmentData {
  ticketId: string;
  commentId?: string | null;
  filename: string;
  path: string;
  mimeType: string;
  size: number;
  uploadedById: string;
  isInternal: boolean;
}

export interface AttachmentRepository {
  create(data: CreateAttachmentData): Promise<Attachment>;
  listByTicketId(ticketId: string): Promise<Attachment[]>;
  findById(id: string): Promise<Attachment | null>;
  updateIsInternal(id: string, isInternal: boolean): Promise<Attachment>;
}

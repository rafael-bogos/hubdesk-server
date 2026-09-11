export interface Attachment {
  id: string;
  ticketId: string;
  commentId: string | null;
  filename: string;
  path: string;
  mimeType: string;
  size: number;
  uploadedById: string;
  isInternal: boolean;
  createdAt: Date;
}

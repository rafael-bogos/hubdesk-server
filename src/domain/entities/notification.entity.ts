export type NotificationType = 'TICKET_CREATED' | 'TICKET_UPDATED' | 'SLA_WARNING';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  ticketId: string;
  ticketNumber: number;
  read: boolean;
  createdAt: Date;
}

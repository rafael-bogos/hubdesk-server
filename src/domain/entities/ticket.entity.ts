export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING' | 'RESOLVED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface Ticket {
  id: string;
  number: number;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  requesterId: string;
  assigneeIds: string[];
  categoryId: string | null;
  createdAt: Date;
  updatedAt: Date;
  closedAt: Date | null;
}

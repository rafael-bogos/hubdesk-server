export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING' | 'PENDING_CLOSURE' | 'RESOLVED';
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
  // Só não-null enquanto status === 'PENDING_CLOSURE' — ver TicketClosureScheduler.
  scheduledClosureAt: Date | null;
}

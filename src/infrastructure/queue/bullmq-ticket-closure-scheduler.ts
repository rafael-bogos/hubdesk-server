import { Queue } from 'bullmq';
import { TicketClosureScheduler } from '../../domain/ports/ticket-closure-scheduler';
import { TicketClosureJobData, ticketClosureJobId } from './ticket-closure-queue';

export class BullmqTicketClosureScheduler implements TicketClosureScheduler {
  constructor(private readonly queue: Queue<TicketClosureJobData>) {}

  async schedule(ticketId: string, runAt: Date): Promise<void> {
    // Reagendar (nova data escolhida antes da anterior vencer) é remover o
    // job antigo e criar outro — BullMQ não tem "update delay" num job já
    // enfileirado.
    await this.cancel(ticketId);

    await this.queue.add(
      'close-ticket',
      { ticketId },
      {
        jobId: ticketClosureJobId(ticketId),
        delay: Math.max(0, runAt.getTime() - Date.now()),
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
  }

  async cancel(ticketId: string): Promise<void> {
    const job = await this.queue.getJob(ticketClosureJobId(ticketId));
    await job?.remove();
  }
}

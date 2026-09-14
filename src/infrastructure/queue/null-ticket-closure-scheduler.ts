import { TicketClosureScheduler } from '../../domain/ports/ticket-closure-scheduler';

// Usado quando não há Redis configurado (ex: testes) — PENDING_CLOSURE ainda
// funciona normalmente (o status e a data ficam salvos no chamado), só não
// existe o job de fundo que fecharia ele sozinho.
export class NullTicketClosureScheduler implements TicketClosureScheduler {
  async schedule(): Promise<void> {
    // no-op
  }

  async cancel(): Promise<void> {
    // no-op
  }
}

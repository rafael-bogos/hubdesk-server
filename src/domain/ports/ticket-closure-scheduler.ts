// Agenda/cancela o fechamento automático de um chamado que entrou em
// PENDING_CLOSURE. Implementado com BullMQ em produção (ver
// infrastructure/queue/bullmq-ticket-closure-scheduler.ts); testes e
// contextos sem Redis usam NullTicketClosureScheduler.
export interface TicketClosureScheduler {
  // Idempotente: chamar de novo pro mesmo ticketId substitui o agendamento
  // anterior (ex: usuário troca a data/hora antes do prazo antigo vencer).
  schedule(ticketId: string, runAt: Date): Promise<void>;

  // Idempotente: não faz nada se não houver agendamento pendente.
  cancel(ticketId: string): Promise<void>;
}

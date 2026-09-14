// Nome compartilhado entre quem agenda (BullmqTicketClosureScheduler) e quem
// processa (createTicketClosureWorker) — precisa ser o mesmo dos dois lados
// pra apontar pra fila certa.
export const TICKET_CLOSURE_QUEUE = 'ticket-closure';

export interface TicketClosureJobData {
  ticketId: string;
}

// Um job por chamado, sempre com o mesmo id determinístico — assim reagendar
// (nova data) ou cancelar é só adicionar/remover o job com esse id, sem
// precisar guardar o id do job em lugar nenhum (nem no banco). BullMQ proíbe
// ":" em ids customizados, por isso o separador é "-".
export const ticketClosureJobId = (ticketId: string): string => `ticket-closure-${ticketId}`;

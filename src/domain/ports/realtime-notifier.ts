import { Notification } from '../entities/notification.entity';

export interface RealtimeNotifier {
  // Best-effort: nunca deve derrubar a ação que gerou a notificação, por isso
  // não é async/awaited pelos use cases. A notificação já está persistida
  // quando isso é chamado — isso só entrega ela em tempo real pra quem
  // estiver com a tela aberta.
  pushNotification(notification: Notification): void;

  // Aviso leve de "chegou mensagem nova nesse chamado" — sem persistência,
  // só pra quem estiver com a conversa aberta atualizar na hora.
  pushTicketMessage(userId: string, ticketNumber: number): void;
}

import { Notification } from '../entities/notification.entity';

export interface RealtimeNotifier {
  // Best-effort: nunca deve derrubar a ação que gerou a notificação, por isso
  // não é async/awaited pelos use cases. A notificação já está persistida
  // quando isso é chamado — isso só entrega ela em tempo real pra quem
  // estiver com a tela aberta.
  pushNotification(notification: Notification): void;
}

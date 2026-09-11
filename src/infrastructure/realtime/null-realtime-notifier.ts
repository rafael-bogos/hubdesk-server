import { RealtimeNotifier } from '../../domain/ports/realtime-notifier';

// Usado quando não há servidor Socket.io rodando (ex: testes) — a
// notificação continua sendo persistida normalmente, só não é empurrada em
// tempo real pra ninguém.
export class NullRealtimeNotifier implements RealtimeNotifier {
  pushNotification(): void {
    // no-op
  }

  pushTicketMessage(): void {
    // no-op
  }
}

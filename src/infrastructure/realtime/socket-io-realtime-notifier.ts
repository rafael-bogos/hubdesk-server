import { Notification } from '../../domain/entities/notification.entity';
import { RealtimeNotifier } from '../../domain/ports/realtime-notifier';
import { AppSocketServer, userRoom } from './socket-server';

export class SocketIoRealtimeNotifier implements RealtimeNotifier {
  constructor(private readonly io: AppSocketServer) {}

  pushNotification(notification: Notification): void {
    this.io.to(userRoom(notification.userId)).emit('notification:new', notification);
  }
}

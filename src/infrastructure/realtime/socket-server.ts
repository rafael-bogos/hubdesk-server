import { Server } from 'socket.io';
import { Role } from '../../domain/entities/user.entity';
import { Notification } from '../../domain/entities/notification.entity';
import { TokenService } from '../../domain/ports/token-service';
import { UserRepository } from '../../domain/repositories/user-repository';
import { env } from '../../main/config/env';

interface ServerToClientEvents {
  'notification:new': (notification: Notification) => void;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- nenhum evento cliente->servidor por enquanto
interface ClientToServerEvents {}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- sem estado compartilhado entre instâncias do servidor
interface InterServerEvents {}

interface SocketData {
  user: { userId: string; role: Role };
}

export type AppSocketServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

// Quem deve ver o quê já foi decidido antes de chegar aqui (ver
// ticket-notification-service.ts, que resolve os destinatários e persiste
// uma notificação por pessoa) — aqui só precisa de uma sala por usuário pra
// entregar em tempo real pra quem estiver conectado.
export const userRoom = (userId: string) => `user:${userId}`;

// Recebe o `io` sem servidor HTTP anexado ainda de propósito — `io.attach()`
// só funciona corretamente (multiplexando com o Express na mesma porta) se o
// Express já estiver registrado como request listener do http.Server no
// momento do attach. Ver server.ts pra ordem certa.
export const createSocketServer = (deps: {
  userRepository: UserRepository;
  tokenService: TokenService;
}): AppSocketServer => {
  const io: AppSocketServer = new Server({
    cors: { origin: env.clientUrl },
  });

  // Mesma verificação de authenticate.ts (token válido + usuário ativo +
  // tokenVersion batendo), só que lida no handshake em vez de por request.
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token || typeof token !== 'string') {
        return next(new Error('Token de acesso não fornecido'));
      }

      const decoded = deps.tokenService.verifyAccessToken(token);
      const user = await deps.userRepository.findById(decoded.userId);

      if (!user || !user.active || user.tokenVersion !== decoded.tokenVersion) {
        return next(new Error('Token inválido ou expirado'));
      }

      socket.data.user = { userId: user.id, role: user.role };
      next();
    } catch {
      next(new Error('Token inválido ou expirado'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(userRoom(socket.data.user.userId));
  });

  return io;
};

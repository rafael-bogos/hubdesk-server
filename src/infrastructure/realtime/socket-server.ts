import { Server } from 'socket.io';
import { Role } from '../../domain/entities/user.entity';
import { TokenService } from '../../domain/ports/token-service';
import { TicketCreatedEvent } from '../../domain/ports/ticket-notifier';
import { UserRepository } from '../../domain/repositories/user-repository';
import { env } from '../../main/config/env';

interface ServerToClientEvents {
  'ticket:created': (event: TicketCreatedEvent) => void;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- nenhum evento cliente->servidor por enquanto
interface ClientToServerEvents {}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- sem estado compartilhado entre instâncias do servidor
interface InterServerEvents {}

interface SocketData {
  user: { userId: string; role: Role };
}

export type AppSocketServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

// Sala com todo agent/admin conectado — é pra onde vão as notificações de
// chamado novo (só eles podem ver chamados sem responsável).
export const AGENTS_ROOM = 'agents';

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
    if (socket.data.user.role === 'AGENT' || socket.data.user.role === 'ADMIN') {
      socket.join(AGENTS_ROOM);
    }
  });

  return io;
};

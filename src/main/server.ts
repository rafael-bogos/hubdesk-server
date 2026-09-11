import { createServer } from 'node:http';
import { createApp } from './app';
import { env } from './config/env';
import { logger } from '../infrastructure/logging/logger';
import { JwtTokenService } from '../infrastructure/auth/jwt-token-service';
import { prisma } from '../infrastructure/database/prisma/client';
import { PrismaUserRepository } from '../infrastructure/database/repositories/prisma-user-repository';
import { createSocketServer } from '../infrastructure/realtime/socket-server';

// `io` é criado sem servidor HTTP ainda (só pra já existir e poder ser
// injetado no app/use cases), o Express é anexado ao http.Server primeiro, e
// só then `io.attach(httpServer)` — nessa ordem o socket.io consegue capturar
// o Express como listener pré-existente e multiplexar os dois na mesma porta
// sem conflito (na ordem invertida, os dois brigam pelo mesmo request/response).
const io = createSocketServer({
  userRepository: new PrismaUserRepository(prisma),
  tokenService: new JwtTokenService({
    secret: env.jwtSecret,
    accessExpiresIn: env.jwtAccessExpiresIn,
    refreshExpiresIn: env.jwtRefreshExpiresIn,
  }),
});

const app = createApp({ io });
const httpServer = createServer(app);
io.attach(httpServer);

httpServer.listen(env.port, () => {
  logger.info(`hubdesk-server ouvindo na porta ${env.port}`);
});

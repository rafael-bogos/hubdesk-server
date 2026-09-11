export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3001),
  databaseUrl: process.env.DATABASE_URL ?? '',
  jwtSecret: process.env.JWT_SECRET ?? '',
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  uploadsDir: process.env.UPLOADS_DIR ?? 'uploads',
  // Origem do frontend, liberada no CORS do Socket.io (o navegador conecta
  // direto nesse servidor pra receber notificações em tempo real).
  clientUrl: process.env.CLIENT_URL ?? 'http://localhost:3000',
};

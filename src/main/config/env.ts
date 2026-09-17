export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3001),
  databaseUrl: process.env.DATABASE_URL ?? '',
  jwtSecret: process.env.JWT_SECRET ?? '',
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  uploadsDir: process.env.UPLOADS_DIR ?? 'uploads',
  // Redis usado pela fila do BullMQ (fechamento automático de chamados
  // PENDING_CLOSURE) — ver infrastructure/queue.
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6381',
  // Origem do frontend, liberada no CORS do Socket.io (o navegador conecta
  // direto nesse servidor pra receber notificações em tempo real).
  clientUrl: process.env.CLIENT_URL ?? 'http://localhost:3000',
  // URL pública deste servidor — usada pra montar as callback URLs do OAuth
  // (Google precisa saber pra onde redirecionar de volta).
  backendPublicUrl: process.env.BACKEND_PUBLIC_URL ?? 'http://localhost:3001',
  // Segredo próprio do better-auth (assina a sessão dele) — separado do
  // JWT_SECRET pra não misturar os dois mecanismos de auth.
  betterAuthSecret: process.env.BETTER_AUTH_SECRET ?? '',
  // Chave (32 bytes em base64) pra cifrar client secrets de OAuth salvos no
  // banco (ver infrastructure/crypto/secret-cipher.ts).
  settingsEncryptionKey: process.env.SETTINGS_ENCRYPTION_KEY ?? '',
  // E-mail transacional via Resend (ver infrastructure/email). Sem chave, o
  // app usa um EmailSender nulo — só loga, não falha nem envia nada de
  // verdade (ver infrastructure/email/make-email-sender.ts).
  resendApiKey: process.env.RESEND_API_KEY ?? '',
  emailFrom: process.env.EMAIL_FROM ?? 'Hubdesk <onboarding@resend.dev>',
  // Logo usada no cabeçalho do e-mail transacional — URL pública (hoje um
  // bucket R2 da Cloudflare). Vazio = e-mail sai sem logo (só o texto
  // "Hubdesk"), em vez de referenciar uma URL quebrada.
  emailLogoUrl: process.env.EMAIL_LOGO_URL ?? '',
  // Armazenamento de arquivo (anexos de chamado, logo do OAuth customizado)
  // via R2 da Cloudflare (compatível com S3, ver infrastructure/storage).
  // Faltando qualquer uma dessas 4 variáveis, cai pro disco local
  // (LocalFileStorage) — ver infrastructure/storage/make-file-storage.ts.
  r2AccountId: process.env.R2_ACCOUNT_ID ?? '',
  r2AccessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
  r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
  r2BucketName: process.env.R2_BUCKET_NAME ?? '',
};

import { EmailSender, SendEmailInput } from '../../domain/ports/email-sender';
import { logger } from '../logging/logger';

// Usado quando RESEND_API_KEY não está configurada (dev sem chave, testes) —
// só loga em debug em vez de falhar, pra não travar chamados/notificações
// in-app por falta de credencial de e-mail.
export class NullEmailSender implements EmailSender {
  async send({ to, subject }: SendEmailInput): Promise<void> {
    logger.debug({ to, subject }, 'e-mail não enviado (RESEND_API_KEY não configurada)');
  }
}

import { Resend } from 'resend';
import { EmailSender, SendEmailInput } from '../../domain/ports/email-sender';
import { logger } from '../logging/logger';

export class ResendEmailSender implements EmailSender {
  private readonly client: Resend;

  constructor(
    apiKey: string,
    private readonly from: string,
  ) {
    this.client = new Resend(apiKey);
  }

  async send({ to, subject, html }: SendEmailInput): Promise<void> {
    try {
      const { error } = await this.client.emails.send({ from: this.from, to, subject, html });
      if (error) {
        logger.error({ err: error, to, subject }, 'falha ao enviar e-mail via Resend');
      }
    } catch (err) {
      logger.error({ err, to, subject }, 'falha ao enviar e-mail via Resend');
    }
  }
}

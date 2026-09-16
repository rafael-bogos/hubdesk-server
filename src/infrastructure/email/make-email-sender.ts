import { EmailSender } from '../../domain/ports/email-sender';
import { env } from '../../main/config/env';
import { NullEmailSender } from './null-email-sender';
import { ResendEmailSender } from './resend-email-sender';

export const makeEmailSender = (): EmailSender =>
  env.resendApiKey ? new ResendEmailSender(env.resendApiKey, env.emailFrom) : new NullEmailSender();

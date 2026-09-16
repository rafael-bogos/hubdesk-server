export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

export interface EmailSender {
  // Best-effort: nunca deve lançar pra quem chama — a notificação in-app já
  // foi persistida antes disso, uma falha de e-mail não pode derrubá-la.
  // Implementações tratam o próprio erro (log) em vez de propagar.
  send(input: SendEmailInput): Promise<void>;
}

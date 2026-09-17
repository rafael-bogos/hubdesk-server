// HTML de e-mail é renderizado à mão (sem framework) e precisa de estilo
// inline + layout em tabela — é o único jeito de ficar consistente entre
// clientes de e-mail (Outlook desktop em especial não segue flexbox/grid).
// Cores replicam a identidade visual do Hubdesk (ver components/brand/logo.tsx
// no client): navy #1F2A44 e teal #0E7C66.

const NAVY = '#1F2A44';
const TEAL = '#0E7C66';
const CREAM = '#F4F3EF';
const BORDER = '#E5E1D8';
const MUTED = '#6B7280';
const FOOTER_BG = '#FAF9F6';
const FOOTER_TEXT = '#8A8578';

export interface TicketNotificationEmailData {
  ticketNumber: number;
  ticketTitle: string;
  detail: string;
  isClosed: boolean;
  ticketUrl: string;
  settingsUrl: string;
  // URL pública (ver env.emailLogoUrl) — vazia = cabeçalho sai só com o texto
  // "Hubdesk", sem tag de imagem quebrada. Se o arquivo for SVG (como o do
  // bucket R2 hoje), vale lembrar que alguns clientes de e-mail (Outlook
  // desktop, principalmente) não renderizam `<img>` de SVG — PNG/JPG é mais
  // seguro se isso virar problema.
  logoUrl?: string;
}

// Título do chamado (e, em tese, o detalhe) vêm de dados gravados por
// usuários — nunca interpolar sem escapar, ou um título tipo `<img onerror=...>`
// vira HTML de verdade no corpo do e-mail.
const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const renderTicketNotificationEmail = ({
  ticketNumber,
  ticketTitle,
  detail,
  isClosed,
  ticketUrl,
  settingsUrl,
  logoUrl,
}: TicketNotificationEmailData): string => {
  const statusLabel = isClosed ? 'Chamado fechado' : 'Chamado atualizado';
  const badgeColor = isClosed ? TEAL : NAVY;
  const badgeBg = isClosed ? '#E4F3EF' : '#E8EAF0';

  const logoCell = logoUrl
    ? `<td style="width:30px; height:30px;">
        <img
          src="${logoUrl}"
          width="30"
          height="30"
          alt="Hubdesk"
          style="display:block; width:30px; height:30px;"
        />
      </td>`
    : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <title>${statusLabel}</title>
  </head>
  <body style="margin:0; padding:0; background-color:${CREAM}; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${CREAM};">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; background-color:#ffffff; border-radius:16px; border:1px solid ${BORDER};">
            <tr>
              <td style="background-color:${NAVY}; padding:20px 32px; border-radius:16px 16px 0 0;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    ${logoCell}
                    <td style="padding-left:${logoUrl ? '10px' : '0'};">
                      <span style="color:#ffffff; font-size:17px; font-weight:700; letter-spacing:-0.01em;">Hubdesk</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 32px 28px;">
                <span style="display:inline-block; padding:4px 12px; border-radius:999px; background-color:${badgeBg}; color:${badgeColor}; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.04em;">
                  ${statusLabel}
                </span>
                <h1 style="margin:18px 0 6px; font-size:19px; line-height:1.4; color:${NAVY}; font-weight:700;">
                  Chamado #${ticketNumber} · ${escapeHtml(ticketTitle)}
                </h1>
                <p style="margin:0 0 26px; font-size:14px; line-height:1.6; color:${MUTED};">
                  ${escapeHtml(detail)}
                </p>
                <a
                  href="${ticketUrl}"
                  style="display:inline-block; padding:12px 26px; border-radius:10px; background-color:${TEAL}; color:#ffffff; font-size:14px; font-weight:600; text-decoration:none;"
                >
                  Ver chamado
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 32px; border-top:1px solid ${BORDER}; background-color:${FOOTER_BG}; border-radius:0 0 16px 16px;">
                <p style="margin:0; font-size:12px; line-height:1.6; color:${FOOTER_TEXT};">
                  Você recebeu este e-mail porque participa do chamado #${ticketNumber} no Hubdesk.
                  <a href="${settingsUrl}" style="color:${TEAL}; text-decoration:underline;">Gerenciar notificações</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};

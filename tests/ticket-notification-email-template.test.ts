import { describe, expect, it } from 'vitest';
import { renderTicketNotificationEmail } from '../src/application/services/ticket-notification-email-template';

describe('renderTicketNotificationEmail', () => {
  it('escapa o título do chamado (dado gravado por usuário) antes de interpolar no HTML', () => {
    const html = renderTicketNotificationEmail({
      ticketNumber: 7,
      ticketTitle: '<img src=x onerror=alert(1)>',
      detail: 'Novo status: Fechado',
      isClosed: true,
      ticketUrl: 'https://hubdesk.example.com/tickets/7',
      settingsUrl: 'https://hubdesk.example.com/settings',
    });

    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('usa o rótulo e a cor de "fechado" quando isClosed é true', () => {
    const html = renderTicketNotificationEmail({
      ticketNumber: 7,
      ticketTitle: 'Impressora não liga',
      detail: 'Novo status: Fechado',
      isClosed: true,
      ticketUrl: 'https://hubdesk.example.com/tickets/7',
      settingsUrl: 'https://hubdesk.example.com/settings',
    });

    expect(html).toContain('Chamado fechado');
    expect(html).not.toContain('Chamado atualizado');
  });

  it('usa o rótulo de "atualizado" quando isClosed é false', () => {
    const html = renderTicketNotificationEmail({
      ticketNumber: 7,
      ticketTitle: 'Impressora não liga',
      detail: 'Novo status: Em andamento',
      isClosed: false,
      ticketUrl: 'https://hubdesk.example.com/tickets/7',
      settingsUrl: 'https://hubdesk.example.com/settings',
    });

    expect(html).toContain('Chamado atualizado');
    expect(html).not.toContain('Chamado fechado');
  });

  it('inclui o link do chamado e o link de preferências', () => {
    const html = renderTicketNotificationEmail({
      ticketNumber: 7,
      ticketTitle: 'Impressora não liga',
      detail: 'Novo status: Fechado',
      isClosed: true,
      ticketUrl: 'https://hubdesk.example.com/tickets/7',
      settingsUrl: 'https://hubdesk.example.com/settings',
    });

    expect(html).toContain('href="https://hubdesk.example.com/tickets/7"');
    expect(html).toContain('href="https://hubdesk.example.com/settings"');
  });

  it('usa a URL de logo recebida, quando informada', () => {
    const html = renderTicketNotificationEmail({
      ticketNumber: 7,
      ticketTitle: 'Impressora não liga',
      detail: 'Novo status: Fechado',
      isClosed: true,
      ticketUrl: 'https://hubdesk.example.com/tickets/7',
      settingsUrl: 'https://hubdesk.example.com/settings',
      logoUrl: 'https://pub-example.r2.dev/logo.svg',
    });

    expect(html).toContain('src="https://pub-example.r2.dev/logo.svg"');
  });

  it('sai sem tag de imagem (em vez de uma quebrada) quando a URL de logo não é informada', () => {
    const html = renderTicketNotificationEmail({
      ticketNumber: 7,
      ticketTitle: 'Impressora não liga',
      detail: 'Novo status: Fechado',
      isClosed: true,
      ticketUrl: 'https://hubdesk.example.com/tickets/7',
      settingsUrl: 'https://hubdesk.example.com/settings',
    });

    expect(html).not.toContain('<img');
    expect(html).toContain('Hubdesk');
  });
});

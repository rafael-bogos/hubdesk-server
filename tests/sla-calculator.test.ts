import { describe, expect, it } from 'vitest';
import { calculateSla } from '../src/application/services/sla-calculator';
import { SlaSettings } from '../src/domain/entities/sla-settings.entity';
import { Ticket } from '../src/domain/entities/ticket.entity';

const settings: SlaSettings = {
  lowPriorityHours: 72,
  mediumPriorityHours: 24,
  highPriorityHours: 8,
  urgentPriorityHours: 4,
  warningThresholdPercent: 80,
  updatedAt: new Date(),
};

const baseTicket = (overrides: Partial<Ticket> = {}): Ticket => ({
  id: 'ticket-1',
  number: 1,
  title: 'Chamado de teste',
  description: 'descrição',
  status: 'OPEN',
  priority: 'URGENT',
  requesterId: 'requester-1',
  assigneeIds: [],
  categoryId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  closedAt: null,
  scheduledClosureAt: null,
  slaPausedAt: null,
  slaPausedDurationMs: 0,
  slaWarningNotifiedAt: null,
  ...overrides,
});

const HOUR = 3_600_000;

describe('calculateSla', () => {
  it('fica "ok" bem no início do prazo', () => {
    const now = new Date();
    const ticket = baseTicket({ createdAt: now });

    const result = calculateSla(ticket, settings, now);

    expect(result.state).toBe('ok');
    expect(result.percentConsumed).toBeCloseTo(0, 5);
  });

  it('vira "near_breach" exatamente no limiar configurado', () => {
    const now = new Date();
    // URGENT = 4h; 80% de 4h = 3h12min consumidas.
    const createdAt = new Date(now.getTime() - 4 * HOUR * 0.8);
    const ticket = baseTicket({ createdAt });

    const result = calculateSla(ticket, settings, now);

    expect(result.state).toBe('near_breach');
    expect(result.percentConsumed).toBeCloseTo(80, 5);
  });

  it('vira "breached" quando passa de 100% do prazo', () => {
    const now = new Date();
    const createdAt = new Date(now.getTime() - 5 * HOUR); // URGENT = 4h
    const ticket = baseTicket({ createdAt });

    const result = calculateSla(ticket, settings, now);

    expect(result.state).toBe('breached');
    expect(result.percentConsumed).toBeGreaterThan(100);
  });

  it('uma pausa em andamento (WAITING) congela o tempo decorrido', () => {
    const now = new Date();
    // Chamado aberto há 3h, mas pausado (entrou em WAITING) há 2h — só 1h
    // deveria contar de verdade.
    const createdAt = new Date(now.getTime() - 3 * HOUR);
    const slaPausedAt = new Date(now.getTime() - 2 * HOUR);
    const ticket = baseTicket({ createdAt, status: 'WAITING', slaPausedAt });

    const result = calculateSla(ticket, settings, now);

    expect(result.elapsedMs).toBeCloseTo(1 * HOUR, -2);
  });

  it('soma a pausa em andamento à pausa já acumulada de períodos anteriores', () => {
    const now = new Date();
    const createdAt = new Date(now.getTime() - 4 * HOUR);
    const slaPausedAt = new Date(now.getTime() - 1 * HOUR); // pausado de novo há 1h
    const ticket = baseTicket({
      createdAt,
      status: 'WAITING',
      slaPausedAt,
      slaPausedDurationMs: 1 * HOUR, // já tinha ficado 1h pausado antes
    });

    const result = calculateSla(ticket, settings, now);

    // 4h decorridas - (1h pausa antiga + 1h pausa atual) = 2h de verdade.
    expect(result.elapsedMs).toBeCloseTo(2 * HOUR, -2);
  });

  it('um chamado resolvido congela o cálculo no momento do fechamento', () => {
    const now = new Date();
    const createdAt = new Date(now.getTime() - 10 * HOUR);
    const closedAt = new Date(now.getTime() - 5 * HOUR); // fechou há 5h, dentro do prazo até lá
    const ticket = baseTicket({ createdAt, status: 'RESOLVED', closedAt, priority: 'LOW' });

    const result = calculateSla(ticket, settings, now);

    // LOW = 72h; decorrido até o fechamento = 5h (10h - 5h), não continua
    // crescendo com o "now" atual.
    expect(result.elapsedMs).toBeCloseTo(5 * HOUR, -2);
  });
});

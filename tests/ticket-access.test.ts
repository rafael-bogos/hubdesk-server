import { describe, expect, it } from 'vitest';
import { canViewTicket } from '../src/application/use-cases/tickets/ticket-access';
import { Actor } from '../src/application/dtos/ticket.dto';
import { Ticket } from '../src/domain/entities/ticket.entity';

const baseTicket = (overrides: Partial<Ticket> = {}): Ticket => ({
  id: 'ticket-1',
  number: 1,
  title: 'Chamado de teste',
  description: 'descrição',
  status: 'OPEN',
  priority: 'MEDIUM',
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

const agent = (overrides: Partial<Actor> = {}): Actor => ({
  userId: 'agent-1',
  role: 'AGENT',
  ...overrides,
});

describe('canViewTicket — ADMIN e CUSTOMER (comportamento existente, sem mudança)', () => {
  it('admin vê qualquer chamado', () => {
    expect(canViewTicket({ userId: 'admin-1', role: 'ADMIN' }, baseTicket())).toBe(true);
  });

  it('customer só vê o próprio chamado', () => {
    const ticket = baseTicket({ requesterId: 'customer-1' });
    expect(canViewTicket({ userId: 'customer-1', role: 'CUSTOMER' }, ticket)).toBe(true);
    expect(canViewTicket({ userId: 'customer-2', role: 'CUSTOMER' }, ticket)).toBe(false);
  });
});

describe('canViewTicket — AGENT sem restrição de categoria (allowedCategoryIds ausente)', () => {
  it('vê chamado sem responsável, com ou sem categoria', () => {
    expect(canViewTicket(agent(), baseTicket({ categoryId: null }))).toBe(true);
    expect(canViewTicket(agent(), baseTicket({ categoryId: 'cat-a' }))).toBe(true);
  });

  it('não vê chamado já atribuído a outro agent', () => {
    const ticket = baseTicket({ assigneeIds: ['agent-2'] });
    expect(canViewTicket(agent(), ticket)).toBe(false);
  });

  it('vê chamado atribuído a si mesmo', () => {
    const ticket = baseTicket({ assigneeIds: ['agent-1'] });
    expect(canViewTicket(agent(), ticket)).toBe(true);
  });
});

describe('canViewTicket — AGENT restrito a categorias específicas', () => {
  const restricted = agent({ allowedCategoryIds: ['cat-a'] });

  it('vê chamado sem responsável da categoria permitida', () => {
    expect(canViewTicket(restricted, baseTicket({ categoryId: 'cat-a' }))).toBe(true);
  });

  it('não vê chamado sem responsável de outra categoria', () => {
    expect(canViewTicket(restricted, baseTicket({ categoryId: 'cat-b' }))).toBe(false);
  });

  it('não vê chamado sem responsável e sem categoria definida', () => {
    expect(canViewTicket(restricted, baseTicket({ categoryId: null }))).toBe(false);
  });

  it('continua vendo um chamado já atribuído a ele, mesmo fora da lista de categorias', () => {
    const ticket = baseTicket({ categoryId: 'cat-b', assigneeIds: ['agent-1'] });
    expect(canViewTicket(restricted, ticket)).toBe(true);
  });

  it('não vê chamado atribuído a outro agent, mesmo da categoria permitida', () => {
    const ticket = baseTicket({ categoryId: 'cat-a', assigneeIds: ['agent-2'] });
    expect(canViewTicket(restricted, ticket)).toBe(false);
  });
});

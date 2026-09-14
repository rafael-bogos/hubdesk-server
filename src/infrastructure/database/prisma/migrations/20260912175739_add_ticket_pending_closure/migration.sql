-- Novo status "pendente de fechamento": diferente da remoção de CLOSED (que
-- trocou o tipo inteiro), aqui só ADICIONAMOS um valor — Postgres permite via
-- ALTER TYPE ... ADD VALUE, sem precisar recriar o enum.
ALTER TYPE "TicketStatus" ADD VALUE 'PENDING_CLOSURE';

-- Data/hora agendada pro fechamento automático (BullMQ). Fica null pra todo
-- chamado que nunca passou por PENDING_CLOSURE.
ALTER TABLE "tickets" ADD COLUMN "scheduled_closure_at" TIMESTAMP(3);

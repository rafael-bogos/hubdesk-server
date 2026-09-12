-- Fechado deixa de existir como status: RESOLVED passa a ser o status
-- terminal. Migra os chamados fechados existentes antes de remover o valor
-- do enum (o tipo antigo ainda tem CLOSED nesse ponto).
UPDATE "tickets" SET "status" = 'RESOLVED' WHERE "status" = 'CLOSED';

-- Postgres não permite remover um valor de enum diretamente (ALTER TYPE ...
-- DROP VALUE não existe) — recria o tipo sem CLOSED e troca a coluna pra ele.
ALTER TYPE "TicketStatus" RENAME TO "TicketStatus_old";
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED');

ALTER TABLE "tickets" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "tickets" ALTER COLUMN "status" TYPE "TicketStatus" USING ("status"::text::"TicketStatus");
ALTER TABLE "tickets" ALTER COLUMN "status" SET DEFAULT 'OPEN';

DROP TYPE "TicketStatus_old";

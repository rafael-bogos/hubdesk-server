-- CreateSequence
CREATE SEQUENCE "tickets_number_seq";

-- AlterTable
ALTER TABLE "tickets" ADD COLUMN "number" INTEGER NOT NULL DEFAULT nextval('tickets_number_seq');

-- AlterSequence
ALTER SEQUENCE "tickets_number_seq" OWNED BY "tickets"."number";

-- CreateIndex
CREATE UNIQUE INDEX "tickets_number_key" ON "tickets"("number");

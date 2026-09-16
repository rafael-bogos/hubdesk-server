-- Substitui a preferência única de e-mail por duas independentes.
ALTER TABLE "users" ADD COLUMN "email_on_ticket_updated" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN "email_on_ticket_closed" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users" DROP COLUMN "email_notifications_enabled";

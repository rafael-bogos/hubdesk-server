-- SLA por prioridade, configurável pelo admin, com aviso quando perto de estourar.

ALTER TABLE "users" ADD COLUMN "email_on_sla_warning" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "tickets" ADD COLUMN "sla_paused_at" TIMESTAMP(3);
ALTER TABLE "tickets" ADD COLUMN "sla_paused_duration_ms" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "tickets" ADD COLUMN "sla_warning_notified_at" TIMESTAMP(3);

CREATE INDEX "tickets_status_idx" ON "tickets"("status");

CREATE TABLE "sla_settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "low_priority_hours" INTEGER NOT NULL DEFAULT 72,
    "medium_priority_hours" INTEGER NOT NULL DEFAULT 24,
    "high_priority_hours" INTEGER NOT NULL DEFAULT 8,
    "urgent_priority_hours" INTEGER NOT NULL DEFAULT 4,
    "warning_threshold_percent" INTEGER NOT NULL DEFAULT 80,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sla_settings_pkey" PRIMARY KEY ("id")
);

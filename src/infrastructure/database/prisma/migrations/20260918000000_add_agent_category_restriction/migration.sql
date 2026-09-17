-- Restringe certos atendentes a categorias específicas de chamado.

CREATE TABLE "agent_categories" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "agent_categories_user_id_category_id_key" ON "agent_categories"("user_id", "category_id");

ALTER TABLE "agent_categories" ADD CONSTRAINT "agent_categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agent_categories" ADD CONSTRAINT "agent_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

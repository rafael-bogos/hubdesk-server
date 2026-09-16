-- Login configurável (Google / OAuth customizado) via better-auth, mantendo
-- o e-mail/senha atual intacto.

-- `password_hash` passa a ter default "" (nunca um hash bcrypt válido) pra
-- permitir usuários criados via OAuth, que nunca têm senha própria — bcrypt
-- comparando qualquer senha contra "" sempre dá false, então login por senha
-- some sozinho pra essas contas.
ALTER TABLE "users" ALTER COLUMN "password_hash" SET DEFAULT '';

-- Campos exigidos pelo schema padrão do better-auth. `email_verified` dos
-- usuários já existentes é marcado true: eles já passaram pelo nosso próprio
-- registro/validação, então tratamos o e-mail deles como confiável — isso
-- habilita account linking automático se um dia logarem via OAuth com o
-- mesmo e-mail.
ALTER TABLE "users" ADD COLUMN "email_verified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "image" TEXT;
UPDATE "users" SET "email_verified" = true;

CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "id_token" TEXT,
    "access_token_expires_at" TIMESTAMP(3),
    "refresh_token_expires_at" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "auth_sessions" (
    "id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "verifications" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "login_settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "email_password_enabled" BOOLEAN NOT NULL DEFAULT true,
    "google_enabled" BOOLEAN NOT NULL DEFAULT false,
    "google_client_id" TEXT,
    "google_client_secret_encrypted" TEXT,
    "custom_oauth_enabled" BOOLEAN NOT NULL DEFAULT false,
    "custom_oauth_provider_id" TEXT,
    "custom_oauth_provider_name" TEXT,
    "custom_oauth_client_id" TEXT,
    "custom_oauth_client_secret_encrypted" TEXT,
    "custom_oauth_authorization_url" TEXT,
    "custom_oauth_token_url" TEXT,
    "custom_oauth_user_info_url" TEXT,
    "custom_oauth_scopes" TEXT,
    "default_method" TEXT NOT NULL DEFAULT 'google',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "login_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "auth_sessions_token_key" ON "auth_sessions"("token");

ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

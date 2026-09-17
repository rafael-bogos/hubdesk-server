-- Foto de perfil do usuário (upload próprio, mesmo mecanismo de arquivo da logo de login).

ALTER TABLE "users" ADD COLUMN "avatar_path" TEXT;
ALTER TABLE "users" ADD COLUMN "avatar_mime_type" TEXT;

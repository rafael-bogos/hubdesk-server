-- Logo do botão do OAuth customizado na tela de login (Google já tem ícone
-- próprio embutido) — path no FileStorage, igual aos anexos de chamado.
ALTER TABLE "login_settings" ADD COLUMN "custom_oauth_logo_path" TEXT;
ALTER TABLE "login_settings" ADD COLUMN "custom_oauth_logo_mime_type" TEXT;

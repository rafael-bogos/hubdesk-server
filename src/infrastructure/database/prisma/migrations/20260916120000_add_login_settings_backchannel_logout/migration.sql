-- Back-channel logout do OAuth customizado: `issuer`/`jwks_uri` do provedor,
-- usados só pra verificar a assinatura do `logout_token` recebido em
-- POST /auth/oauth/backchannel-logout. Opcionais: sem eles esse provedor
-- simplesmente não participa do back-channel logout.
ALTER TABLE "login_settings" ADD COLUMN "custom_oauth_issuer" TEXT;
ALTER TABLE "login_settings" ADD COLUMN "custom_oauth_jwks_url" TEXT;

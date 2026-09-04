# Hubdesk Server

API da Hubdesk, plataforma open source de chamados (helpdesk), single-tenant, com
gerenciamento de usuários/roles (`ADMIN`/`AGENT`/`CUSTOMER`) e área de administração.
Express 5 + TypeScript + Prisma, em Clean Architecture.

O frontend fica em [hubdesk-client](../hubdesk-client) — repositório irmão,
publicado separadamente, com seu próprio `docker-compose.yml`.

## Rodando a API com Docker Compose

```bash
git clone <url-deste-repo> hubdesk-server
cd hubdesk-server
docker compose up --build
```

Isso sobe Postgres + API. Na primeira subida, a API aplica as migrations e
roda o seed automaticamente, criando o primeiro usuário `ADMIN` **se ainda
não existir nenhum**. Acompanhe os logs do serviço `api` — a senha gerada é
impressa **uma única vez**:

```bash
docker compose logs api | grep -A3 "\[seed\]"
```

Para definir suas próprias credenciais em vez de uma senha aleatória, crie um
`.env` ao lado do `docker-compose.yml` com `SEED_ADMIN_EMAIL` e
`SEED_ADMIN_PASSWORD` antes do primeiro `up` (veja `.env.example`).

Suba o `hubdesk-client` separadamente (via o `docker-compose.yml` dele, ou
`npm run dev`) apontando `BACKEND_API_URL` para esta API.

## Rodando em dev (sem Docker)

```bash
cp .env.example .env
docker compose -f docker-compose.dev.yml up -d
npm install
npx prisma migrate deploy
npm run db:seed                 # cria o primeiro ADMIN (mesmo comportamento acima)
npm run dev                     # http://localhost:3001
```

Verifique com `curl http://localhost:3001/health`.

## Scripts

- `npm run dev` — modo desenvolvimento com reload automático
- `npm run build` — compila para `dist/`
- `npm start` — roda o build compilado
- `npm test` — roda os testes (Vitest + Supertest, requer Postgres)
- `npm run lint` — roda o ESLint
- `npm run prisma:migrate` — cria/aplica migrações em dev
- `npm run db:seed` — cria o primeiro usuário ADMIN (idempotente)

## Estrutura (Clean Architecture)

```
src/
  domain/               # entidades e interfaces de repositório (ports) — sem deps de framework
    entities/
    repositories/
    errors/
  application/          # regras de negócio da aplicação — depende só de domain/
    use-cases/
    dtos/
  infrastructure/       # implementações concretas — depende de domain/ (implementa os ports)
    database/prisma/      # schema.prisma + client singleton + seed
    database/repositories/ # implementações Prisma dos repositórios de domain/
    auth/                  # JWT + bcrypt
    http/express/
      controllers/           # finos, chamam use cases
      routes/
      middleware/             # authenticate, requireRole, validate, error-handler
    logging/               # pino
    storage/               # anexos
  main/                  # composition root — único lugar que conhece tudo
    config/                # variáveis de ambiente
    factories/             # wiring manual de repositórios/use cases/controllers
    app.ts / server.ts
```

Regra de dependência: `domain/` não importa nada de fora; `application/` só importa
de `domain/`; `infrastructure/` implementa os ports de `domain/`; `main/` é o único
lugar que conhece `infrastructure/`, `application/` e `domain/` ao mesmo tempo. Sem
lib de DI (inversify/tsyringe) — wiring manual em `main/factories/`.

## Contribuindo

Veja [CONTRIBUTING.md](./CONTRIBUTING.md).

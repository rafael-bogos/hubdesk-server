# Hubdesk Server

API da Hubdesk, plataforma open source de chamados (helpdesk). Express 5 + TypeScript + Prisma.

## Rodando localmente

```bash
cp .env.example .env
npm install
npm run prisma:generate
npm run dev
```

A API sobe em `http://localhost:3001`. Verifique com `curl http://localhost:3001/health`.

## Com Docker

```bash
docker compose up --build
```

## Scripts

- `npm run dev` — modo desenvolvimento com reload automático
- `npm run build` — compila para `dist/`
- `npm start` — roda o build compilado
- `npm test` — roda os testes (Vitest)
- `npm run lint` — roda o ESLint
- `npm run prisma:migrate` — aplica migrações do Prisma

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
    database/prisma/      # schema.prisma + client singleton
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

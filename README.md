# chamados-server

API da plataforma open source de chamados (helpdesk). Express 5 + TypeScript + Prisma.

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

## Estrutura

```
src/
  controllers/   # lida com request/response, delega para services
  services/      # regras de negócio
  repositories/  # acesso a dados via Prisma
  routes/        # definição das rotas Express
  middleware/    # auth, roles, validação, tratamento de erro
  types/         # tipos compartilhados
  dtos/          # schemas Zod de entrada/saída
  utils/         # utilitários (logger, etc.)
```

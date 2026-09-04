# Contribuindo com o hubdesk-server

Obrigado pelo interesse em contribuir! Este é o backend da Hubdesk (Express 5 +
TypeScript + Prisma). O frontend fica em [hubdesk-client](../hubdesk-client)
(repositório irmão, publicado separadamente).

## Rodando localmente (sem Docker)

```bash
cp .env.example .env
docker compose up -d db        # só o Postgres
npm install
npx prisma migrate deploy      # aplica as migrations
npm run db:seed                # cria o primeiro usuário ADMIN (veja a senha impressa no console)
npm run dev                    # http://localhost:3001
```

## Arquitetura

O projeto segue Clean Architecture. Antes de abrir um PR, entenda a regra de
dependência (documentada em detalhe no `README.md`):

```
domain/         → não importa nada de fora
application/    → só importa de domain/
infrastructure/ → implementa os ports de domain/, pode usar libs externas
main/           → único lugar que conhece tudo (composition root)
```

Não introduza uma lib de injeção de dependência (inversify/tsyringe) — o wiring
manual em `main/factories/` é intencional. Regra de negócio vai em
`application/use-cases/`, nunca em controllers (mantenha-os finos).

## Antes de abrir um PR

```bash
npm run lint
npm test        # requer .env.test configurado (veja README) e Postgres rodando
npm run build
```

Todos os três precisam passar. Testes de integração (Vitest + Supertest) rodam
contra um Postgres real — não existe suíte só de unit tests hoje — mas contra
o banco `hubdesk_test`, nunca o `hubdesk` de dev (os `beforeEach` de cada
suíte apagam as tabelas). Novas rotas/use cases precisam vir com teste
cobrindo pelo menos o caminho feliz e a regra de autorização por role
relevante.

## Commits

O histórico segue o padrão [Conventional Commits](https://www.conventionalcommits.org/):
`feat:`, `fix:`, `chore:`, `test:`, `refactor:`, `docs:`. Descreva o "porquê" da
mudança na mensagem quando não for óbvio pelo diff.

## Reportando bugs / sugerindo features

Use os templates de issue do GitHub. Para bugs, inclua passos de reprodução e o
comportamento esperado vs. observado.

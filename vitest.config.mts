import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Testes de integração compartilham o mesmo Postgres real (docker-compose db) —
    // rodar arquivos em paralelo causa condição de corrida entre os beforeEach de cada suíte.
    fileParallelism: false,
  },
});

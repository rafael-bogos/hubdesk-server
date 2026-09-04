import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['./tests/setup.ts'],
    // Testes de integração rodam contra um banco Postgres real dedicado
    // (hubdesk_test, ver .env.test) — nunca o hubdesk usado em dev. Ainda
    // assim é um único banco compartilhado entre os arquivos de teste, então
    // rodar em paralelo causaria condição de corrida entre os beforeEach de
    // cada suíte.
    fileParallelism: false,
  },
});

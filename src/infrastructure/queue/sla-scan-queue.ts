// Nome compartilhado entre quem agenda (main/server.ts) e quem processa
// (createSlaScanWorker) — precisa ser o mesmo dos dois lados.
export const SLA_SCAN_QUEUE = 'sla-scan';

// Id fixo do job repetível — BullMQ deduplica por ele, então reiniciar o
// servidor não cria uma segunda varredura rodando em paralelo.
export const SLA_SCAN_JOB_ID = 'sla-scan-recurring';

// Frequência da varredura — fixa em código de propósito (não é um parâmetro
// que o admin ajusta, só o prazo por prioridade e o limiar de aviso são).
export const SLA_SCAN_INTERVAL_MS = 5 * 60 * 1000;

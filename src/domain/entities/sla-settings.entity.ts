export interface SlaSettings {
  lowPriorityHours: number;
  mediumPriorityHours: number;
  highPriorityHours: number;
  urgentPriorityHours: number;
  // % do prazo consumido a partir do qual um chamado é considerado "perto de
  // estourar" (dispara indicador + notificação) — ver sla-calculator.ts.
  warningThresholdPercent: number;
  updatedAt: Date;
}

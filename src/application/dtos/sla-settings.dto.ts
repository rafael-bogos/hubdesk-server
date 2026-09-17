export interface AdminSlaSettingsOutput {
  lowPriorityHours: number;
  mediumPriorityHours: number;
  highPriorityHours: number;
  urgentPriorityHours: number;
  warningThresholdPercent: number;
}

// Payload do PATCH — todos os campos opcionais (partial update).
export interface UpdateSlaSettingsInput {
  lowPriorityHours?: number;
  mediumPriorityHours?: number;
  highPriorityHours?: number;
  urgentPriorityHours?: number;
  warningThresholdPercent?: number;
}

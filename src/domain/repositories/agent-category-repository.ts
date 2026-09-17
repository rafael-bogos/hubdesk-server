export interface AgentCategoryRepository {
  // Vazio = sem restrição nenhuma (comportamento padrão) — ver canViewTicket
  // em application/use-cases/tickets/ticket-access.ts.
  listCategoryIdsForUser(userId: string): Promise<string[]>;
  // Substitui a lista inteira de categorias permitidas do atendente.
  setCategoriesForUser(userId: string, categoryIds: string[]): Promise<void>;
  // Categorias permitidas de vários atendentes de uma vez (evita N+1 na
  // listagem de usuários) — chave é o userId.
  listCategoryIdsForUsers(userIds: string[]): Promise<Map<string, string[]>>;
}

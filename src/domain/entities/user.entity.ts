export type Role = 'ADMIN' | 'AGENT' | 'CUSTOMER';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  tokenVersion: number;
  active: boolean;
  emailOnTicketUpdated: boolean;
  emailOnTicketClosed: boolean;
  emailOnSlaWarning: boolean;
  avatarPath: string | null;
  avatarMimeType: string | null;
  // Preenchido pelo better-auth com a foto de perfil do provedor (Google,
  // OAuth customizado) na criação da conta — usado como avatar só quando o
  // usuário ainda não subiu uma foto própria (ver avatar-url.ts).
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
}

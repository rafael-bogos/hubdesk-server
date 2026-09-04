export type Role = 'ADMIN' | 'AGENT' | 'CUSTOMER';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  tokenVersion: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

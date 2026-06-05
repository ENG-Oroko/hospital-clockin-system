import { UserRole } from '@chronos/types-common';

export interface AuthenticatedUser {
  userId: string;
  sub: string;
  email: string;
  role: UserRole;
  tenantId: string;
  deptId: string | null;
} 

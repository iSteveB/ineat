import { SetMetadata } from '@nestjs/common';

export const REQUIRED_ROLES_KEY = 'requiredRoles';
export type RequiredRole = 'USER' | 'ADMIN';

export const RequiresRole = (...roles: RequiredRole[]) =>
  SetMetadata(REQUIRED_ROLES_KEY, roles);

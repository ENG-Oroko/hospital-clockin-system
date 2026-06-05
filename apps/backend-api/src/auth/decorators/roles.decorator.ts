// src/auth/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../employee/users/enum/user-role.enum';

export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);
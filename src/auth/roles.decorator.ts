import { SetMetadata } from '@nestjs/common';

// Custom metadata key to store allowed roles
export const ROLES_KEY = 'roles';

// Decorator function
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

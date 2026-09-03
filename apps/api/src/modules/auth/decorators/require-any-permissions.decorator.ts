import { SetMetadata } from '@nestjs/common';

export const REQUIRED_PERMISSIONS_KEY =
  'required_permissions_any';

export const RequireAnyPermissions = (
  ...permissions: string[]
) =>
  SetMetadata(
    REQUIRED_PERMISSIONS_KEY,
    permissions,
  );
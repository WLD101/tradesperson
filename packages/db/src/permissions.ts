import type { Permission, Role } from "@prisma/client";

export const flattenPermissions = (
  roles: Array<Role & { permissions: Array<{ permission: Permission }> }>,
) => [
  ...new Set(
    roles.flatMap((role) =>
      role.permissions.map((item) => item.permission.key),
    ),
  ),
];

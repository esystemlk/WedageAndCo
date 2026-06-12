/**
 * Role-based access control configuration for Wedage CRM.
 */

export enum UserRole {
  DEVELOPER = 'developer',
  SUPER_ADMIN = 'superAdmin',
  ADMIN = 'admin',
  OPERATIONS = 'operations',
  ACCOUNTS = 'accounts',
  DRIVER = 'driver',
  PENDING = 'pending'
}

export enum UserDepartment {
  OPERATIONS = 'Operations',
  ACCOUNTS_HR_IT = 'Accounts/HR/IT',
  NONE = 'None'
}

export type Permission = 
  | 'view_users' | 'manage_users'
  | 'view_customers' | 'edit_customers'
  | 'view_suppliers' | 'edit_suppliers'
  | 'view_staff' | 'edit_staff'
  | 'view_fleet' | 'edit_fleet'
  | 'view_logs' | 'edit_logs'
  | 'view_garage' | 'edit_garage'
  | 'view_reports' | 'view_billing' | 'view_audit_logs';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.DEVELOPER]: [
    'view_users', 'manage_users', 'view_customers', 'edit_customers',
    'view_suppliers', 'edit_suppliers', 'view_staff', 'edit_staff',
    'view_fleet', 'edit_fleet', 'view_logs', 'edit_logs',
    'view_garage', 'edit_garage', 'view_reports', 'view_billing', 'view_audit_logs'
  ],
  [UserRole.SUPER_ADMIN]: [
    'view_users', 'manage_users', 'view_customers', 'edit_customers',
    'view_suppliers', 'edit_suppliers', 'view_staff', 'edit_staff',
    'view_fleet', 'edit_fleet', 'view_logs', 'edit_logs',
    'view_garage', 'edit_garage', 'view_reports', 'view_billing', 'view_audit_logs'
  ],
  [UserRole.ADMIN]: [
    'view_customers', 'edit_customers', 'view_suppliers', 'edit_suppliers',
    'view_staff', 'edit_staff', 'view_fleet', 'edit_fleet',
    'view_logs', 'edit_logs', 'view_garage', 'edit_garage',
    'view_reports', 'view_billing'
  ],
  [UserRole.OPERATIONS]: [
    'view_customers', 'view_suppliers', 'view_staff', 'view_fleet',
    'view_logs', 'edit_logs', 'view_garage'
  ],
  [UserRole.ACCOUNTS]: [
    'view_customers', 'view_suppliers', 'view_billing', 'view_reports'
  ],
  [UserRole.DRIVER]: [
    'view_logs', 'edit_logs'
  ],
  [UserRole.PENDING]: []
};

export const ROLE_HIERARCHY: UserRole[] = [
  UserRole.DEVELOPER,
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.OPERATIONS,
  UserRole.ACCOUNTS,
  UserRole.DRIVER,
  UserRole.PENDING
];

export const hasPermission = (userRole: UserRole, permission: Permission): boolean => {
  return ROLE_PERMISSIONS[userRole]?.includes(permission) || false;
};

/**
 * Resolve the effective permissions for a user. A per-user `overrides` array, when
 * present, fully replaces the role defaults — this lets an admin grant partial
 * access to a person without assigning them a whole role. When `overrides` is
 * absent (the default for all existing users), the role's permissions apply.
 */
export const getEffectivePermissions = (
  userRole: UserRole,
  overrides?: Permission[] | null,
): Permission[] => {
  return Array.isArray(overrides) ? overrides : (ROLE_PERMISSIONS[userRole] || []);
};

export const hasEffectivePermission = (
  userRole: UserRole,
  permission: Permission,
  overrides?: Permission[] | null,
): boolean => getEffectivePermissions(userRole, overrides).includes(permission);

export const meetsMinRole = (userRole: UserRole, minRole: UserRole): boolean => {
  const userIdx = ROLE_HIERARCHY.indexOf(userRole);
  const minIdx = ROLE_HIERARCHY.indexOf(minRole);
  return userIdx !== -1 && minIdx !== -1 && userIdx <= minIdx;
};

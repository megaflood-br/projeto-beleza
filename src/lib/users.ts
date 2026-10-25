import { type Role } from "@/lib/constants";

export const TENANT_ROLES = ["OWNER", "MANAGER", "RECEPTIONIST", "PROFESSIONAL"] as const;
export type TenantRole = (typeof TENANT_ROLES)[number];

export function parseTenantRole(raw: string): TenantRole | null {
  return TENANT_ROLES.includes(raw as TenantRole) ? (raw as TenantRole) : null;
}

export function canAssignTenantRole(actor: Role, targetRole: TenantRole) {
  if (actor === "OWNER") return true;
  if (actor === "MANAGER") return targetRole !== "OWNER";
  return false;
}

export function canEditTenantUser(
  actor: { role: Role; userId: string },
  target: { id: string; role: string },
) {
  if (actor.role !== "OWNER" && actor.role !== "MANAGER") return false;
  if (target.role === "SUPER_ADMIN") return false;
  if (actor.role === "MANAGER" && target.role === "OWNER") return false;
  return true;
}

export function wouldRemoveLastOwner(input: {
  currentRole: string;
  nextRole?: string;
  nextActive?: boolean;
  ownerCount: number;
}) {
  if (input.currentRole !== "OWNER") return false;
  const staysOwner = (input.nextRole ?? input.currentRole) === "OWNER" && (input.nextActive ?? true);
  return input.ownerCount <= 1 && !staysOwner;
}

export function isValidUserEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function wouldRemoveLastPlatformAdmin(input: {
  currentRole: string;
  nextActive?: boolean;
  adminCount: number;
}) {
  if (input.currentRole !== "SUPER_ADMIN") return false;
  return input.adminCount <= 1 && input.nextActive === false;
}

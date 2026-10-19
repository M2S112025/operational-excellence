"use client";

import { useSyncExternalStore } from "react";
import { getAuthenticatedDemoActor } from "@/lib/demo-session";
import { isActivePlatformSuperAdmin } from "@/features/settings/audit-configuration-permissions";
import { safeSetStorage } from "@/lib/browser-storage";
import {
  DEFAULT_MODULE_ENTITLEMENTS,
  type AccessCapabilityId,
} from "@/lib/modules";

import { DEMO_ORGANIZATION, ORGANIZATIONS } from "@/lib/organizations";
export { DEMO_ORGANIZATION, ORGANIZATIONS, type Organization } from "@/lib/organizations";

export type OrganizationAccess = Record<AccessCapabilityId, boolean>;
type OrganizationAccessMap = Record<string, OrganizationAccess>;

const STORAGE_KEY = "ops-organization-modules-v1";
const XYZ_DEFAULTS: OrganizationAccess = {
  ...DEFAULT_MODULE_ENTITLEMENTS,
  redFlag: false,
  redTag: false,
  visualImprovement: false,
  visualManagement: false,
  gemba: false,
};
const DEFAULT_ACCESS: OrganizationAccessMap = {
  [ORGANIZATIONS[0].id]: DEFAULT_MODULE_ENTITLEMENTS,
  [ORGANIZATIONS[1].id]: XYZ_DEFAULTS,
};
let accessByOrganization = DEFAULT_ACCESS;
let loaded = false;
const listeners = new Set<() => void>();

function normalize(value: unknown): OrganizationAccessMap {
  if (!value || typeof value !== "object") return DEFAULT_ACCESS;
  const parsed = value as Record<string, unknown>;
  // Migrate the first-pass single-organization shape without changing its key.
  const legacy = Object.keys(DEFAULT_MODULE_ENTITLEMENTS).some((key) => typeof parsed[key] === "boolean");
  if (legacy) return { ...DEFAULT_ACCESS, [DEMO_ORGANIZATION.id]: { ...DEFAULT_MODULE_ENTITLEMENTS, ...parsed } as OrganizationAccess };
  return Object.fromEntries(ORGANIZATIONS.map((organization) => {
    const stored = parsed[organization.id];
    const defaults = DEFAULT_ACCESS[organization.id] ?? DEFAULT_MODULE_ENTITLEMENTS;
    return [organization.id, stored && typeof stored === "object" ? { ...defaults, ...stored } : defaults];
  })) as OrganizationAccessMap;
}

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try { accessByOrganization = normalize(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null")); }
  catch { accessByOrganization = DEFAULT_ACCESS; }
}

function subscribe(listener: () => void) { load(); listeners.add(listener); return () => listeners.delete(listener); }
function mapSnapshot() { load(); return accessByOrganization; }

export function useOrganizationAccess(organizationId = DEMO_ORGANIZATION.id) {
  const map = useSyncExternalStore(subscribe, mapSnapshot, () => DEFAULT_ACCESS);
  const access = map[organizationId] ?? DEFAULT_MODULE_ENTITLEMENTS;
  return { ...access, redFlag: false };
}

export function getOrganizationAccess(organizationId = DEMO_ORGANIZATION.id) {
  load();
  return { ...(accessByOrganization[organizationId] ?? DEFAULT_MODULE_ENTITLEMENTS) };
}

/** Current client organization access used by the normal OPS shell and route guards. */
export function useModuleEntitlements() { return useOrganizationAccess(DEMO_ORGANIZATION.id); }

export function saveOrganizationAccess(organizationId: string, access: OrganizationAccess) {
  const actor = getAuthenticatedDemoActor();
  if (!actor || !isActivePlatformSuperAdmin(actor.identity, actor.user) || !ORGANIZATIONS.some(item => item.id === organizationId)) return false;
  if (Object.keys(DEFAULT_MODULE_ENTITLEMENTS).some(key => typeof access[key as AccessCapabilityId] !== "boolean")) return false;
  load();
  const previous = accessByOrganization;
  accessByOrganization = { ...accessByOrganization, [organizationId]: { ...access } };
  const result = safeSetStorage(STORAGE_KEY, accessByOrganization);
  if (!result.success) { accessByOrganization = previous; return false; }
  listeners.forEach((listener) => listener());
  return true;
}

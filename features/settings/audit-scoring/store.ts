"use client";

import { useSyncExternalStore } from "react";
import { getAdminUser } from "@/features/five-s/administration/store";
import { getCurrentDemoUser } from "@/lib/current-user";
import { safeSetStorage } from "@/lib/browser-storage";
import { DEMO_ORGANIZATION } from "@/lib/module-entitlements";
import { canManageAuditConfiguration } from "../audit-configuration-permissions";
import { DEFAULT_AUDIT_SCORING, validateAuditScoringPolicy, type AuditScoringPolicy, type AuditScoringValues } from "@/lib/five-s/scoring-policy";

const STORAGE_KEY = "ops-audit-scoring-policies-v1";
type PolicyMap = Record<string, AuditScoringPolicy>;
const EMPTY: PolicyMap = {};
let policies: PolicyMap = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();
function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const data: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
    if (data && typeof data === "object" && !Array.isArray(data)) policies = Object.fromEntries(Object.entries(data).filter(([id, value]) => value && value.version === 1 && value.organizationId === id && validateAuditScoringPolicy(value).valid));
  } catch { policies = EMPTY; }
}
function subscribe(listener: () => void) { load(); listeners.add(listener); return () => { listeners.delete(listener); }; }
function snapshot() { load(); return policies; }
export function useAuditScoringPolicies() { return useSyncExternalStore(subscribe, snapshot, () => EMPTY); }
export function getAuditScoringPolicy(organizationId = DEMO_ORGANIZATION.id): AuditScoringPolicy {
  load();
  return { ...(policies[organizationId] ?? DEFAULT_AUDIT_SCORING), version: 1, organizationId };
}
export function saveAuditScoringPolicy(organizationId: string, values: AuditScoringValues) {
  const identity = getCurrentDemoUser();
  if (!canManageAuditConfiguration(identity, getAdminUser(identity.id), organizationId)) throw new Error("Active configuration permission for this organization is required.");
  const validation = validateAuditScoringPolicy(values);
  if (!validation.valid) throw new Error(validation.message);
  load();
  const policy: AuditScoringPolicy = { version: 1, organizationId, nonCompliance: values.nonCompliance, partialCompliance: values.partialCompliance, fullyCompliance: values.fullyCompliance };
  const next = { ...policies, [organizationId]: policy };
  const result = safeSetStorage(STORAGE_KEY, next);
  if (!result.success) throw new Error(result.message);
  policies = next;
  listeners.forEach(listener => listener());
  return { ...policy };
}

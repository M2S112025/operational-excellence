"use client";
import { canManageVisualManagementConfiguration, canOperateVisualManagementBoard, type VisualManagementActor } from "./visual-management-access";
import { getVisualManagementConfiguration } from "./visual-management-configuration-store";

import { useSyncExternalStore } from "react";
import { safeSetStorage } from "@/lib/browser-storage";
import { evaluateKpiPerformance, validatePerformanceThreshold, type KpiDirection, type KpiMeasurementType, type KpiPerformanceStatus, type KpiPerformanceThreshold } from "./kpi-configuration";
import { DAILY_MANAGEMENT_DEMO_METRICS, getVisualManagementKpi } from "./kpi-configuration-store";
import { normalizedReportingPeriodKey } from "./reporting-period";

export type KpiReportingPeriodType = "daily" | "weekly" | "monthly" | "custom";
export interface KpiReportingPeriod { type: KpiReportingPeriodType; key: string; label: string }
export interface VisualManagementKpiAssignment { id: string; boardId: string; kpiId: string; target?: number; performanceThreshold?: KpiPerformanceThreshold; displayOrder: number; isVisible: boolean; assignedAt: string; assignedByUserId: string }
export interface KpiActualEntry { id: string; kpiId: string; boardId: string; value: number; reportingPeriod: KpiReportingPeriod; reportedAt: string; reportedByUserId: string; comment?: string; statusSnapshot: KpiPerformanceStatus; neutralReason?: "no_production_holiday"; targetSnapshot: number; thresholdSnapshot: KpiPerformanceThreshold; measurementSnapshot: KpiMeasurementType; directionSnapshot: KpiDirection; createdAt: string }
export interface KpiDeviation { id: string; kpiActualEntryId: string; kpiId: string; boardId: string; status: "amber" | "red"; comment: string; correctiveActionRequired: boolean; noActionJustification?: string; actionId?: string; createdByUserId: string; createdAt: string }
export interface MeetingKpiReviewSnapshot { id: string; meetingId: string; boardId: string; kpiId: string; kpiActualEntryId?: string; kpiNameSnapshot: string; kpiLevelSnapshot: "unit" | "functional"; bucketSnapshot: string; reportingPeriodSnapshot?: KpiReportingPeriod; actualSnapshot?: number; targetSnapshot: number; statusSnapshot: KpiPerformanceStatus; deviationSnapshot?: string; correctiveActionRequiredSnapshot?: boolean; noActionJustificationSnapshot?: string; actionId?: string; reviewedAt: string; reviewedByUserId: string }
interface ExecutionState { assignments: VisualManagementKpiAssignment[]; actualEntries: KpiActualEntry[]; deviations: KpiDeviation[] }

const STORAGE_KEY = "ops-visual-management-kpi-execution-v1";
const EMPTY: ExecutionState = { assignments: [], actualEntries: [], deviations: [] };
const PRIMARY_DEMO_IDS = ["VMK-DM-SAFETY", "VMK-DM-NEAR-MISS", "VMK-DM-FPY", "VMK-DM-REJECTION", "VMK-DM-PRODUCTION", "VMK-DM-OTD", "VMK-DM-ATTENDANCE", "VMK-DM-5S"];
const ZONE_B_DEMO_IDS = ["VMK-DM-SAFETY", "VMK-DM-FPY", "VMK-DM-REJECTION", "VMK-DM-PRODUCTION", "VMK-DM-ATTENDANCE", "VMK-DM-SCRAP"];
const DEMO_STAMP = "2026-10-05T08:00:00+05:30";

function demoAssignments(boardId: string, ids: string[], ownerId: string, targetOverrides: Record<string, number> = {}, thresholdOverrides: Record<string, number> = {}) {
  return ids.flatMap((id, index) => {
    const kpi = DAILY_MANAGEMENT_DEMO_METRICS.find((item) => item.id === id);
    if (!kpi || !kpi.performanceThreshold || !("amberBoundary" in kpi.performanceThreshold)) return [];
    const target = targetOverrides[id] ?? kpi.target;
    const amberBoundary = thresholdOverrides[id] ?? kpi.performanceThreshold.amberBoundary;
    return [{
      id: `VMKA-DEMO-${boardId}-${index + 1}`,
      boardId,
      kpiId: kpi.id,
      target,
      performanceThreshold: { direction: kpi.direction as "higher_is_better" | "lower_is_better", amberBoundary },
      displayOrder: index,
      isVisible: true,
      assignedAt: DEMO_STAMP,
      assignedByUserId: ownerId,
    } satisfies VisualManagementKpiAssignment];
  });
}

const DEMO_ASSIGNMENTS: VisualManagementKpiAssignment[] = [
  ...demoAssignments("VM-ZA-T1", PRIMARY_DEMO_IDS, "USR-LAKSHMAN"),
  ...demoAssignments(
    "VM-ZB-T1",
    ZONE_B_DEMO_IDS,
    "USR-MADAVAN",
    { "VMK-DM-FPY": 97, "VMK-DM-REJECTION": 3, "VMK-DM-PRODUCTION": 320, "VMK-DM-ATTENDANCE": 94, "VMK-DM-SCRAP": 15000 },
    { "VMK-DM-FPY": 94, "VMK-DM-REJECTION": 4, "VMK-DM-PRODUCTION": 300, "VMK-DM-ATTENDANCE": 90, "VMK-DM-SCRAP": 20000 },
  ),
];

function demoPeriod(day: number): KpiReportingPeriod {
  const key = `2026-10-${String(day).padStart(2, "0")}`;
  const date = new Date(`${key}T12:00:00+05:30`);
  return { type: "daily", key, label: new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(date) };
}

function demoHistory(): Pick<ExecutionState, "actualEntries" | "deviations"> {
  const patterns: Record<string, number[]> = {
    "VMK-DM-SAFETY": [0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0],
    "VMK-DM-NEAR-MISS": [0,0,1,0,0,0,0,1,0,0,0,0,0,0,2,0,0,0,0,1,0,0,0,0,0,0],
    "VMK-DM-FPY": [98.7,98.2,97.1,0,98.5,96.4,98.9,98.1,94.2,97.6,0,98.4,99.0,96.2,98.3,97.4,98.8,0,98.2,95.6,98.6,99.1,97.2,98.4,0,98.7],
    "VMK-DM-REJECTION": [1.5,1.9,2.4,0,1.7,2.7,1.4,1.8,3.8,2.2,0,1.6,1.3,2.8,1.9,2.5,1.5,0,1.7,2.9,1.4,1.2,2.4,1.8,0,1.5],
    "VMK-DM-PRODUCTION": [356,348,331,0,352,326,361,344,304,337,0,355,363,323,348,335,359,0,351,319,358,365,329,346,0,354],
    "VMK-DM-OTD": [99,98,96,0,99,97,100,98,94,97,0,99,100,96,98,97,99,0,98,95,99,100,96,98,0,99],
    "VMK-DM-ATTENDANCE": [97,96,94,0,98,95,97,96,89,94,0,97,98,93,96,95,98,0,97,91,96,99,94,97,0,98],
    "VMK-DM-5S": [93,91,87,0,94,89,95,92,78,88,0,93,96,86,91,89,94,0,92,82,93,95,88,91,0,94],
  };
  const reasons: Record<string, string> = {
    "VMK-DM-FPY": "Increased rework from Line 2 during first shift.",
    "VMK-DM-REJECTION": "Material variation increased rejection during the morning shift.",
    "VMK-DM-PRODUCTION": "Machine downtime reduced available production time.",
    "VMK-DM-OTD": "Dispatch sequencing delayed customer orders.",
    "VMK-DM-ATTENDANCE": "Higher absenteeism during morning shift.",
    "VMK-DM-5S": "Material segregation and aisle marking were incomplete.",
    "VMK-DM-SAFETY": "Forklift and pedestrian movement overlapped near dispatch.",
    "VMK-DM-NEAR-MISS": "Forklift and pedestrian movement overlapped near dispatch.",
  };
  const actualEntries: KpiActualEntry[] = [];
  const deviations: KpiDeviation[] = [];
  Object.entries(patterns).forEach(([kpiId, values]) => {
    const kpi = DAILY_MANAGEMENT_DEMO_METRICS.find((item) => item.id === kpiId);
    const assignment = DEMO_ASSIGNMENTS.find((item) => item.boardId === "VM-ZA-T1" && item.kpiId === kpiId);
    const threshold = assignment?.performanceThreshold;
    if (!kpi || !assignment || !threshold) return;
    values.forEach((value, index) => {
      const period = demoPeriod(index + 1);
      const neutral = [4, 11, 18, 25].includes(index + 1);
      const status = neutral ? "unavailable" : evaluateKpiPerformance(value, kpi.measurementType, kpi.direction, assignment.target ?? kpi.target, threshold);
      const id = `VMKAE-DEMO-${kpiId}-${period.key}`;
      actualEntries.push({ id, boardId: "VM-ZA-T1", kpiId, value: neutral ? 0 : value, reportingPeriod: period, reportedAt: `${period.key}T08:45:00.000Z`, reportedByUserId: "USR-LAKSHMAN", comment: status === "amber" || status === "red" ? reasons[kpiId] : undefined, statusSnapshot: status, neutralReason: neutral ? "no_production_holiday" : undefined, targetSnapshot: assignment.target ?? kpi.target, thresholdSnapshot: { ...threshold }, measurementSnapshot: kpi.measurementType, directionSnapshot: kpi.direction, createdAt: `${period.key}T08:45:00.000Z` });
      if (status === "amber" || status === "red") deviations.push({ id: `VMKD-DEMO-${kpiId}-${period.key}`, kpiActualEntryId: id, kpiId, boardId: "VM-ZA-T1", status, comment: reasons[kpiId], correctiveActionRequired: true, createdByUserId: "USR-LAKSHMAN", createdAt: `${period.key}T08:45:00.000Z` });
    });
  });
  return { actualEntries, deviations };
}

function mergeDemoState(current: ExecutionState): ExecutionState {
  const history = demoHistory();
  const assignments = [...current.assignments, ...DEMO_ASSIGNMENTS.filter((seed) => !current.assignments.some((item) => item.boardId === seed.boardId && item.kpiId === seed.kpiId))];
  const actualEntries = [...current.actualEntries, ...history.actualEntries.filter((seed) => !current.actualEntries.some((item) => item.boardId === seed.boardId && item.kpiId === seed.kpiId && item.reportingPeriod.key === seed.reportingPeriod.key))];
  const deviations = [...current.deviations, ...history.deviations.filter((seed) => !current.deviations.some((item) => item.kpiActualEntryId === seed.kpiActualEntryId))];
  return { assignments, actualEntries, deviations };
}
let state = EMPTY; let loaded = false; const listeners = new Set<() => void>();
function uid(prefix: string) { return `${prefix}-${globalThis.crypto?.randomUUID?.().slice(0, 8) ?? Date.now()}`; }
function load() { if (loaded || typeof window === "undefined") return; loaded = true; try { const stored = window.localStorage.getItem(STORAGE_KEY); const parsed = JSON.parse(stored ?? "null") as Partial<ExecutionState> | null; const current = parsed ? { assignments: Array.isArray(parsed.assignments) ? parsed.assignments : [], actualEntries: Array.isArray(parsed.actualEntries) ? parsed.actualEntries : [], deviations: Array.isArray(parsed.deviations) ? parsed.deviations : [] } : EMPTY; state = mergeDemoState(current); if (stored !== null) safeSetStorage(STORAGE_KEY, state); } catch { state = mergeDemoState(EMPTY); } }
function snapshot() { load(); return state; } function subscribe(listener: () => void) { load(); listeners.add(listener); return () => listeners.delete(listener); }
function persist(next: ExecutionState) { const previous = state; state = next; const result = typeof window === "undefined" ? { success: true } : safeSetStorage(STORAGE_KEY, next); if (!result.success) { state = previous; return false; } listeners.forEach((listener) => listener()); return true; }
export function useKpiExecution() { return useSyncExternalStore(subscribe, snapshot, () => EMPTY); }
export function getKpiExecution() { return snapshot(); }
export function assignKpiToBoard(boardId: string, kpiId: string, assignedByUserId: string, configuration?: { target: number; performanceThreshold: KpiPerformanceThreshold }) {
  if (!canManageVisualManagementConfiguration({ id: assignedByUserId })) return { success: false as const, error: "Configuration permission is required." };
 const current = snapshot(); const kpi = getVisualManagementKpi(kpiId); if (!boardId || !assignedByUserId) return { success: false as const, error: "Board and assigning user are required." }; if (!kpi || kpi.status !== "active") return { success: false as const, error: "Only active configured KPIs can be assigned." }; const target = configuration?.target ?? kpi.target; const performanceThreshold = configuration?.performanceThreshold ?? kpi.performanceThreshold; const thresholdError = validatePerformanceThreshold(kpi.direction, target, performanceThreshold); if (thresholdError) return { success: false as const, error: thresholdError }; const existing = current.assignments.find((item) => item.boardId === boardId && item.kpiId === kpiId); if (existing?.isVisible) return { success: false as const, error: "This KPI is already assigned to the board." }; const now = new Date().toISOString(); const assignment: VisualManagementKpiAssignment = existing ? { ...existing, target, performanceThreshold, isVisible: true, assignedAt: now, assignedByUserId } : { id: uid("VMKA"), boardId, kpiId, target, performanceThreshold, displayOrder: current.assignments.filter((item) => item.boardId === boardId && item.isVisible).length, isVisible: true, assignedAt: now, assignedByUserId }; const next = existing ? current.assignments.map((item) => item.id === existing.id ? assignment : item) : [...current.assignments, assignment]; return persist({ ...current, assignments: next }) ? { success: true as const, assignment } : { success: false as const, error: "Assignment could not be saved." }; }
export function configureBoardKpiAssignment(boardId: string, kpiId: string, target: number, performanceThreshold: KpiPerformanceThreshold, actor?: VisualManagementActor) {
  if (!canManageVisualManagementConfiguration(actor)) return { success: false as const, error: "Configuration permission is required." };
 const current = snapshot(); const kpi = getVisualManagementKpi(kpiId); const assignment = current.assignments.find((item) => item.boardId === boardId && item.kpiId === kpiId && item.isVisible); if (!kpi || !assignment) return { success: false as const, error: "Board metric assignment was not found." }; const error = validatePerformanceThreshold(kpi.direction, target, performanceThreshold); if (error) return { success: false as const, error }; const updated = { ...assignment, target, performanceThreshold }; return persist({ ...current, assignments: current.assignments.map((item) => item.id === assignment.id ? updated : item) }) ? { success: true as const, assignment: updated } : { success: false as const, error: "Board metric could not be saved." }; }
export function getBoardKpiAssignment(boardId: string, kpiId: string) { return snapshot().assignments.find((item) => item.boardId === boardId && item.kpiId === kpiId && item.isVisible); }
export function unassignKpiFromBoard(boardId: string, kpiId: string, actor?: VisualManagementActor) {
  if (!canManageVisualManagementConfiguration(actor)) return false;
 const current = snapshot(); const existing = current.assignments.find((item) => item.boardId === boardId && item.kpiId === kpiId && item.isVisible); if (!existing) return false; return persist({ ...current, assignments: current.assignments.map((item) => item.id === existing.id ? { ...item, isVisible: false } : item) }); }
export function getLatestActual(boardId: string, kpiId: string) { return snapshot().actualEntries.filter((item) => item.boardId === boardId && item.kpiId === kpiId).sort((a, b) => b.reportedAt.localeCompare(a.reportedAt))[0]; }
export function submitKpiActual(input: { boardId: string; kpiId: string; value: number; reportingPeriod: KpiReportingPeriod; reportedByUserId: string; comment?: string; deviationComment?: string; correctiveActionRequired?: boolean; noActionJustification?: string; neutralReason?: "no_production_holiday" }) {
  if (!canOperateVisualManagementBoard(getVisualManagementConfiguration().boards.find(board => board.id === input.boardId), { id: input.reportedByUserId })) return { success: false as const, error: "Board operation permission is required." };

  const current = snapshot(); const kpi = getVisualManagementKpi(input.kpiId); if (!kpi) return { success: false as const, error: "Configured KPI is unavailable." }; if (kpi.status !== "active") return { success: false as const, error: "Archived KPIs cannot accept new actuals." }; if (!current.assignments.some((item) => item.boardId === input.boardId && item.kpiId === input.kpiId && item.isVisible)) return { success: false as const, error: "KPI is not assigned to this board." }; if (!input.reportingPeriod.key.trim() || !input.reportingPeriod.label.trim()) return { success: false as const, error: "Reporting period is required." }; if (!input.reportedByUserId) return { success: false as const, error: "Reporting user is required." }; const normalizedKey = normalizedReportingPeriodKey(input.reportingPeriod); if (current.actualEntries.some((item) => item.boardId === input.boardId && item.kpiId === input.kpiId && item.reportingPeriod.type === input.reportingPeriod.type && normalizedReportingPeriodKey(item.reportingPeriod) === normalizedKey)) return { success: false as const, error: `${input.reportingPeriod.label} already has a reported actual for this board and KPI.` };
  const assignment = current.assignments.find((item) => item.boardId === input.boardId && item.kpiId === input.kpiId && item.isVisible)!; const target = assignment.target ?? kpi.target; const performanceThreshold = assignment.performanceThreshold ?? kpi.performanceThreshold; const thresholdError = validatePerformanceThreshold(kpi.direction, target, performanceThreshold); if (thresholdError) return { success: false as const, error: thresholdError }; const status = input.neutralReason ? "unavailable" : evaluateKpiPerformance(input.value, kpi.measurementType, kpi.direction, target, performanceThreshold); if (status === "unavailable" && !input.neutralReason) return { success: false as const, error: "Actual value or performance configuration is invalid." };
  if ((status === "amber" || status === "red") && !input.deviationComment?.trim()) return { success: false as const, error: "Deviation comment is required for Amber or Red performance." }; if ((status === "amber" || status === "red") && input.correctiveActionRequired === undefined) return { success: false as const, error: "Confirm whether corrective action is required." }; if ((status === "amber" || status === "red") && input.correctiveActionRequired === false && !input.noActionJustification?.trim()) return { success: false as const, error: "Explain why corrective action is not required." };
  const now = new Date().toISOString(); const entry: KpiActualEntry = { id: uid("VMKAE"), boardId: input.boardId, kpiId: input.kpiId, value: input.neutralReason ? 0 : input.value, reportingPeriod: { ...input.reportingPeriod }, reportedAt: now, reportedByUserId: input.reportedByUserId, comment: input.comment?.trim() || undefined, statusSnapshot: status, neutralReason: input.neutralReason, targetSnapshot: target, thresholdSnapshot: { ...performanceThreshold! }, measurementSnapshot: kpi.measurementType, directionSnapshot: kpi.direction, createdAt: now };
  const deviation: KpiDeviation | undefined = status === "amber" || status === "red" ? { id: uid("VMKD"), kpiActualEntryId: entry.id, kpiId: input.kpiId, boardId: input.boardId, status, comment: input.deviationComment!.trim(), correctiveActionRequired: input.correctiveActionRequired!, noActionJustification: input.correctiveActionRequired ? undefined : input.noActionJustification!.trim(), createdByUserId: input.reportedByUserId, createdAt: now } : undefined;
  return persist({ ...current, actualEntries: [...current.actualEntries, entry], deviations: deviation ? [...current.deviations, deviation] : current.deviations }) ? { success: true as const, entry, deviation } : { success: false as const, error: "Actual could not be saved." };
}
export function linkDeviationAction(deviationId: string, actionId: string, actor?: VisualManagementActor) {
  const parent = snapshot().deviations.find(item => item.id === deviationId); if (!parent || !canOperateVisualManagementBoard(getVisualManagementConfiguration().boards.find(board => board.id === parent.boardId), actor)) return false;
 const current = snapshot(); const deviation = current.deviations.find((item) => item.id === deviationId); if (!deviation || deviation.actionId || !actionId) return false; return persist({ ...current, deviations: current.deviations.map((item) => item.id === deviationId ? { ...item, actionId } : item) }); }
export function moveBoardKpiAssignment(boardId: string, kpiId: string, direction: -1 | 1, actor?: VisualManagementActor) {
  if (!canManageVisualManagementConfiguration(actor)) return false;
 const current = snapshot(); const ordered = current.assignments.filter((item) => item.boardId === boardId && item.isVisible).sort((a, b) => a.displayOrder - b.displayOrder); const index = ordered.findIndex((item) => item.kpiId === kpiId); const target = ordered[index + direction]; if (index < 0 || !target) return true; const selected = ordered[index]; return persist({ ...current, assignments: current.assignments.map((item) => item.id === selected.id ? { ...item, displayOrder: target.displayOrder } : item.id === target.id ? { ...item, displayOrder: selected.displayOrder } : item) }); }
export function createMeetingKpiReviewSnapshots(meetingId: string, boardId: string, reviewedByUserId: string): MeetingKpiReviewSnapshot[] { const current = snapshot(); return current.assignments.filter((item) => item.boardId === boardId && item.isVisible).flatMap((assignment) => { const kpi = getVisualManagementKpi(assignment.kpiId); if (!kpi) return []; const entry = getLatestActual(boardId, kpi.id); const deviation = entry ? current.deviations.find((item) => item.kpiActualEntryId === entry.id) : undefined; return [{ id: uid("VMKR"), meetingId, boardId, kpiId: kpi.id, kpiActualEntryId: entry?.id, kpiNameSnapshot: kpi.name, kpiLevelSnapshot: kpi.level, bucketSnapshot: kpi.bucket, reportingPeriodSnapshot: entry ? { ...entry.reportingPeriod } : undefined, actualSnapshot: entry?.value, targetSnapshot: entry?.targetSnapshot ?? assignment.target ?? kpi.target, statusSnapshot: entry?.statusSnapshot ?? "unavailable", deviationSnapshot: deviation?.comment, correctiveActionRequiredSnapshot: deviation?.correctiveActionRequired, noActionJustificationSnapshot: deviation?.noActionJustification, actionId: deviation?.actionId, reviewedAt: new Date().toISOString(), reviewedByUserId }]; }); }
export function setKpiExecutionForTests(next: ExecutionState) { state = next; loaded = true; }

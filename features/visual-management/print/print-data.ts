import type { VisualManagementKpiDefinition, KpiBucket, KpiPerformanceStatus } from "../kpi-configuration";
import type { KpiActualEntry, VisualManagementKpiAssignment } from "../kpi-execution-store";
import type { VisualManagementBoard } from "../types";

export type PrintDayStatus = KpiPerformanceStatus | "no-entry";

export interface PrintMetricDay {
  day: number;
  actual?: number;
  target?: number;
  status: PrintDayStatus;
  neutralReason?: KpiActualEntry["neutralReason"];
}

export interface PrintMetric {
  definition: VisualManagementKpiDefinition;
  assignment: VisualManagementKpiAssignment;
  days: PrintMetricDay[];
}

export interface PrintCategory {
  bucket: KpiBucket;
  label: string;
  glyph: string;
  metrics: PrintMetric[];
  days: PrintMetricDay[];
}

export interface PrintBoardData {
  board: VisualManagementBoard;
  periodKey: string;
  periodLabel: string;
  daysInMonth: number;
  categories: PrintCategory[];
}

const PRINT_BUCKETS: KpiBucket[] = ["safety", "quality", "delivery", "people", "morale", "5s"];
const BUCKET_PRESENTATION: Partial<Record<KpiBucket, { label: string; glyph: string }>> = {
  safety: { label: "Safety", glyph: "S" }, quality: { label: "Quality", glyph: "Q" },
  delivery: { label: "Delivery", glyph: "D" }, people: { label: "People", glyph: "P" },
  morale: { label: "Morale", glyph: "M" }, "5s": { label: "5S", glyph: "5S" },
};
const STATUS_WEIGHT: Record<PrintDayStatus, number> = { red: 4, amber: 3, green: 2, unavailable: 1, "no-entry": 0 };

export function worstPrintStatus(statuses: readonly PrintDayStatus[]): PrintDayStatus {
  const recorded = statuses.filter((status) => status !== "no-entry");
  if (!recorded.length) return "no-entry";
  const performance = recorded.filter((status) => status !== "unavailable");
  if (!performance.length) return "unavailable";
  return performance.reduce((worst, status) => STATUS_WEIGHT[status] > STATUS_WEIGHT[worst] ? status : worst, performance[0]);
}

export function getAvailablePrintPeriods(entries: readonly KpiActualEntry[], boardId: string): string[] {
  return [...new Set(entries.filter((entry) => entry.boardId === boardId && entry.reportingPeriod.type === "daily" && /^\d{4}-\d{2}-\d{2}$/.test(entry.reportingPeriod.key)).map((entry) => entry.reportingPeriod.key.slice(0, 7)))].sort().reverse();
}

export function buildPrintBoardData(input: { board: VisualManagementBoard; periodKey: string; assignments: readonly VisualManagementKpiAssignment[]; definitions: readonly VisualManagementKpiDefinition[]; actualEntries: readonly KpiActualEntry[] }): PrintBoardData {
  const [year, month] = input.periodKey.split("-").map(Number);
  const validPeriod = Number.isInteger(year) && month >= 1 && month <= 12;
  const daysInMonth = validPeriod ? new Date(Date.UTC(year, month, 0)).getUTCDate() : 31;
  const periodLabel = validPeriod ? new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 1))) : input.periodKey;
  const activeAssignments = input.assignments.filter((assignment) => assignment.boardId === input.board.id && assignment.isVisible).sort((a, b) => a.displayOrder - b.displayOrder);
  const metrics = activeAssignments.flatMap((assignment) => {
    const definition = input.definitions.find((item) => item.id === assignment.kpiId);
    if (!definition || !PRINT_BUCKETS.includes(definition.bucket)) return [];
    const records = input.actualEntries.filter((entry) => entry.boardId === input.board.id && entry.kpiId === definition.id && entry.reportingPeriod.type === "daily" && entry.reportingPeriod.key.startsWith(`${input.periodKey}-`));
    const byDay = new Map(records.map((entry) => [Number(entry.reportingPeriod.key.slice(-2)), entry]));
    const days = Array.from({ length: daysInMonth }, (_, index): PrintMetricDay => {
      const day = index + 1; const entry = byDay.get(day);
      return entry ? { day, actual: entry.neutralReason ? undefined : entry.value, target: entry.targetSnapshot, status: entry.statusSnapshot, neutralReason: entry.neutralReason } : { day, status: "no-entry" };
    });
    return [{ definition, assignment, days } satisfies PrintMetric];
  });
  const categories = PRINT_BUCKETS.flatMap((bucket) => {
    const bucketMetrics = metrics.filter((metric) => metric.definition.bucket === bucket);
    const presentation = BUCKET_PRESENTATION[bucket];
    if (!bucketMetrics.length || !presentation) return [];
    const days = Array.from({ length: daysInMonth }, (_, index): PrintMetricDay => {
      const metricDays = bucketMetrics.map((metric) => metric.days[index]);
      const status = worstPrintStatus(metricDays.map((day) => day.status));
      return { day: index + 1, status, neutralReason: status === "unavailable" ? "no_production_holiday" : undefined };
    });
    return [{ bucket, ...presentation, metrics: bucketMetrics, days } satisfies PrintCategory];
  });
  return { board: input.board, periodKey: input.periodKey, periodLabel, daysInMonth, categories };
}

export interface MonthlyPoint { periodKey: string; label: string; actual?: number; target?: number; status: PrintDayStatus }
export function getPrintSheetCount(categoryCount: number, daily: boolean, monthly: boolean) { return Math.max(0, categoryCount) * Number(daily) + Math.max(0, categoryCount) * Number(monthly); }
export function buildMonthlyTrend(metric: PrintMetric, entries: readonly KpiActualEntry[], boardId: string, throughPeriod: string, months = 6): MonthlyPoint[] {
  const [endYear, endMonth] = throughPeriod.split("-").map(Number);
  return Array.from({ length: months }, (_, index) => {
    const date = new Date(Date.UTC(endYear, endMonth - 1 - (months - index - 1), 1));
    const key = date.toISOString().slice(0, 7);
    const records = entries.filter((entry) => entry.boardId === boardId && entry.kpiId === metric.definition.id && entry.reportingPeriod.type === "daily" && entry.reportingPeriod.key.startsWith(`${key}-`) && !entry.neutralReason);
    const value = records.length ? (metric.definition.aggregation === "sum" || metric.definition.simpleMetricType === "event" ? records.reduce((sum, entry) => sum + entry.value, 0) : records.reduce((sum, entry) => sum + entry.value, 0) / records.length) : undefined;
    return { periodKey: key, label: new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(date), actual: value, target: records.at(-1)?.targetSnapshot ?? metric.assignment.target ?? metric.definition.target, status: records.length ? worstPrintStatus(records.map((entry) => entry.statusSnapshot)) : "no-entry" };
  });
}

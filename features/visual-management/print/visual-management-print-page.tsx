"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, Printer } from "lucide-react";
import { OpsSearchableSelect } from "@/components/ops/ops-searchable-select";
import { Button } from "@/components/ui/button";
import { useKpiExecution } from "../kpi-execution-store";
import { useVisualManagementKpis } from "../kpi-configuration-store";
import { useVisualManagementStore } from "../visual-management-store";
import { DailyTrendLetter } from "./daily-trend-letter";
import { buildMonthlyTrend, buildPrintBoardData, getAvailablePrintPeriods, type PrintCategory, type PrintDayStatus, type PrintMetric } from "./print-data";
import styles from "./visual-management-print.module.css";

const STATUS_TEXT: Record<PrintDayStatus, string> = { green: "G", amber: "A", red: "R", unavailable: "Holiday", "no-entry": "—" };
function currentMonthKey() { return new Date().toISOString().slice(0, 7); }

export default function VisualManagementPrintPage({ boardId }: { boardId: string }) {
  const vm = useVisualManagementStore(); const execution = useKpiExecution(); const definitions = useVisualManagementKpis();
  const board = vm.boards.find((item) => item.id === boardId);
  const availablePeriods = useMemo(() => getAvailablePrintPeriods(execution.actualEntries, boardId), [boardId, execution.actualEntries]);
  const [period, setPeriod] = useState(() => availablePeriods[0] ?? currentMonthKey());
  const [paper, setPaper] = useState<"A3" | "A4">("A3"); const [daily, setDaily] = useState(true); const [monthly, setMonthly] = useState(false);
  const allData = useMemo(() => board ? buildPrintBoardData({ board, periodKey: period, assignments: execution.assignments, definitions, actualEntries: execution.actualEntries }) : undefined, [board, definitions, execution.actualEntries, execution.assignments, period]);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const categories = allData?.categories.filter((category) => !excluded.has(category.bucket)) ?? [];
  if (!board || !allData) return <main className={styles.missing}><h1>Board not found</h1><p>This Visual Management board is unavailable.</p><Button variant="outline" nativeButton={false} render={<Link href="/visual-management/boards" />}>Back to Boards</Button></main>;
  const toggleCategory = (bucket: string) => setExcluded((current) => { const next = new Set(current); if (next.has(bucket)) next.delete(bucket); else next.add(bucket); return next; });
  return <main className={`${styles.workspace} ${paper === "A3" ? styles.a3 : styles.a4}`}>
    <aside className={styles.controls}>
      <div><Button variant="ghost" size="sm" nativeButton={false} render={<Link href={`/visual-management/boards/${encodeURIComponent(board.id)}`} />}><ArrowLeft />Board</Button><h1>Print Daily Management Board</h1><p>Prepare a board pack using the same KPI actuals recorded in Visual Management.</p></div>
      <div className={styles.controlGroup}><span>Board</span><strong>{board.name}</strong><small>{[board.plant, board.zone].filter(Boolean).join(" · ")}</small></div>
      <label className={styles.controlGroup}><span>Period</span><OpsSearchableSelect label="Reporting period" value={period} onValueChange={setPeriod} options={[...new Set([period, ...availablePeriods])].map(key => ({ value: key, label: new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${key}-01T00:00:00Z`)) }))} /></label>
      <fieldset><legend>Print size</legend><div className={styles.segmented}>{(["A3", "A4"] as const).map((size) => <button type="button" key={size} className={paper === size ? styles.active : ""} onClick={() => setPaper(size)}>{size}</button>)}</div><small className={styles.recommendation}>Recommended: A3 Landscape</small></fieldset>
      <fieldset><legend>Content</legend><Check label="Daily Trend" checked={daily} onChange={setDaily} /><Check label="Monthly Trend" checked={monthly} onChange={setMonthly} /></fieldset>
      <fieldset><legend>Categories</legend>{allData.categories.map((category) => <Check key={category.bucket} label={category.label} checked={!excluded.has(category.bucket)} onChange={() => toggleCategory(category.bucket)} />)}</fieldset>
      <div className={styles.actions}><Button variant="outline" onClick={() => document.querySelector(`.${styles.preview}`)?.scrollIntoView({ behavior: "smooth" })}><Eye />Preview</Button><Button onClick={() => window.print()} disabled={!categories.length || (!daily && !monthly)}><Printer />Print / Save as PDF</Button><small>For a clean board print, disable “Headers and footers” in the browser print dialog.</small></div>
    </aside>
    <section id="visual-management-print-root" data-paper={paper} className={styles.preview} aria-label="Print preview">
      {!categories.length || (!daily && !monthly) ? <div className={styles.empty}>Select at least one category and content section to preview.</div> : categories.flatMap((category) => [daily ? <DailySheet key={`${category.bucket}-daily`} data={allData} category={category} /> : null, monthly ? <MonthlySheet key={`${category.bucket}-monthly`} data={allData} category={category} entries={execution.actualEntries} /> : null])}
    </section>
  </main>;
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) { return <label className={styles.check}><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span>{label}</span></label>; }

function PrintSheet({ children }: { children: ReactNode }) { return <article data-print-sheet className={styles.sheet}>{children}</article>; }

function SheetHeader({ title, data, category }: { title: string; data: ReturnType<typeof buildPrintBoardData>; category: PrintCategory }) { return <header className={styles.sheetHeader}><div><span>Daily Management System</span><h2>{category.label} — {title}</h2></div><dl><div><dt>Board</dt><dd>{data.board.name}</dd></div><div><dt>Plant / Zone</dt><dd>{data.board.plant}{data.board.zone ? ` / ${data.board.zone}` : ""}</dd></div><div><dt>Month</dt><dd>{data.periodLabel}</dd></div></dl></header>; }

function DailySheet({ data, category }: { data: ReturnType<typeof buildPrintBoardData>; category: PrintCategory }) { const primary = category.metrics[0]; return <PrintSheet><SheetHeader title="Daily Trend" data={data} category={category} /><div data-print-hero className={styles.dailyHero}><DailyTrendLetter category={category} /><TargetPanel metric={primary} /></div><Legend /><DailyTable category={category} /><footer>Generated from OPS</footer></PrintSheet>; }
function TargetPanel({ metric }: { metric: PrintMetric }) { const target = metric.assignment.target ?? metric.definition.target; const sign = metric.definition.direction === "higher_is_better" ? "≥" : metric.definition.direction === "lower_is_better" ? "≤" : "="; return <aside data-print-target className={styles.targetPanel}><span>Primary KPI</span><strong>{metric.definition.name}</strong><span>Target</span><b>{sign} {target}{metric.definition.measurementType === "percentage" ? "%" : ""}</b><small>{metric.definition.unit ?? metric.definition.measurementType.replace("number", "")}</small><em>{metric.definition.direction.replaceAll("_", " ")}</em></aside>; }
function Legend() { return <div data-print-legend className={styles.legend}>{(["green", "amber", "red", "unavailable", "no-entry"] as PrintDayStatus[]).map((status) => <span key={status}><i className={`${styles.swatch} ${styles[status]}`} />{status === "unavailable" ? "No Production / Holiday" : status === "no-entry" ? "No Entry" : status[0].toUpperCase() + status.slice(1)}</span>)}</div>; }
function DailyTable({ category }: { category: PrintCategory }) { return <div data-print-table className={styles.tableWrap}><table><thead><tr><th>KPI / Day</th>{category.days.map((day) => <th key={day.day}>{String(day.day).padStart(2, "0")}</th>)}</tr></thead><tbody>{category.metrics.flatMap((metric) => [<tr key={`${metric.definition.id}-target`}><th>{metric.definition.name}<small>Target</small></th>{metric.days.map((day) => <td key={day.day}>{day.target ?? metric.assignment.target ?? metric.definition.target}</td>)}</tr>, <tr key={`${metric.definition.id}-actual`}><th>Actual</th>{metric.days.map((day) => <td key={day.day}>{day.neutralReason ? "H" : day.actual ?? "—"}</td>)}</tr>, <tr key={`${metric.definition.id}-status`}><th>Status</th>{metric.days.map((day) => <td key={day.day} className={styles[day.status]}>{STATUS_TEXT[day.status]}</td>)}</tr>])}</tbody></table></div>; }

function MonthlySheet({ data, category, entries }: { data: ReturnType<typeof buildPrintBoardData>; category: PrintCategory; entries: ReturnType<typeof useKpiExecution>["actualEntries"] }) { return <PrintSheet><SheetHeader title="Monthly Trend" data={data} category={category} /><div data-print-monthly className={styles.monthlyGrid}>{category.metrics.map((metric) => { const points = buildMonthlyTrend(metric, entries, data.board.id, data.periodKey); const maximum = Math.max(1, ...points.map((point) => point.actual ?? 0), ...points.map((point) => point.target ?? 0)); return <section key={metric.definition.id} className={styles.chart}><h3>{metric.definition.name}</h3><div className={styles.bars}>{points.map((point) => <div key={point.periodKey} className={styles.barColumn}><div className={styles.barTrack}>{point.actual === undefined ? <span className={styles.noMonthly}>—</span> : <span className={`${styles.bar} ${styles[point.status]}`} style={{ height: `${Math.max(4, point.actual / maximum * 100)}%` }}><b>{formatValue(point.actual)}</b></span>}</div><small>{point.label}</small></div>)}</div><p>Target: {metric.assignment.target ?? metric.definition.target} {metric.definition.unit ?? ""} · {metric.definition.simpleMetricType === "event" ? "Monthly total" : "Monthly average"}</p></section>; })}</div><footer>Generated from OPS</footer></PrintSheet>; }
function formatValue(value: number) { return Number.isInteger(value) ? String(value) : value.toFixed(1); }

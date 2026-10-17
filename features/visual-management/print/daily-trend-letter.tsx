import type { PrintCategory, PrintDayStatus } from "./print-data";
import styles from "./visual-management-print.module.css";

const STATUS_LABEL: Record<PrintDayStatus, string> = { green: "Green", amber: "Amber", red: "Red", unavailable: "No Production / Holiday", "no-entry": "No entry" };

export function DailyTrendLetter({ category }: { category: PrintCategory }) {
  return <div data-print-letter className={styles.trendLetter} aria-label={`${category.label} daily performance`}>
    <span data-print-glyph className={styles.glyph} aria-hidden="true">{category.glyph}</span>
    <div className={styles.markerGrid}>{category.days.map((day) => <span data-print-marker key={day.day} className={`${styles.marker} ${styles[day.status]}`} title={`${String(day.day).padStart(2, "0")}: ${STATUS_LABEL[day.status]}`} aria-label={`Day ${day.day}: ${STATUS_LABEL[day.status]}`}>{String(day.day).padStart(2, "0")}</span>)}</div>
  </div>;
}

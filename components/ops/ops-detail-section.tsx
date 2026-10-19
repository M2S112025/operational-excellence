import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

/** Native disclosure keeps form content mounted and supports keyboard toggling. */
export function OpsDetailSection({ title, description, trailing, children, defaultOpen = true, testId }: {
  title: string;
  description?: string;
  trailing?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  testId?: string;
}) {
  return <details open={defaultOpen} data-slot="card" data-testid={testId} className="group/detail-section min-w-0 rounded-xl border bg-card shadow-sm [overflow-wrap:anywhere]">
    <summary aria-label={title} className="flex min-h-12 cursor-pointer list-none items-center gap-3 rounded-xl px-5 py-4 outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
      <h2 className="min-w-0 flex-1 text-sm font-semibold">{title}</h2>
      {trailing}
      <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground transition-transform group-open/detail-section:rotate-180" />
    </summary>
    <div className="grid min-w-0 gap-5 border-t p-5">
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      {children}
    </div>
  </details>;
}

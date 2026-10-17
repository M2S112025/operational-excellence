import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
/** Shared list presentation. Callers supply already-authorized rows and domain-specific mobile cards. */
export function OpsDataTable({ headers, children, mobile, minWidth = 1040, label }: { headers: string[]; children: React.ReactNode; mobile: React.ReactNode; minWidth?: number; label: string }) {
 return <><div className="hidden min-w-0 lg:block"><Table aria-label={label} style={{minWidth}}><TableHeader><TableRow>{headers.map(header=><TableHead key={header} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide last:text-right">{header}</TableHead>)}</TableRow></TableHeader><TableBody className="divide-y divide-border/65">{children}</TableBody></Table></div><div className="grid gap-3 p-3 lg:hidden" aria-label={`${label} cards`}>{mobile}</div></>;
}

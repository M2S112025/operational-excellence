"use client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ORGANIZATIONS } from "@/lib/module-entitlements";
export function AuditQuestionOrganization({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return <div className="mb-4 space-y-2"><p id="audit-question-organization-label" className="text-sm font-medium">Organization</p><Select value={value} onValueChange={id => { if (id) onChange(id); }}><SelectTrigger aria-labelledby="audit-question-organization-label" className="w-full sm:max-w-sm"><SelectValue /></SelectTrigger><SelectContent>{ORGANIZATIONS.map(org => <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>)}</SelectContent></Select></div>;
}

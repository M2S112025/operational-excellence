"use client";

import { type ComponentProps } from "react";
import { OpsSearchableSelect } from "./ops-searchable-select";
import { SelectTrigger } from "@/components/ui/select";

export function filterPeople<T extends { id: string; name: string }>(people: readonly T[], query: string) {
  return people.filter(person => person.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
}

/** Uses the shared searchable control with the unchanged authorized identity list. */
export function OpsPersonSelect({ people, value, onValueChange, label = "Action Owner", disabled = false, clearable = true, entityLabel = "person", entityPlural = "people", showEligibleCount = true, triggerRef, invalid, describedBy, placeholder, triggerClassName }: {
  people: readonly { id: string; name: string; description?: string; disabled?: boolean }[];
  value: string;
  onValueChange: (value: string) => void;
  label?: string;
  disabled?: boolean;
  clearable?: boolean;
  entityLabel?: string;
  entityPlural?: string;
  showEligibleCount?: boolean;
  triggerRef?: ComponentProps<typeof SelectTrigger>["ref"];
  invalid?: boolean;
  describedBy?: string;
  placeholder?: string;
  triggerClassName?: string;
}) {
  return <OpsSearchableSelect options={people.map(person => ({ value: person.id, label: person.name, description: person.description, disabled: person.disabled }))} value={value} onValueChange={onValueChange} label={label} disabled={disabled} clearable={clearable} triggerRef={triggerRef} invalid={invalid} describedBy={describedBy} placeholder={placeholder ?? `Select ${label}`} triggerClassName={triggerClassName} helper={showEligibleCount ? `${people.filter(person => !person.disabled).length} eligible ${people.filter(person => !person.disabled).length === 1 ? entityLabel : entityPlural}` : undefined} />;
}

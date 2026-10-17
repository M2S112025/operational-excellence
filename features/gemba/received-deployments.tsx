"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatShortDate } from "@/lib/actions/action-config";
import { CompactEmpty, ObservationTypeBadge } from "./gemba-components";
import { deploymentObservationHref } from "./gemba-deployment";
import { receivedGembaObservations } from "./gemba-access";

type SharedObservation = ReturnType<typeof receivedGembaObservations>[number];

export default function ReceivedDeployments({ observations }: { observations: SharedObservation[] }) {
  const [search, setSearch] = useState("");
  const [zone, setZone] = useState("All");
  const [type, setType] = useState("All");
  const [date, setDate] = useState("All");
  const now = new Date();
  const last30 = new Date(now); last30.setDate(last30.getDate() - 30);
  const filtered = observations.filter(item => {
    const created = new Date(item.createdAt);
    return [item.id, item.title, item.description, item.location, item.zone, item.plant].join(" ").toLowerCase().includes(search.toLowerCase())
      && (zone === "All" || item.zone === zone) && (type === "All" || item.type === type)
      && (date === "All" || (date === "This Month" ? created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear() : created >= last30));
  });
  return <Card><CardContent className="grid gap-4 pt-4">
    <p className="text-sm text-muted-foreground">Read-only observations shared with Zones you currently lead.</p>
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4"><Input aria-label="Search received deployments" placeholder="Search received deployments..." value={search} onChange={event => setSearch(event.target.value)} />
      <Filter label="Source Zone" value={zone} onChange={setZone} options={[...new Set(observations.map(item => item.zone))].sort()} />
      <Filter label="Observation type" value={type} onChange={setType} options={["Positive", "Opportunity", "Issue"]} />
      <Filter label="Observation date" value={date} onChange={setDate} options={["This Month", "Last 30 Days"]} />
    </div>
    <div className="grid gap-3 sm:grid-cols-2">{filtered.map(item => <Link key={item.id} href={deploymentObservationHref(item.id)} className="rounded-lg border p-4 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><div className="flex flex-wrap items-center justify-between gap-2"><ObservationTypeBadge type={item.type} /><span className="text-xs text-muted-foreground">{item.status} · Read only</span></div><h3 className="mt-3 font-semibold">{item.title}</h3><p className="mt-2 text-xs text-muted-foreground">{item.plant} · {item.zone}</p><p className="mt-1 text-xs text-muted-foreground">{formatShortDate(item.createdAt)} · {item.id}</p></Link>)}</div>
    {filtered.length === 0 && <CompactEmpty title="No received deployments" description="No shared observations match your current leadership and filters." />}
  </CardContent></Card>;
}

function Filter({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return <Select searchLabel={label} value={value} onValueChange={next => onChange(next ?? "All")}><SelectTrigger aria-label={label} className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="All">{label}: All</SelectItem>{options.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select>;
}

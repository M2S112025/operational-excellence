"use client";

import { useState } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";
import FiveSPageHeader from "@/features/five-s/components/FiveSPageHeader";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/lib/current-user";
import { useAdminUsers } from "@/features/five-s/administration/store";
import { useOrganizationConfiguration } from "@/lib/organization-store";
import { formatShortDate } from "@/lib/actions/action-config";
import { useGembaStore } from "./gemba-store";
import { getSharedGembaObservation } from "./gemba-access";
import { GembaEvidenceImage, GembaEvidenceLightbox, ObservationTypeBadge } from "./gemba-components";
import type { GembaEvidence } from "./types";

export default function SharedObservationPage({ observationId }: { observationId: string }) {
  const state = useGembaStore();
  const user = useCurrentUser();
  useAdminUsers();
  useOrganizationConfiguration();
  const [preview, setPreview] = useState<GembaEvidence | null>(null);
  const observation = getSharedGembaObservation(state, observationId, user.id);
  const back = <Button variant="outline" nativeButton={false} render={<Link href="/gemba?tab=observations" />}>Return to Gemba Observations</Button>;
  if (!observation) return <PageContainer><FiveSPageHeader eyebrow="Gemba" title="Shared observation unavailable" description="This observation is no longer shared with you or is outside your permitted scope." />{back}</PageContainer>;
  return <PageContainer><FiveSPageHeader eyebrow="Received Deployment · Read only" title={observation.title} description={`${observation.plant} · ${observation.zone} · ${formatShortDate(observation.createdAt)}`} actions={back} />
    <section className="grid gap-4 rounded-xl border bg-card p-5"><div><ObservationTypeBadge type={observation.type} /><p className="mt-2 font-mono text-xs text-muted-foreground">{observation.id} · {observation.status}</p></div><p className="whitespace-pre-wrap">{observation.description}</p><p className="text-sm text-muted-foreground">Location: {observation.location}</p>
    {observation.evidence.length > 0 && <div><h2 className="mb-3 font-semibold">Observation evidence</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{observation.evidence.map(evidence => <button key={evidence.id} type="button" onClick={() => setPreview(evidence)} className="overflow-hidden rounded-lg border text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><GembaEvidenceImage evidence={evidence} alt={evidence.note || evidence.name} className="aspect-video w-full object-contain" /><span className="block p-3 text-xs">{evidence.note || evidence.name}</span></button>)}</div></div>}
    </section><GembaEvidenceLightbox evidence={preview && observation.evidence.find(item => item.id === preview.id) || null} onOpenChange={open => { if (!open) setPreview(null); }} />
  </PageContainer>;
}

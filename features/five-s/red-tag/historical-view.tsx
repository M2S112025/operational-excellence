"use client";
import { ActionLink } from "@/components/ops/ops-return-link";
/* eslint-disable @next/next/no-img-element -- immutable historical evidence can contain legacy data URLs. */
import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import FiveSPageHeader from "@/features/five-s/components/FiveSPageHeader";
import { RED_TAG_INITIAL_EVIDENCE_LABEL } from "./types";
import type { RedTag } from "./types";
export function HistoricalRedTagView({ tag, print = false }: { tag: RedTag; print?: boolean }) {
 const evidence = [...(tag.imageUrl ? [{ id: "original", name: RED_TAG_INITIAL_EVIDENCE_LABEL, url: tag.imageUrl }] : []), ...(tag.afterEvidence ?? []), ...(tag.dispositionDetails?.evidence ?? []), ...(tag.closure?.evidence ?? [])];
 return <PageContainer><FiveSPageHeader eyebrow="Historical Red Tag · Read only" title={tag.tagNumber} description={`${tag.itemName} · Original status: ${tag.status}`} actions={<Button onClick={() => window.print()}>Print historical record</Button>} /><p className="rounded-lg border p-3 text-sm">This record retains its original workflow and evidence. It has not been migrated or reopened.</p>{tag.actionId && <ActionLink href={`/actions/${encodeURIComponent(tag.actionId)}`}>Associated Action {tag.actionId}</ActionLink>}{!tag.imageUrl && <p>{RED_TAG_INITIAL_EVIDENCE_LABEL}: No evidence captured</p>}{evidence.length > (tag.imageUrl ? 1 : 0) && <h2>After Evidence</h2>}<div className="grid gap-3 sm:grid-cols-2">{evidence.map((item,index) => <figure key={`${item.id}-${index}`}>{item.url && <img src={item.url} alt={item.name === RED_TAG_INITIAL_EVIDENCE_LABEL ? "Historical original condition" : item.name} className="max-h-80 w-full object-contain" />}<figcaption>{item.name}</figcaption></figure>)}</div><pre className="overflow-auto whitespace-pre-wrap rounded-lg border p-4 text-xs">{JSON.stringify(tag, (_key, value) => typeof value === "string" && value.startsWith("data:") ? "[original embedded evidence retained; see evidence display]" : value, 2)}</pre>{!print && <Link href="/5s/red">Back to Red Tags</Link>}</PageContainer>;
}

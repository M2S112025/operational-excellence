"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Printer } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import FiveSPageHeader from "@/features/five-s/components/FiveSPageHeader";
import { useCurrentUser } from "@/lib/current-user";
import { useAdminUsers } from "@/features/five-s/administration/store";
import { useOrganizationConfiguration } from "@/lib/organization-store";
import { canCreateRedTag } from "./access";
import { QrCode } from "./qr-code";
import { getCreateRedTagQrTarget, isValidBulkQrQuantity, parseBulkQrQuantity } from "./qr";

/** Recovered reusable create-form labels; these copies do not allocate records or tag IDs. */
export function BulkCreateQrButton() {
 const router = useRouter(); const user = useCurrentUser();
 const actor = useAdminUsers().find(item => item.id === user.id);
 const organization = useOrganizationConfiguration();
 const plant = organization.plants.find(item => item.status === "Active" && item.name === user.plant);
 const [open, setOpen] = useState(false); const [quantity, setQuantity] = useState("1");
 const valid = isValidBulkQrQuantity(quantity);
 if (!canCreateRedTag(actor)) return null;
 return <><Button onClick={() => setOpen(true)}>Create QR</Button><Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-sm"><DialogHeader><DialogTitle>Create Red Tag QR</DialogTitle></DialogHeader><div className="grid justify-items-center gap-4 py-3 text-center"><p className="text-xl font-black tracking-wide text-red-700">RED TAG</p><QrCode value={getCreateRedTagQrTarget(plant?.id)} size={220} /><div><p className="font-semibold">Scan to create a Red Tag</p><p className="mt-1 text-sm text-muted-foreground">{plant?.name ?? user.plant}</p></div><label className="grid gap-2 text-sm" htmlFor="bulk-qr-quantity">Number of QR labels<Input id="bulk-qr-quantity" className="text-center" type="number" min={1} max={100} step={1} value={quantity} onChange={event => setQuantity(event.target.value)} /></label>{!valid && <p role="alert" className="text-sm text-destructive">Enter a whole number from 1 to 100.</p>}<Button className="w-full" disabled={!valid} onClick={() => router.push(`/5s/red/create-qr/print?${new URLSearchParams({ ...(plant ? { plant: plant.id } : {}), quantity: String(Number(quantity)) }).toString()}`)}><Printer className="size-4" />Print {valid ? Number(quantity) : ""} QR {Number(quantity) === 1 ? "label" : "labels"}</Button></div></DialogContent></Dialog></>;
}

export function RedTagCreateQrPrintPage({ plantRef, quantity: requestedQuantity = 1 }: { plantRef?: string; quantity?: number }) {
 const user = useCurrentUser(); const actor = useAdminUsers().find(item => item.id === user.id);
 const organization = useOrganizationConfiguration();
 const plant = organization.plants.find(item => item.id === plantRef && item.status === "Active" && item.name === user.plant);
 const quantity = parseBulkQrQuantity(requestedQuantity);
 if (!canCreateRedTag(actor) || (plantRef && !plant)) return <PageContainer><p role="alert">Create QR is unavailable for this user or Plant.</p></PageContainer>;
 return <PageContainer className="red-tag-bulk-qr-page max-w-5xl"><style>{`@media print { @page { size: A4 portrait; margin: 10mm; } body:has(.red-tag-bulk-qr-page) * { visibility: hidden !important; } body:has(.red-tag-bulk-qr-page) .red-tag-bulk-qr-labels, body:has(.red-tag-bulk-qr-page) .red-tag-bulk-qr-labels * { visibility: visible !important; } .red-tag-bulk-qr-page { display: block !important; width: 100% !important; max-width: none !important; padding: 0 !important; margin: 0 !important; } .red-tag-bulk-qr-labels { position: absolute; top: 0; left: 0; width: 100%; display: grid !important; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 4mm; } .red-tag-bulk-qr-label { break-inside: avoid; page-break-inside: avoid; } }`}</style><div className="print:hidden"><FiveSPageHeader eyebrow="Red Tag" title="Print Create QR" description={`${quantity} reusable shop-floor QR ${quantity === 1 ? "label" : "labels"} linked to the canonical Create Red Tag form.`} actions={<Button onClick={() => window.print()}><Printer className="size-4" />Print {quantity}</Button>} /><p className="mb-4 text-sm text-muted-foreground">Use your browser&apos;s Save as PDF option to download these labels.</p></div><div className="red-tag-bulk-qr-labels grid gap-4 sm:grid-cols-2">{Array.from({ length: quantity }, (_, index) => <div key={index} className="red-tag-bulk-qr-label grid break-inside-avoid justify-items-center gap-4 rounded-xl border bg-white p-8 text-center text-slate-950"><p className="text-2xl font-black tracking-[0.16em] text-red-700">RED TAG</p><p className="text-lg font-semibold">Scan to create a Red Tag</p><QrCode value={getCreateRedTagQrTarget(plant?.id)} size={220} /><p className="text-sm font-semibold">{plant?.name ?? user.plant}</p></div>)}</div></PageContainer>;
}

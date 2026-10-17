"use client";
/* eslint-disable @next/next/no-img-element -- evidence sources may be captured data URLs. */

import { useState } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function OpsEvidenceViewer({ open, onOpenChange, src, title, description, alt }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  src?: string;
  title?: string;
  description: string;
  alt?: string;
}) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-none grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden bg-zinc-950 p-0 text-white ring-white/15 sm:h-[calc(100dvh-2rem)] sm:w-[calc(100vw-2rem)] sm:max-w-6xl"><DialogHeader className="border-b border-white/10 px-4 py-3 pr-12"><DialogTitle>{title || "Evidence preview"}</DialogTitle><DialogDescription className="text-zinc-400">{description}</DialogDescription></DialogHeader>{src ? <ZoomableEvidence key={`${open}:${src}`} src={src} alt={alt || title || description} /> : <p role="status" className="p-6 text-sm text-zinc-400">Evidence unavailable or still loading.</p>}</DialogContent></Dialog>;
}

function ZoomableEvidence({ src, alt }: { src: string; alt: string }) {
  const [zoom, setZoom] = useState(1);
  return <div className="flex min-h-0 flex-col"><div className="flex shrink-0 items-center justify-center gap-3 border-b border-white/10 p-2" aria-label="Image zoom controls"><button type="button" className="grid size-11 place-items-center rounded hover:bg-white/10 disabled:opacity-40" aria-label="Zoom out" disabled={zoom <= 1} onClick={() => setZoom((value) => Math.max(1, value - 0.25))}><Minus className="size-5" /></button><output aria-live="polite" className="min-w-12 text-center text-sm">{Math.round(zoom * 100)}%</output><button type="button" className="grid size-11 place-items-center rounded hover:bg-white/10 disabled:opacity-40" aria-label="Zoom in" disabled={zoom >= 4} onClick={() => setZoom((value) => Math.min(4, value + 0.25))}><Plus className="size-5" /></button><button type="button" className="grid size-11 place-items-center rounded hover:bg-white/10" aria-label="Reset zoom" onClick={() => setZoom(1)}><RotateCcw className="size-5" /></button></div><div className="min-h-0 flex-1 overflow-auto overscroll-contain" tabIndex={0} aria-label="Image preview; scroll to pan when zoomed"><div className="flex items-center justify-center p-3 sm:p-6" style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%` }}><img src={src} alt={alt} className="max-h-full max-w-full object-contain" /></div></div></div>;
}

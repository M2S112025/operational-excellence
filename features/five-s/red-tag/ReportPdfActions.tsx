"use client";

import { useEffect, useRef, useState } from "react";
import { Download, LoaderCircle, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createPdfFile, downloadPdfBlob, generateReportPdf, sharePdfFile } from "./report-pdf";

export default function ReportPdfActions({ selector, filename, title }: { selector: string; filename: string; title: string }) {
  const cached = useRef<Blob | undefined>(undefined);
  const generation = useRef<Promise<Blob> | undefined>(undefined);
  const operationActive = useRef(false);
  const mounted = useRef(true);
  const [busy, setBusy] = useState<"share" | "download">();
  const [fallbackOpen, setFallbackOpen] = useState(false);
  const [error, setError] = useState<string>();

  async function pdf() {
    if (cached.current) return cached.current;
    generation.current ??= generateReportPdf(selector);
    try { cached.current = await generation.current; return cached.current; }
    finally { generation.current = undefined; }
  }

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  async function download() {
    if (operationActive.current) return;
    operationActive.current = true;
    setBusy("download"); setError(undefined);
    try { downloadPdfBlob(await pdf(), filename); }
    catch { setError("Unable to generate the PDF. Please try again."); }
    finally { operationActive.current = false; if (mounted.current) setBusy(undefined); }
  }

  async function share() {
    if (operationActive.current) return;
    operationActive.current = true;
    setBusy("share"); setError(undefined);
    try {
      const file = createPdfFile(await pdf(), filename);
      const result = await sharePdfFile(navigator, file, title);
      if (result === "unsupported") setFallbackOpen(true);
      if (result === "failed") { setError("Unable to share this report. You can download the PDF instead."); setFallbackOpen(true); }
    } catch { setError("Unable to generate the PDF. Please try again."); setFallbackOpen(true); }
    finally { operationActive.current = false; if (mounted.current) setBusy(undefined); }
  }

  return <>
    <Button className="min-h-11 md:min-h-9" variant="outline" disabled={Boolean(busy)} onClick={() => void download()}>{busy === "download" ? <LoaderCircle className="size-4 animate-spin" /> : <Download className="size-4" />}{busy === "download" ? "Generating PDF…" : "Download"}</Button>
    <Button className="min-h-11 md:min-h-9" variant="outline" disabled={Boolean(busy)} onClick={() => void share()}>{busy === "share" ? <LoaderCircle className="size-4 animate-spin" /> : <Share2 className="size-4" />}{busy === "share" ? "Preparing Share…" : "Share"}</Button>
    <span className="sr-only" aria-live="polite">{busy === "download" ? "Generating PDF" : busy === "share" ? "Preparing Share" : error ?? ""}</span>
    <Dialog open={fallbackOpen} onOpenChange={setFallbackOpen}><DialogContent><DialogHeader><DialogTitle>Share Report</DialogTitle><DialogDescription>Download the report to share it through email, WhatsApp or another application.</DialogDescription></DialogHeader>{error && <p className="text-sm text-destructive">{error}</p>}<DialogFooter><Button variant="outline" onClick={() => setFallbackOpen(false)}>Close</Button><Button disabled={Boolean(busy)} onClick={() => void download()}>{busy === "download" ? <LoaderCircle className="size-4 animate-spin" /> : <Download className="size-4" />}Download PDF</Button></DialogFooter></DialogContent></Dialog>
  </>;
}

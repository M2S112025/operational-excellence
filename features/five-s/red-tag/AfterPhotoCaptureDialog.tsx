/* eslint-disable @next/next/no-img-element -- source camera previews use captured local data URLs. */
"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ImageOff, Info, Maximize2, RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { stopCameraStream } from "./capture-utils";
import { normalizedEvidenceDataUrl } from "./capture-utils";

export default function AfterPhotoCaptureDialog({
  open,
  beforeImage,
  beforeName,
  onOpenChange,
  onUsePhoto,
}: {
  open: boolean;
  beforeImage?: string;
  beforeName?: string;
  onOpenChange: (open: boolean) => void;
  onUsePhoto: (photo: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestRef = useRef(0);
  const startInFlightRef = useRef(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string>();
  const [cameraError, setCameraError] = useState<string>();
  const [cameraStarting, setCameraStarting] = useState(false);
  const [beforeExpanded, setBeforeExpanded] = useState(false);

  function stopCamera() {
    stopCameraStream(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  async function startCamera() {
    if (startInFlightRef.current || streamRef.current) return;
    startInFlightRef.current = true;
    const requestId = ++requestRef.current;
    setCameraError(undefined);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera unavailable. This browser does not support live camera capture.");
      startInFlightRef.current = false;
      return;
    }
    setCameraStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      if (!open || requestId !== requestRef.current) { stopCameraStream(stream); return; }
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
    } catch (error) {
      const denied = error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "SecurityError");
      const unavailable = error instanceof DOMException && (error.name === "NotFoundError" || error.name === "DevicesNotFoundError");
      setCameraError(denied ? "Camera access is required to take a photo. Check your browser permissions and try again." : unavailable ? "Camera unavailable. No camera was detected on this device." : "Unable to access the camera. Check that it is not already in use and try again.");
      stopCamera();
    } finally {
      startInFlightRef.current = false;
      setCameraStarting(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => { setCapturedPhoto(undefined); setBeforeExpanded(false); void startCamera(); }, 0);
    return () => { window.clearTimeout(timer); requestRef.current += 1; startInFlightRef.current = false; stopCamera(); };
    // Camera lifecycle is intentionally tied to dialog visibility.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function capture() {
    const video = videoRef.current;
    if (!video?.videoWidth || !video.videoHeight) { setCameraError("The camera is not ready yet. Please try again."); return; }
    const width = Math.min(1280, video.videoWidth);
    const height = Math.round(width * video.videoHeight / video.videoWidth);
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(video, 0, 0, width, height);
    setCapturedPhoto(normalizedEvidenceDataUrl(canvas));
    stopCamera();
  }

  function retake() { setCapturedPhoto(undefined); void startCamera(); }
  function usePhoto() { if (!capturedPhoto) return; stopCamera(); onUsePhoto(capturedPhoto); onOpenChange(false); }

  const visual = (src: string | undefined, alt: string, live = false) => (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl border bg-slate-950">
      {live ? <video ref={videoRef} autoPlay muted playsInline aria-label={alt} className="h-full w-full object-cover" /> : src ? <img src={src} alt={alt} className="h-full w-full object-cover" /> : <div className="flex h-full flex-col items-center justify-center gap-2 bg-muted text-muted-foreground"><ImageOff className="size-6" /><span className="text-xs">Before photo unavailable</span></div>}
    </div>
  );

  return <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-1rem)] flex-col overflow-hidden p-0 sm:max-h-[calc(100dvh-2rem)] sm:!max-w-5xl">
        <header className="border-b px-5 py-4 sm:px-7"><DialogTitle>Take After Photo</DialogTitle><DialogDescription className="mt-1">Capture evidence of the completed Action.</DialogDescription></header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7">
          <div className="flex gap-3 rounded-xl border border-primary/20 bg-primary/[0.06] p-3 text-primary"><Info className="mt-0.5 size-5 shrink-0" /><div><p className="text-sm font-semibold">Match the Before Photo</p><p className="mt-0.5 text-sm leading-5 text-foreground/75">Capture the After photo from the same angle and position as the Before photo for clear comparison.</p></div></div>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <section><div className="mb-2 flex items-end justify-between gap-2"><div><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Before Reference</p><p className="mt-1 text-xs text-muted-foreground">Original evidence</p></div>{beforeImage && <Button type="button" size="icon-sm" variant="ghost" aria-label="Enlarge Before photo" onClick={() => setBeforeExpanded(true)}><Maximize2 className="size-4" /></Button>}</div><button type="button" className="block w-full text-left" disabled={!beforeImage} onClick={() => beforeImage && setBeforeExpanded(true)}>{visual(beforeImage, beforeName ?? "Before Action")}</button></section>
            <section><div className="mb-2"><p className="text-xs font-bold uppercase tracking-wider text-primary">After Photo</p><p className="mt-1 text-xs text-muted-foreground">{capturedPhoto ? "Review the captured angle and improvement" : "Align to a similar angle and position"}</p></div>{capturedPhoto ? visual(capturedPhoto, "Captured After photo") : visual(undefined, "Live After camera preview", true)}</section>
          </div>
          {cameraStarting && <p role="status" className="mt-3 text-center text-sm text-muted-foreground">Starting camera…</p>}
          {cameraError && <p role="alert" className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-300">{cameraError}</p>}
        </div>
        <footer className="mobile-safe-bottom flex shrink-0 flex-wrap justify-end gap-2 border-t px-5 py-3 sm:px-7">{capturedPhoto ? <><Button type="button" variant="outline" onClick={retake}><RefreshCcw className="size-4" />Retake</Button><Button type="button" onClick={usePhoto}>Use Photo</Button></> : cameraError ? <Button type="button" variant="outline" disabled={cameraStarting} onClick={() => void startCamera()}><RefreshCcw className="size-4" />Try Camera Again</Button> : <Button type="button" disabled={cameraStarting} onClick={capture}><Camera className="size-4" />{cameraStarting ? "Starting Camera…" : "Capture Photo"}</Button>}</footer>
      </DialogContent>
    </Dialog>
    <Dialog open={beforeExpanded} onOpenChange={setBeforeExpanded}><DialogContent className="sm:!max-w-5xl"><DialogTitle>Before Photo Reference</DialogTitle><DialogDescription>{beforeName ?? "Original Action evidence"}</DialogDescription>{beforeImage && <img src={beforeImage} alt={beforeName ?? "Before Action"} className="max-h-[75dvh] w-full rounded-lg object-contain" />}</DialogContent></Dialog>
  </>;
}

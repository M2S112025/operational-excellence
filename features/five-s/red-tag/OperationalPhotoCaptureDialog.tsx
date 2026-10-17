/* eslint-disable @next/next/no-img-element -- source camera previews use captured local data URLs. */
"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { stopCameraStream } from "./capture-utils";
import { normalizedEvidenceDataUrl } from "./capture-utils";

export default function OperationalPhotoCaptureDialog({ open, title = "Take Photo", description = "Capture workplace evidence using the device camera.", capturedAlt = "Captured evidence photo", onOpenChange, onUsePhoto }: { open: boolean; title?: string; description?: string; capturedAlt?: string; onOpenChange: (open: boolean) => void; onUsePhoto: (photo: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestRef = useRef(0);
  const startInFlightRef = useRef(false);
  const [photo, setPhoto] = useState<string>();
  const [cameraError, setCameraError] = useState<string>();
  const [cameraStarting, setCameraStarting] = useState(false);

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
      setCameraError("Camera unavailable. No supported camera capture was detected on this device.");
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
    const timer = window.setTimeout(() => { setPhoto(undefined); setCameraError(undefined); void startCamera(); }, 0);
    return () => { window.clearTimeout(timer); requestRef.current += 1; startInFlightRef.current = false; stopCamera(); };
    // Camera lifecycle is intentionally tied to dialog visibility.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function capturePhoto() {
    const video = videoRef.current;
    if (!video?.videoWidth || !video.videoHeight) { setCameraError("The camera is not ready yet. Please try again."); return; }
    const width = Math.min(1280, video.videoWidth);
    const height = Math.round(width * video.videoHeight / video.videoWidth);
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) { setCameraError("The camera image could not be captured."); return; }
    context.drawImage(video, 0, 0, width, height);
    setPhoto(normalizedEvidenceDataUrl(canvas));
    stopCamera();
  }

  function retakePhoto() { setPhoto(undefined); void startCamera(); }
  function usePhoto() { if (!photo) return; stopCamera(); onUsePhoto(photo); onOpenChange(false); }

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="!z-[130] flex max-h-[calc(100dvh-24px)] !w-[calc(100vw-24px)] !max-w-none flex-col gap-0 overflow-hidden p-0 sm:!w-[calc(100vw-40px)] sm:!max-w-3xl">
      <header className="shrink-0 border-b px-5 py-4 pr-12 sm:px-7"><DialogTitle>{title}</DialogTitle><DialogDescription className="mt-1">{description}</DialogDescription></header>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7">
        <div className="mx-auto aspect-[4/3] w-full max-w-2xl overflow-hidden rounded-xl border bg-slate-950">{photo ? <img src={photo} alt={capturedAlt} className="size-full object-cover" /> : <video ref={videoRef} autoPlay muted playsInline aria-label="Live rear camera preview" className="size-full object-cover" />}</div>
        {cameraStarting && <p role="status" className="mt-3 text-center text-sm text-muted-foreground">Starting camera…</p>}
        {cameraError && <p role="alert" className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-300">{cameraError}</p>}
      </div>
      <footer className="mobile-safe-bottom flex shrink-0 flex-wrap justify-end gap-2 border-t px-5 py-3 sm:px-7">{photo ? <><Button type="button" variant="outline" className="min-h-11" onClick={retakePhoto} aria-label={`Retake ${title.toLowerCase()}`}><RefreshCcw className="size-4" />Retake</Button><Button type="button" className="min-h-11" onClick={usePhoto}>Use Photo</Button></> : cameraError ? <Button type="button" variant="outline" className="min-h-11" disabled={cameraStarting} onClick={() => void startCamera()}><RefreshCcw className="size-4" />Try Camera Again</Button> : <Button type="button" className="min-h-11" disabled={cameraStarting} onClick={capturePhoto} aria-label="Capture evidence photo"><Camera className="size-4" />{cameraStarting ? "Starting Camera…" : "Capture Photo"}</Button>}</footer>
    </DialogContent>
  </Dialog>;
}

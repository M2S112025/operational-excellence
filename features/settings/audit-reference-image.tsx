"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Camera, Upload } from "lucide-react";
import { OpsCameraCapture } from "@/components/ops/ops-camera-capture";
import { MAX_SOURCE_IMAGE_BYTES, optimizeEvidenceImage } from "@/lib/evidence-images";

export function validateAuditReferenceImage(value: string | undefined): string | undefined {
  if (value === undefined || value.trim() === "") return undefined;
  if (value.startsWith("data:")) {
    const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
    if (!match || match[2].length % 4 !== 0 || match[2].length > Math.ceil(MAX_SOURCE_IMAGE_BYTES / 3) * 4) throw new Error("Use a JPEG, PNG or WebP photo smaller than 8 MB.");
    try {
      const header = atob(match[2].slice(0, 24));
      const valid = match[1] === "jpeg" ? header.startsWith("\xff\xd8\xff") : match[1] === "png" ? header.startsWith("\x89PNG\r\n\x1a\n") : header.startsWith("RIFF") && header.slice(8, 12) === "WEBP";
      if (!valid) throw new Error();
      return value;
    } catch { throw new Error("Use a valid JPEG, PNG or WebP photo."); }
  }
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || !url.hostname || url.username || url.password) throw new Error();
    return url.href;
  } catch { throw new Error("Use a valid HTTPS reference image URL without credentials."); }
}

export function AuditReferenceImagePreview({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? <p role="status" className="text-sm text-muted-foreground">Reference image unavailable. Upload or take another photo.</p> :
    // Reference URLs are organization-hosted assets, not Next image-optimizer inputs.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="Question reference preview" referrerPolicy="no-referrer" loading="lazy" onError={() => setFailed(true)} className="max-h-48 w-full rounded-md border object-contain" />;
}

export function AuditReferenceImageEditor({ id, value, onChange, onProcessingChange }: { id: string; value: string; onChange: (value: string) => void; onProcessingChange?: (busy: boolean) => void }) {
  const uploadRef = useRef<HTMLInputElement>(null);
  const request = useRef(0);
  const [processing, setProcessing] = useState(false);
  const [photoError, setPhotoError] = useState("");
  useEffect(() => () => { request.current += 1; }, []);
  async function processPhoto(file?: File) {
    if (!file) return;
    const token = ++request.current;
    setProcessing(true); onProcessingChange?.(true); setPhotoError("");
    try {
      const { dataUrl } = await optimizeEvidenceImage(file);
      validateAuditReferenceImage(dataUrl);
      if (token === request.current) onChange(dataUrl);
    } catch (cause) {
      if (token === request.current) setPhotoError(cause instanceof Error ? cause.message : "Unable to process photo.");
    } finally {
      if (token === request.current) { setProcessing(false); onProcessingChange?.(false); }
    }
  }
  let error = "";
  let preview: string | undefined;
  try { preview = validateAuditReferenceImage(value); } catch (cause) { error = (cause as Error).message; }
  const bundled = value.startsWith("/demo-5s/reference-images/");
  const photo = Boolean(preview?.startsWith("data:image/"));
  return <div className="space-y-2">
    <Label htmlFor={id}>Reference Image <span className="font-normal text-muted-foreground">(optional)</span></Label>
    <div className="flex flex-wrap gap-2">
      <OpsCameraCapture fileNamePrefix="audit-reference" disabled={processing} onCapture={processPhoto} trigger={openCamera => <Button type="button" variant="outline" disabled={processing} onClick={openCamera}><Camera className="size-4" />Take Photo</Button>} />
      <Button type="button" variant="outline" disabled={processing} onClick={() => uploadRef.current?.click()}><Upload className="size-4" />Upload Photo</Button>
      <Button type="button" variant="outline" disabled={!value || processing} onClick={() => { setPhotoError(""); onChange(""); }}>Remove</Button>
      <input id={id} aria-invalid={Boolean(error && !bundled)} aria-describedby={`${id}-help`} ref={uploadRef} type="file" accept="image/*" hidden aria-label="Upload reference image" onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; void processPhoto(file); }} />
    </div>

    <p id={`${id}-help`} className={`text-sm ${error && !bundled ? "text-destructive" : "text-muted-foreground"}`}>{processing ? "Processing photo…" : photo ? "Photo attached. Save changes to keep it." : bundled ? "Bundled standard reference. Upload, take a photo or remove." : (error ? "Reference image unavailable. Upload or take another photo." : "Upload or take a photo. Maximum upload size: 8 MB.")}</p>
    {photoError && <p role="alert" className="text-sm text-destructive">{photoError}</p>}
    {(preview || bundled) && <AuditReferenceImagePreview key={value} src={preview ?? value} />}
  </div>;
}

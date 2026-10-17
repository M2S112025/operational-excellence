export function stopCameraStream(stream: MediaStream | null) { stream?.getTracks().forEach(track => track.stop()); }
export function normalizedEvidenceDataUrl(canvas: HTMLCanvasElement) {
 const scale = Math.min(1, 1600 / canvas.width, 1600 / canvas.height);
 const normalized = document.createElement("canvas"); normalized.width = Math.max(1, Math.round(canvas.width * scale)); normalized.height = Math.max(1, Math.round(canvas.height * scale));
 const context = normalized.getContext("2d"); if (!context) throw new Error("Image processing unavailable."); context.drawImage(canvas, 0, 0, normalized.width, normalized.height); return normalized.toDataURL("image/jpeg", 0.76);
}

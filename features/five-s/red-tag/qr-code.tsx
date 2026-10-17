"use client";
import { useSyncExternalStore } from "react";
import { QRCodeSVG } from "qrcode.react";
/** Standards-compliant QR encoding with the required four-module quiet zone. */
export function QrCode({ value, size }: { value: string; size: number }) {
 const origin = useSyncExternalStore(() => () => {}, () => window.location.origin, () => "");
 const url = origin ? new URL(value, origin).toString() : value;
 return <QRCodeSVG value={url} size={size} level="M" marginSize={4} title={`Red Tag ${url}`} />;
}

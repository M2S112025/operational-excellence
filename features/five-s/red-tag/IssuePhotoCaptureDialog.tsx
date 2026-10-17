"use client";

import OperationalPhotoCaptureDialog from "./OperationalPhotoCaptureDialog";

export default function IssuePhotoCaptureDialog({ open, onOpenChange, onUsePhoto }: { open: boolean; onOpenChange: (open: boolean) => void; onUsePhoto: (photo: string) => void }) {
  return <OperationalPhotoCaptureDialog open={open} title="Take Issue Photo" description="Capture the current condition before creating the Red Tag." capturedAlt="Captured Red Tag issue" onOpenChange={onOpenChange} onUsePhoto={onUsePhoto} />;
}

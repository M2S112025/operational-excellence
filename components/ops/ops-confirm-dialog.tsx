"use client";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { OpsFeedback } from "./ops-feedback";
import { Button } from '@/components/ui/button';
export function OpsConfirmDialog({ open, onOpenChange, title, description, confirmLabel, onConfirm, error, destructive = false }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; description: string; confirmLabel: string; onConfirm: () => void; error?: string; destructive?: boolean }) {
 return <AlertDialog open={open} onOpenChange={onOpenChange}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{title}</AlertDialogTitle><AlertDialogDescription>{description}</AlertDialogDescription></AlertDialogHeader>{error && <OpsFeedback tone="error" message={error} />}<AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><Button variant={destructive ? 'destructive' : 'default'} onClick={onConfirm}>{confirmLabel}</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>;
}

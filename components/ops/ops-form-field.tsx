"use client";
import { cloneElement, isValidElement, useId } from 'react';
import { Label } from '@/components/ui/label';
import { FieldMessage } from '@/components/ui/field-message';
export function OpsFormField({ label, required, children, error, hint }: { label: string; required?: boolean; children: React.ReactNode; error?: string; hint?: string }) {
 const id = useId();
 const control = isValidElement<{onChange?: unknown;id?: string;'aria-describedby'?: string}>(children) && typeof children.props.onChange === 'function' ? children : undefined;
 const controlId = control?.props.id ?? id;
 return <div className="grid content-start gap-2"><Label htmlFor={control ? controlId : undefined}>{label}{required && <span aria-label="required" className="text-destructive"> *</span>}</Label>{control ? cloneElement(control,{id:controlId,'aria-describedby':error || hint ? `${id}-message` : control.props['aria-describedby']}) : children}<FieldMessage id={`${id}-message`} error={Boolean(error)} role={error ? 'alert' : undefined}>{error || hint}</FieldMessage></div>;
}

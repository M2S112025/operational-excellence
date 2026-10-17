"use client"

import * as React from "react"
import { Select as SelectPrimitive } from "@base-ui/react/select"
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"

import { OpsSearchableSelect, searchableSelectPolicy, type OpsSelectOption } from "@/components/ops/ops-searchable-select"

function selectionText(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) return selectionText(node.props.children)
  return React.Children.toArray(node).map(child => typeof child === "string" || typeof child === "number" ? String(child) : React.isValidElement<{ children?: React.ReactNode }>(child) ? selectionText(child.props.children) : "").join(" ")
}

/** Existing Select composition, using one combobox for explicit entity fields or long lists. */
function Select({ children, searchable, searchLabel, ...props }: SelectPrimitive.Root.Props<string> & { searchable?: boolean; searchLabel?: string }) {
  const options: OpsSelectOption[] = []
  let trigger: React.ReactElement<SelectPrimitive.Trigger.Props> | undefined
  let selectedDisplay: React.ReactNode | ((value: string | null) => React.ReactNode)
  let placeholder: React.ReactNode
  function visit(nodes: React.ReactNode, group?: string) {
    React.Children.forEach(nodes, node => {
      if (!React.isValidElement<{ children?: React.ReactNode; value?: string; disabled?: boolean; placeholder?: React.ReactNode }>(node)) return
      if (node.type === SelectTrigger) trigger = node as React.ReactElement<SelectPrimitive.Trigger.Props>
      if (node.type === SelectValue) { selectedDisplay = node.props.children; placeholder = node.props.placeholder }
      if (node.type === SelectItem && typeof node.props.value === "string") options.push({ value: node.props.value, label: selectionText(node.props.children), disabled: node.props.disabled, group })
      else {
        let nextGroup = group
        if (node.type === SelectGroup) React.Children.forEach(node.props.children, child => { if (React.isValidElement<{children?: React.ReactNode}>(child) && child.type === SelectLabel) nextGroup = selectionText(child.props.children) })
        visit(node.props.children, nextGroup)
      }
    })
  }
  visit(children)
  const triggerProps = trigger?.props
  const label = searchLabel ?? triggerProps?.["aria-label"] ?? (selectionText(placeholder) || "options")
  if (!(searchable ?? searchableSelectPolicy(label, options.length)) || !trigger || props.multiple || props.open !== undefined || props.onOpenChange || props.items) return <SelectPrimitive.Root {...props}>{children}</SelectPrimitive.Root>
  return <OpsSearchableSelect options={options} value={props.value ?? undefined} defaultValue={props.defaultValue ?? undefined} onValueChange={(next, details) => props.onValueChange?.(next, details as unknown as SelectPrimitive.Root.ChangeEventDetails)} label={label} placeholder={placeholder} disabled={props.disabled || props.readOnly} required={props.required} name={props.name} id={triggerProps?.id ?? props.id} triggerRef={triggerProps?.ref} triggerClassName={typeof triggerProps?.className === "string" ? triggerProps.className : undefined} invalid={triggerProps?.["aria-invalid"] === true || triggerProps?.["aria-invalid"] === "true"} describedBy={triggerProps?.["aria-describedby"]} displayValue={typeof selectedDisplay === "function" ? selectedDisplay(props.value ?? props.defaultValue ?? null) : selectedDisplay} />
}

function SelectGroup({
  className,
  ...props
}: SelectPrimitive.Group.Props) {
  return (
    <SelectPrimitive.Group
      data-slot="select-group"
      className={cn("scroll-my-1 p-1", className)}
      {...props}
    />
  )
}

function SelectValue({
  className,
  ...props
}: SelectPrimitive.Value.Props) {
  return (
    <SelectPrimitive.Value
      data-slot="select-value"
      className={cn(
        "flex min-w-0 flex-1 text-left",
        className
      )}
      {...props}
    />
  )
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: SelectPrimitive.Trigger.Props & {
  size?: "sm" | "default"
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "flex w-fit items-center justify-between",
        "gap-2 whitespace-nowrap",
        "rounded-md border border-input",
        "bg-background",
        "text-sm text-foreground",
        "shadow-xs",
        "outline-none select-none",
        "transition-colors duration-150",

        "hover:border-foreground/20",

        "focus-visible:border-ring",
        "focus-visible:ring-2",
        "focus-visible:ring-ring/20",

        "disabled:cursor-not-allowed",
        "disabled:opacity-50",

        "aria-invalid:border-destructive",
        "aria-invalid:ring-2",
        "aria-invalid:ring-destructive/20",

        "data-placeholder:text-muted-foreground",

        "data-[size=default]:h-9",
        "data-[size=default]:px-3",

        "data-[size=sm]:h-8",
        "data-[size=sm]:rounded-md",
        "data-[size=sm]:px-2.5",
        "data-[size=sm]:text-[13px]",

        "*:data-[slot=select-value]:flex",
        "*:data-[slot=select-value]:min-w-0",
        "*:data-[slot=select-value]:items-center",
        "*:data-[slot=select-value]:gap-1.5",
        "*:data-[slot=select-value]:truncate",

        "[&_svg]:pointer-events-none",
        "[&_svg]:shrink-0",
        "[&_svg:not([class*='size-'])]:size-4",

        "dark:hover:border-foreground/25",

        className
      )}
      {...props}
    >
      {children}

      <SelectPrimitive.Icon
        render={
          <ChevronDownIcon
            className="size-4 text-muted-foreground"
          />
        }
      />
    </SelectPrimitive.Trigger>
  )
}

function SelectContent({
  className,
  children,
  side = "bottom",
  sideOffset = 4,
  align = "center",
  alignOffset = 0,
  alignItemWithTrigger = true,
  ...props
}: SelectPrimitive.Popup.Props &
  Pick<
    SelectPrimitive.Positioner.Props,
    | "align"
    | "alignOffset"
    | "side"
    | "sideOffset"
    | "alignItemWithTrigger"
  >) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        alignItemWithTrigger={alignItemWithTrigger}
        className="isolate z-[10010]"
      >
        <SelectPrimitive.Popup
          data-slot="select-content"
          data-align-trigger={alignItemWithTrigger}
          className={cn(
            "relative isolate z-50",
            "max-h-(--available-height)",
            "w-(--anchor-width)",
            "min-w-36",
            "origin-(--transform-origin)",
            "overflow-x-hidden overflow-y-auto",
            "rounded-lg",
            "border border-border/80",
            "bg-popover text-popover-foreground",
            "shadow-lg",
            "ring-1 ring-foreground/5",
            "outline-none",
            "duration-100",

            "data-open:animate-in",
            "data-open:fade-in-0",
            "data-open:zoom-in-95",

            "data-closed:animate-out",
            "data-closed:fade-out-0",
            "data-closed:zoom-out-95",

            "data-[side=bottom]:slide-in-from-top-2",
            "data-[side=top]:slide-in-from-bottom-2",
            "data-[side=left]:slide-in-from-right-2",
            "data-[side=right]:slide-in-from-left-2",

            "dark:shadow-none",
            "dark:ring-foreground/10",

            className
          )}
          {...props}
        >
          <SelectPrimitive.List>
            {children}
          </SelectPrimitive.List>
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  )
}

function SelectLabel({
  className,
  ...props
}: SelectPrimitive.GroupLabel.Props) {
  return (
    <SelectPrimitive.GroupLabel
      data-slot="select-label"
      className={cn(
        "px-2 py-1.5",
        "text-xs font-medium",
        "text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function SelectItem({
  className,
  children,
  ...props
}: SelectPrimitive.Item.Props) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex w-full cursor-default",
        "items-center gap-2",
        "rounded-md",
        "py-2 pr-8 pl-2",
        "text-sm text-popover-foreground",
        "outline-none select-none",
        "transition-colors",

        "focus:bg-accent",
        "focus:text-accent-foreground",

        "data-disabled:pointer-events-none",
        "data-disabled:opacity-50",

        "[&_svg]:pointer-events-none",
        "[&_svg]:shrink-0",
        "[&_svg:not([class*='size-'])]:size-4",

        "*:[span]:last:flex",
        "*:[span]:last:items-center",
        "*:[span]:last:gap-2",

        className
      )}
      {...props}
    >
      <SelectPrimitive.ItemText className="flex min-w-0 flex-1 shrink-0 items-center gap-2 truncate">
        {children}
      </SelectPrimitive.ItemText>

      <SelectPrimitive.ItemIndicator
        render={
          <CheckIcon className="absolute right-2.5 size-4" />
        }
      />
    </SelectPrimitive.Item>
  )
}

function SelectSeparator({
  className,
  ...props
}: SelectPrimitive.Separator.Props) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn(
        "pointer-events-none -mx-1 my-1 h-px",
        "bg-border",
        className
      )}
      {...props}
    />
  )
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <SelectPrimitive.ScrollUpArrow
      data-slot="select-scroll-up-button"
      className={cn(
        "top-0 z-10 flex w-full",
        "cursor-default items-center justify-center",
        "bg-popover py-1",
        "[&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <ChevronUpIcon className="size-4" />
    </SelectPrimitive.ScrollUpArrow>
  )
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <SelectPrimitive.ScrollDownArrow
      data-slot="select-scroll-down-button"
      className={cn(
        "bottom-0 z-10 flex w-full",
        "cursor-default items-center justify-center",
        "bg-popover py-1",
        "[&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <ChevronDownIcon className="size-4" />
    </SelectPrimitive.ScrollDownArrow>
  )
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}

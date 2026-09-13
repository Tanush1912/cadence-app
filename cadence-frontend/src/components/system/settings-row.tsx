"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { ChevronRight, Plus } from "lucide-react";

const rowBase = "flex min-h-12 items-center gap-3 px-3";

export function SettingsGroupLabel({ children }: { children: ReactNode }) {
  return <p className="px-1 pt-6 pb-2 text-micro text-ink-3">{children}</p>;
}

export function SettingsGroup({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "divide-y divide-border overflow-hidden rounded-lg border border-border bg-card",
        className
      )}
    >
      {children}
    </div>
  );
}

export function SettingsRow({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn(rowBase, className)}>{children}</div>;
}

// tailwind-merge reads text-body as a colour, so type + colour tokens never share a cn().
export function SettingsRowLabel({
  destructive = false,
  children,
}: {
  destructive?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className={`flex-1 text-body ${destructive ? "text-destructive" : "text-foreground"}`}
    >
      {children}
    </span>
  );
}

export function SettingsValue({ children }: { children: ReactNode }) {
  return (
    <span className="shrink-0 font-mono text-label text-muted-foreground">
      {children}
    </span>
  );
}

export function SettingsAction({
  label,
  value,
  chevron = true,
  destructive = false,
  onClick,
}: {
  label: string;
  value?: string;
  chevron?: boolean;
  destructive?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(rowBase, "w-full text-left transition-colors active:bg-secondary")}
    >
      <SettingsRowLabel destructive={destructive}>{label}</SettingsRowLabel>
      {value ? <SettingsValue>{value}</SettingsValue> : null}
      {chevron ? <ChevronRight className="size-4 shrink-0 text-ink-3" /> : null}
    </button>
  );
}

export function SettingsToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(rowBase, "w-full text-left transition-colors active:bg-secondary")}
    >
      <SettingsRowLabel>{label}</SettingsRowLabel>
      <span
        aria-hidden
        className={cn(
          "relative h-6 w-10 shrink-0 rounded-full transition-colors",
          checked ? "bg-primary" : "bg-surface-3"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 size-5 rounded-full transition-transform",
            checked ? "translate-x-4 bg-background" : "bg-muted-foreground"
          )}
        />
      </span>
    </button>
  );
}

export function SettingsSlider({
  value,
  min,
  max,
  step,
  onChange,
  label,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label: string;
}) {
  return (
    <input
      type="range"
      aria-label={label}
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={onChange}
      className="h-11 w-full cursor-pointer appearance-none bg-transparent [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-foreground [&::-moz-range-track]:h-1 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-surface-3 [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-surface-3 [&::-webkit-slider-thumb]:-mt-1.5 [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground"
    />
  );
}

export function SheetHint({ children }: { children: ReactNode }) {
  return <p className="px-5 pb-3 text-label text-muted-foreground">{children}</p>;
}

export function SheetGroupLabel({ children }: { children: ReactNode }) {
  return <p className="px-5 pt-4 pb-2 text-micro text-ink-3">{children}</p>;
}

export function SheetAddRow({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <div className="px-5 pb-3">
      <button
        type="button"
        onClick={onClick}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-surface-3 text-body font-medium text-primary transition-colors active:bg-secondary"
      >
        <Plus className="size-4" />
        {label}
      </button>
    </div>
  );
}

export function SheetPrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-12 flex-1 items-center justify-center rounded-sm bg-foreground px-4 text-body font-semibold text-background transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export function SheetSecondaryButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-12 items-center justify-center rounded-sm bg-secondary px-5 text-body font-medium text-foreground transition-colors active:bg-surface-3"
    >
      {children}
    </button>
  );
}

"use client";

import { useState, type ReactNode } from "react";
import type { ZodType } from "zod";

const inputClass =
  "mt-1 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-sm text-[var(--color-text)] focus:border-[var(--color-accent)] focus:outline-none";

function FieldShell({
  label,
  error,
  children,
}: {
  label: string;
  error: string | null;
  children: ReactNode;
}) {
  return (
    <label className="mb-3 block">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
        {label}
      </span>
      {children}
      {error && (
        <span className="mt-1 block text-xs text-[var(--color-error)]">{error}</span>
      )}
    </label>
  );
}

export function NumberField({
  label,
  initial,
  schema,
  onCommit,
  step = 1,
}: {
  label: string;
  initial: number;
  schema: ZodType<number>;
  onCommit: (v: number) => void;
  step?: number;
}) {
  const [draft, setDraft] = useState(String(initial));
  const [error, setError] = useState<string | null>(null);

  const handleChange = (raw: string) => {
    setDraft(raw);
    if (raw.trim() === "") {
      setError("Required");
      return;
    }
    const res = schema.safeParse(Number(raw));
    if (res.success) {
      setError(null);
      onCommit(res.data);
    } else {
      setError(res.error.issues[0]?.message ?? "Invalid value");
    }
  };

  return (
    <FieldShell label={label} error={error}>
      <input
        type="number"
        step={step}
        value={draft}
        onChange={(e) => handleChange(e.target.value)}
        className={inputClass}
      />
    </FieldShell>
  );
}

export function RangeField({
  label,
  initial,
  min,
  max,
  step,
  format,
  onCommit,
}: {
  label: string;
  initial: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onCommit: (v: number) => void;
}) {
  const [value, setValue] = useState(initial);

  return (
    <FieldShell label={`${label}: ${format(value)}`} error={null}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
          const v = Number(e.target.value);
          setValue(v);
          onCommit(v);
        }}
        className="mt-2 w-full accent-[var(--color-accent)]"
      />
    </FieldShell>
  );
}

export function SelectField<T extends string>({
  label,
  initial,
  options,
  onCommit,
}: {
  label: string;
  initial: T;
  options: { value: T; label: string }[];
  onCommit: (v: T) => void;
}) {
  return (
    <FieldShell label={label} error={null}>
      <select
        value={initial}
        onChange={(e) => onCommit(e.target.value as T)}
        className={inputClass}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export function TextField({
  label,
  initial,
  schema,
  onCommit,
}: {
  label: string;
  initial: string;
  schema: ZodType<string>;
  onCommit: (v: string) => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (raw: string) => {
    setDraft(raw);
    const res = schema.safeParse(raw);
    if (res.success) {
      setError(null);
      onCommit(res.data);
    } else {
      setError(res.error.issues[0]?.message ?? "Invalid");
    }
  };

  return (
    <FieldShell label={label} error={error}>
      <input
        type="text"
        value={draft}
        onChange={(e) => handleChange(e.target.value)}
        className={inputClass}
      />
    </FieldShell>
  );
}
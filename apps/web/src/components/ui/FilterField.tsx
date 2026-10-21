import type { InputHTMLAttributes, ReactNode } from 'react';

interface FieldProps {
  label: string;
  children: ReactNode;
}

export function FilterField({ label, children }: FieldProps) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
      {label}
      {children}
    </label>
  );
}

const CONTROL = 'h-9 rounded-lg border bg-background px-2.5 text-sm text-foreground outline-none focus:border-ring';

export function FilterInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={CONTROL} {...props} />;
}

interface FilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}

export function FilterSelect({ value, onChange, options }: FilterSelectProps) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className={CONTROL}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

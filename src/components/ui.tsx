import type { ReactNode } from 'react';

export function NumInput({
  value,
  onChange,
  step = 0.01,
  min = 0,
  ...rest
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  className?: string;
  'aria-label'?: string;
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      step={step}
      min={min}
      value={Number.isFinite(value) ? value : 0}
      onChange={(e) => onChange(e.target.valueAsNumber || 0)}
      {...rest}
    />
  );
}

export function Card({ title, children, actions }: { title?: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="card">
      {(title || actions) && (
        <header className="card-header">
          {title && <h2>{title}</h2>}
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
      {hint && <span className="stat-hint">{hint}</span>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>;
}

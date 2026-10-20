/**
 * EstilistaIA · Componentes de interfaz reutilizables
 * Todos usan los tokens de color definidos en index.html (claro/oscuro).
 */
import React, { useEffect, useRef } from 'react';

const ICONS = {
  today: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  hanger: <path d="M12 7.5a2.2 2.2 0 1 1 2.2-2.2M12 7.5v1.2L3.4 15.2A1.6 1.6 0 0 0 4.4 18h15.2a1.6 1.6 0 0 0 1-2.8L12 8.7" />,
  spark: <path d="M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7-4.7-1.8 4.7-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" />,
  mirror: <><rect x="6" y="2.5" width="12" height="15" rx="6" /><path d="M9 21.5h6M12 17.5v4M9.5 8l3-3M9.5 11.5l5-5" /></>,
  ruler: <><path d="M3.5 16.5 16.5 3.5l4 4-13 13z" /><path d="m7.5 12.5 2 2M10.5 9.5l1.5 1.5M13.5 6.5l2 2" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  camera: <><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  alert: <><path d="M12 3 2.5 20h19z" /><path d="M12 10v4.5M12 17.5v.01" /></>,
  bag: <><path d="M5 8h14l-1 13H6z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>,
  upload: <><path d="M12 15V4M7.5 8.5 12 4l4.5 4.5" /><path d="M4 15v5h16v-5" /></>,
  external: <><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 14v6H4V6h6" /></>,
  share: <><circle cx="18" cy="5.5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="18.5" r="2.5" /><path d="m8.2 10.8 7.6-4.1M8.2 13.2l7.6 4.1" /></>,
  lock: <><rect x="5" y="10.5" width="14" height="10" rx="2" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /></>,
  undo: <><path d="M9 14 4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 0 12h-3" /></>,
};

export function Icon({ name, className = 'w-5 h-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

const BTN = {
  primary: 'bg-accent text-accent-ink hover:brightness-110',
  secondary: 'bg-surface text-ink border border-line hover:border-ink',
  ghost: 'text-ink hover:bg-sunk',
  danger: 'bg-bad-soft text-bad hover:brightness-95',
};

export function Button({ variant = 'primary', className = '', children, ...props }) {
  return (
    <button type="button" className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[0.95rem] font-bold transition disabled:opacity-50 ${BTN[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

/** Botón-pastilla para selección múltiple. */
export function Chip({ selected, onClick, children }) {
  return (
    <button type="button" aria-pressed={!!selected} onClick={onClick}
      className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${selected ? 'bg-ink text-paper border-ink' : 'bg-surface text-ink border-line hover:border-ink'}`}>
      {children}
    </button>
  );
}

/** Selector de una sola opción. */
export function Segmented({ label, options, value, onChange, size = 'md' }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap gap-1 rounded-xl bg-sunk p-1">
      {options.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={value === o.id} onClick={() => onChange(o.id)}
          className={`rounded-lg ${size === 'sm' ? 'px-2.5 py-1 text-sm' : 'px-3 py-1.5 text-[0.93rem]'} transition-colors ${value === o.id ? 'bg-surface text-ink font-bold shadow-[0_1px_0_var(--line)]' : 'text-muted hover:text-ink'}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Field({ label, hint, children, as: Tag = 'label' }) {
  return (
    <Tag className="block">
      <span className="mb-1.5 block text-sm font-bold">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[0.82rem] text-muted">{hint}</span>}
    </Tag>
  );
}

export function NumberField({ label, value, onChange, suffix = 'cm', min = 0, max = 250, hint }) {
  return (
    <Field label={label} hint={hint}>
      <span className="relative block">
        <input type="number" inputMode="decimal" min={min} max={max} value={value}
          onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
          className="field pr-10 tabular-nums" />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">{suffix}</span>
      </span>
    </Field>
  );
}

const TONES = {
  ok: 'bg-ok-soft text-ok',
  warn: 'bg-warn-soft text-warn',
  bad: 'bg-bad-soft text-bad',
  neutral: 'bg-sunk text-muted',
  accent: 'bg-accent-soft text-accent',
};
export function Badge({ tone = 'neutral', children, className = '' }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[0.8rem] font-bold ${TONES[tone]} ${className}`}>{children}</span>;
}

/** Barra de 5 segmentos para la amigabilidad ante la inflamación. */
export function FriendDots({ value }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`Amigabilidad ante la inflamación: ${value} de 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className="h-1.5 w-3 rounded-full" style={{ background: i <= value ? 'var(--accent)' : 'var(--line)' }} />
      ))}
    </span>
  );
}

/** Diálogo modal: hoja inferior en móvil, ventana centrada en escritorio. */
export function Modal({ open, onClose, title, children, wide = false }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.activeElement;
    ref.current?.focus();
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      prev?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" style={{ background: 'var(--scrim)' }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}
        className={`sheet w-full ${wide ? 'sm:max-w-3xl' : 'sm:max-w-xl'} max-h-[92dvh] overflow-y-auto bg-surface outline-none rounded-t-[26px] sm:rounded-[26px]`}>
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-line bg-surface px-5 py-4 sm:px-7">
          <h2 className="font-display text-xl font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-sunk" aria-label="Cerrar">
            <Icon name="x" />
          </button>
        </div>
        <div className="px-5 py-5 sm:px-7" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}>{children}</div>
      </div>
    </div>
  );
}

/** Links de búsqueda en tiendas. */
export function ShopLinks({ links }) {
  return (
    <div className="flex flex-wrap gap-2">
      {links.map((l) => (
        <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-sm hover:border-ink">
          {l.label} <Icon name="external" className="h-3.5 w-3.5" />
        </a>
      ))}
    </div>
  );
}

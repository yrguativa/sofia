import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from './icons'
import { icons } from './iconPaths'

export const inputCls =
  'w-full rounded-2xl border border-transparent bg-mist px-4 py-3.5 text-base text-ink outline-none transition placeholder:text-zinc-400 focus:border-ink focus:bg-white'
export const primaryBtn =
  'inline-flex items-center justify-center gap-2 rounded-full bg-ink px-6 py-3.5 font-semibold text-acid transition active:scale-[0.98] disabled:opacity-60'
export const secondaryBtn =
  'inline-flex items-center justify-center rounded-full bg-mist px-5 py-3 font-medium text-ink transition active:scale-[0.98] disabled:opacity-60'
export const dangerBtn = 'rounded-full px-4 py-3 font-medium text-red-600'

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium text-zinc-600">
      {label}
      {children}
      {hint && <span className="text-xs font-normal text-zinc-500">{hint}</span>}
    </label>
  )
}

export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <header className="mb-6 flex items-center justify-between gap-3">
      <h1 className="text-3xl font-bold tracking-tight text-ink">{title}</h1>
      {action}
    </header>
  )
}

export function SectionTitle({ title, to, linkLabel }: { title: string; to?: string; linkLabel?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      {to && linkLabel && (
        <Link to={to} className="text-sm font-medium text-zinc-500 hover:text-ink">
          {linkLabel}
        </Link>
      )}
    </div>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-[28px] bg-white p-5 shadow-sm ${className}`}>{children}</section>
}

export function MonthSwitcher({
  label,
  onPrev,
  onNext,
  canNext,
}: {
  label: string
  onPrev: () => void
  onNext: () => void
  canNext: boolean
}) {
  return (
    <div className="mb-6 flex items-center justify-between rounded-full bg-white p-1.5 shadow-sm">
      <button
        type="button"
        onClick={onPrev}
        aria-label="Mes anterior"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-mist text-ink"
      >
        <Icon className="h-4 w-4">{icons.chevronLeft}</Icon>
      </button>
      <span className="font-semibold text-ink">{label}</span>
      <button
        type="button"
        onClick={onNext}
        disabled={!canNext}
        aria-label="Mes siguiente"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-mist text-ink disabled:opacity-40"
      >
        <Icon className="h-4 w-4">{icons.chevronRight}</Icon>
      </button>
    </div>
  )
}

export function ProgressBar({ value, tone = 'ink' }: { value: number; tone?: 'ink' | 'red' | 'acid' }) {
  const color = tone === 'red' ? 'bg-red-500' : tone === 'acid' ? 'bg-acid' : 'bg-ink'
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-100">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  )
}

export function Loading() {
  return <p className="py-10 text-center text-zinc-500">Cargando…</p>
}

export function ErrorText({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
      {children}
    </p>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-[24px] border border-dashed border-zinc-300 bg-white/60 p-6 text-center text-sm text-zinc-500">
      {children}
    </p>
  )
}

export function Brand({ dark = false }: { dark?: boolean }) {
  return (
    <div className={`flex items-center gap-2 text-base font-bold ${dark ? 'text-white' : 'text-ink'}`}>
      <span className={`flex h-9 w-9 items-center justify-center rounded-full ${dark ? 'bg-acid text-ink' : 'bg-ink text-acid'}`}>
        $
      </span>
      Finanzas
    </div>
  )
}

export function AuthScreen({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-dvh bg-acid lg:grid lg:grid-cols-2">
      <aside className="hidden flex-col justify-between bg-ink p-12 text-white lg:flex">
        <Brand dark />
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-acid">Finanzas personales</p>
          <h2 className="mt-4 max-w-lg text-6xl font-bold leading-[1.02] tracking-tight">
            Todo tu dinero en un solo lugar.
          </h2>
          <p className="mt-6 max-w-md text-lg text-zinc-400">
            Cuentas, movimientos, presupuestos y metas, protegidos con verificación en dos pasos.
          </p>
        </div>
        <ul className="grid grid-cols-3 gap-4 text-sm">
          {['Cuentas', 'Presupuestos', 'Metas'].map((item) => (
            <li key={item} className="rounded-2xl bg-white/5 p-4 font-medium">
              <span className="mb-3 block h-2.5 w-2.5 rounded-full bg-acid" />
              {item}
            </li>
          ))}
        </ul>
      </aside>
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 py-10 lg:justify-center lg:px-16">
        <div className="lg:hidden">
          <Brand />
        </div>
        {children}
      </div>
    </main>
  )
}

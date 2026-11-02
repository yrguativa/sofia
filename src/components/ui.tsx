import type { ReactNode } from 'react'

export const inputCls =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base outline-none focus:border-slate-900'
export const primaryBtn =
  'rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white disabled:opacity-60'
export const secondaryBtn =
  'rounded-xl border border-slate-300 bg-white px-4 py-3 font-medium text-slate-700 disabled:opacity-60'
export const dangerBtn = 'rounded-xl px-4 py-3 font-medium text-red-600'

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
      {label}
      {children}
      {hint && <span className="text-xs font-normal text-slate-500">{hint}</span>}
    </label>
  )
}

export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <header className="mb-6 flex items-center justify-between gap-3">
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      {action}
    </header>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl bg-white p-5 shadow-sm ${className}`}>{children}</section>
}

export function ProgressBar({ value, tone = 'slate' }: { value: number; tone?: 'slate' | 'red' | 'emerald' }) {
  const color = tone === 'red' ? 'bg-red-500' : tone === 'emerald' ? 'bg-emerald-500' : 'bg-slate-900'
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  )
}

export function Loading() {
  return <p className="py-10 text-center text-slate-500">Cargando…</p>
}

export function ErrorText({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
      {children}
    </p>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">{children}</p>
}

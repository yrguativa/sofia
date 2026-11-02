import { NavLink, Outlet } from 'react-router-dom'

const tabs = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/movimientos', label: 'Movimientos', end: false },
  { to: '/presupuestos', label: 'Presupuestos', end: false },
  { to: '/metas', label: 'Metas', end: false },
  { to: '/mas', label: 'Más', end: false },
]

export function AppShell() {
  return (
    <div className="mx-auto min-h-dvh max-w-md bg-slate-50 pb-28">
      <main className="px-5 pt-8">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-md">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center py-3 text-xs ${isActive ? 'font-semibold text-slate-900' : 'text-slate-500'}`
              }
            >
              {t.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}

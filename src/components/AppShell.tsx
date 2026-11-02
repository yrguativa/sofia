import { NavLink, Outlet } from 'react-router-dom'
import { Brand } from './ui'
import { Icon } from './icons'
import { icons } from './iconPaths'

const tabs = [
  { to: '/', label: 'Inicio', end: true, icon: icons.home },
  { to: '/movimientos', label: 'Movimientos', end: false, icon: icons.movimientos },
  { to: '/presupuestos', label: 'Presupuestos', end: false, icon: icons.presupuestos },
  { to: '/metas', label: 'Metas', end: false, icon: icons.metas },
  { to: '/deudas', label: 'Deudas', end: false, icon: icons.tarjeta },
  { to: '/mas', label: 'Más', end: false, icon: icons.mas },
]

export function AppShell() {
  return (
    <div className="min-h-dvh lg:flex">
      <aside className="fixed inset-y-4 left-4 hidden w-60 flex-col rounded-[32px] bg-ink p-5 text-white lg:flex">
        <div className="mb-10 px-2">
          <Brand dark />
        </div>
        <nav className="flex flex-col gap-1">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                  isActive ? 'bg-acid text-ink' : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <Icon>{t.icon}</Icon>
              {t.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="min-h-dvh w-full pb-32 lg:ml-72 lg:max-w-none lg:pb-12">
        <main className="px-5 pt-6 lg:px-10 lg:pt-10">
          <div className="animate-page lg:mx-auto lg:max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-5 z-40 px-5 pb-[env(safe-area-inset-bottom)] lg:hidden">
        <div className="mx-auto flex w-full max-w-md items-center justify-between gap-1 rounded-full bg-ink p-1.5 shadow-2xl sm:max-w-sm">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              aria-label={t.label}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-full transition ${
                  isActive ? 'bg-acid px-4 py-3 text-sm font-semibold text-ink' : 'h-11 w-11 justify-center text-zinc-400 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon>{t.icon}</Icon>
                  {isActive && <span>{t.label}</span>}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}

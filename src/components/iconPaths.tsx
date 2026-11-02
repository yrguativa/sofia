import type { ReactNode } from 'react'
import type { AccountType, PlanGrupo, TxType } from '../lib/types'

export const icons = {
  home: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  movimientos: (
    <>
      <path d="M7 4v16m0 0-3-3m3 3 3-3" />
      <path d="M17 20V4m0 0-3 3m3-3 3 3" />
    </>
  ),
  presupuestos: <path d="M3 20h18M6 20v-6M12 20V6M18 20v-9" />,
  metas: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  mas: (
    <>
      <circle cx="5" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  cuentas: (
    <>
      <rect x="3" y="6" width="18" height="13" rx="3" />
      <path d="M3 10h18M16 15h2" />
    </>
  ),
  chevronLeft: <path d="m15 18-6-6 6-6" />,
  chevronRight: <path d="m9 18 6-6-6-6" />,
  arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  close: <path d="M18 6 6 18M6 6l12 12" />,

  ingreso: <path d="M3 17l6-6 4 4 8-8M14 7h7v7" />,
  gasto: <path d="M3 7l6 6 4-4 8 8M14 17h7v-7" />,
  transferencia: <path d="M4 7h13l-3-3M20 17H7l3 3" />,
  balance: <path d="M12 3v18M5 7h14M7 7l-3 6a3 3 0 0 0 6 0L7 7zm10 0-3 6a3 3 0 0 0 6 0l-3-6z" />,
  filtrar: <path d="M4 5h16l-6 8v6l-4-2v-4z" />,
  todos: <path d="M4 6h16M4 12h16M4 18h16" />,
  calendario: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  editar: <path d="M4 20h4L19 9l-4-4L4 16v4zm9.5-13.5 4 4" />,
  eliminar: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  logout: <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h11" />,
  seguridad: (
    <>
      <path d="M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  llave: (
    <>
      <circle cx="8" cy="15" r="4" />
      <path d="M11 12l9-9M17 6l2 2M14 9l2 2" />
    </>
  ),
  salario: (
    <>
      <rect x="2.5" y="6.5" width="19" height="11" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 10v4M18 10v4" />
    </>
  ),
  categorias: (
    <>
      <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z" />
      <circle cx="7.5" cy="7.5" r="1.5" />
    </>
  ),
  plantilla: <path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />,
  simulador: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 7h6M9 12h.01M13 12h.01M9 16h.01M13 16h.01" />
    </>
  ),
  usuario: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  alerta: (
    <>
      <path d="M12 9v4M12 17h.01" />
      <path d="M10.3 3.9 2.6 17.3A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.7L13.7 3.9a2 2 0 0 0-3.4 0z" />
    </>
  ),
  sparkle: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />,
  correo: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </>
  ),
  banco: (
    <>
      <path d="M3 10h18M5 10v9M9 10v9M15 10v9M19 10v9M2 21h20M12 3l9 5H3z" />
    </>
  ),
  efectivo: (
    <>
      <rect x="2.5" y="6.5" width="19" height="11" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  tarjeta: (
    <>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20M6 15h4" />
    </>
  ),
  ahorro: (
    <>
      <path d="M7 7h10l1 3v9a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-9z" />
      <path d="M9 7V5h6v2M10 13h4" />
    </>
  ),
  pagado: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  pendiente: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l2.5 2" />
    </>
  ),
  buscar: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
}

export const tipoMovimientoIcon: Record<TxType, ReactNode> = {
  ingreso: icons.ingreso,
  gasto: icons.gasto,
  transferencia: icons.transferencia,
}

export const tipoCuentaIcon: Record<AccountType, ReactNode> = {
  banco: icons.banco,
  efectivo: icons.efectivo,
  tarjeta: icons.tarjeta,
  ahorro: icons.ahorro,
}

export const grupoIcon: Record<PlanGrupo, ReactNode> = {
  'Gastos fijos': icons.calendario,
  'Gastos variables': icons.filtrar,
  Deudas: icons.tarjeta,
  Ahorros: icons.ahorro,
}

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Empty, ErrorText, Field, Loading, PageHeader, inputCls, primaryBtn, secondaryBtn } from '../components/ui'
import { MoneyInput } from '../components/MoneyInput'
import {
  createCategory,
  deleteCategory,
  deletePlanItem,
  deleteSalarioHistorial,
  generarMes,
  getProfile,
  getSalario,
  listCategories,
  listEntries,
  listPlanItems,
  listSalarioHistorial,
  savePlanItem,
  saveSalarioHistorial,
  updateProfile,
} from '../lib/db'
import { useAuth } from '../auth/AuthContext'
import { currentMonth, formatMoney, mesDePresupuesto, monthLabel } from '../lib/format'
import { parseMoney } from '../lib/money'
import { grupos, type CategoryType, type PlanGrupo } from '../lib/types'

const monedas = ['COP', 'USD', 'EUR', 'MXN', 'ARS', 'CLP', 'PEN', 'BRL']

type Datos = {
  profile: Awaited<ReturnType<typeof getProfile>>
  salarios: Awaited<ReturnType<typeof listSalarioHistorial>>
  categories: Awaited<ReturnType<typeof listCategories>>
  planItems: Awaited<ReturnType<typeof listPlanItems>>
  salarioMes: number | null
  entriesCount: number
  mes: string
}

export function OnboardingPage() {
  const navigate = useNavigate()
  const { refreshStatus } = useAuth()
  const [paso, setPaso] = useState(0)
  const [datos, setDatos] = useState<Datos | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [avisoPaso, setAvisoPaso] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [finalizing, setFinalizing] = useState(false)

  const cargar = useCallback(async () => {
    const profile = await getProfile()
    const mes = mesDePresupuesto(new Date(), profile.dia_pago)
    const [salarios, categories, planItems, salarioMes, entries] = await Promise.all([
      listSalarioHistorial(),
      listCategories(),
      listPlanItems(),
      getSalario(mes),
      listEntries(mes),
    ])
    return { profile, salarios, categories, planItems, salarioMes, entriesCount: entries.length, mes } satisfies Datos
  }, [])

  useEffect(() => {
    let vivo = true
    cargar().then((d) => vivo && setDatos(d)).catch((e) => vivo && setError(e instanceof Error ? e.message : 'No se pudo cargar.'))
    return () => { vivo = false }
  }, [cargar])

  async function recargar() {
    try {
      setDatos(await cargar())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar.')
    }
  }

  async function finalizar() {
    setFinalizing(true)
    try {
      await updateProfile({ onboarding_visto: true })
      await refreshStatus()
    } catch {
      // ignore
    } finally {
      setFinalizing(false)
      navigate('/')
    }
  }

  if (error) return <><PageHeader title="Bienvenido" /><ErrorText>{error}</ErrorText></>
  if (!datos) return <><PageHeader title="Bienvenido" /><Loading /></>

  const totalPasos = 6

  function puedeAvanzar(): string | null {
    if (paso === 1 && datos!.salarios.length === 0) return 'Registra tu salario para continuar.'
    if (paso === 3 && datos!.planItems.length === 0) return 'Agrega al menos un gasto a tu plantilla para continuar.'
    if (paso === 4 && datos!.entriesCount === 0) return 'Pulsa "Generar presupuesto" para continuar.'
    return null
  }

  async function siguiente() {
    setAvisoPaso(null)
    // Paso 0 (perfil) se guarda desde su propio formulario; aquí solo valida.
    // Los demás pasos validan que ya exista información configurada.
    const bloqueo = puedeAvanzar()
    if (bloqueo) {
      setAvisoPaso(bloqueo)
      return
    }
    setPaso((p) => Math.min(totalPasos - 1, p + 1))
    window.scrollTo({ top: 0 })
  }

  return (
    <>
      <PageHeader title="Bienvenido a Finanzas" />
      <Card className="mb-6 flex flex-col gap-4">
        <div className="text-center">
          <p className="text-xs text-zinc-500">Paso {paso + 1} de {totalPasos}</p>
          <div className="mt-2 flex justify-center gap-1.5" aria-hidden>
            {Array.from({ length: totalPasos }, (_, i) => (
              <span key={i} className={`h-2 w-8 rounded-full ${i <= paso ? 'bg-ink' : 'bg-zinc-200'}`} />
            ))}
          </div>
        </div>

        {paso === 0 && <PasoPerfil profile={datos.profile} onSaved={recargar} onNext={siguiente} saving={saving} setSaving={setSaving} />}
        {paso === 1 && <PasoSalario mes={datos.mes} salarios={datos.salarios} moneda={datos.profile.moneda} onChanged={recargar} />}
        {paso === 2 && <PasoCategorias categories={datos.categories} onChanged={recargar} />}
        {paso === 3 && <PasoPlantilla onChanged={recargar} planItems={datos.planItems} categories={datos.categories} moneda={datos.profile.moneda} />}
        {paso === 4 && <PasoPresupuesto datos={datos} onChanged={recargar} />}
        {paso === 5 && <PasoFinal onFinish={finalizar} finalizing={finalizing} />}

        {avisoPaso && <ErrorText>{avisoPaso}</ErrorText>}

        {paso > 0 && paso < 5 && (
          <div className="flex gap-2">
            <button type="button" onClick={() => { setAvisoPaso(null); setPaso((p) => p - 1) }} className={`${secondaryBtn} flex-1`}>
              Anterior
            </button>
            <button type="button" onClick={siguiente} className={`${primaryBtn} flex-1`}>
              Siguiente
            </button>
          </div>
        )}
        {paso === 5 && (
          <button type="button" onClick={() => setPaso(4)} className={`${secondaryBtn} w-full`}>
            Anterior
          </button>
        )}
        <button type="button" onClick={finalizar} className="self-center text-sm text-zinc-500 underline underline-offset-4">
          Saltar onboarding
        </button>
      </Card>
    </>
  )
}

/* ---------- Paso 0: Perfil ---------- */
function PasoPerfil({ profile, onSaved, onNext, saving, setSaving }: {
  profile: Datos['profile']
  onSaved: () => Promise<void>
  onNext: () => void
  saving: boolean
  setSaving: (v: boolean) => void
}) {
  const [nombre, setNombre] = useState(profile.nombre ?? '')
  const [moneda, setMoneda] = useState(profile.moneda)
  const [diaPago, setDiaPago] = useState(String(profile.dia_pago))
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  async function guardar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setOk(null)
    setSaving(true)
    try {
      await updateProfile({ nombre: nombre.trim(), moneda, dia_pago: Number(diaPago) })
      await onSaved()
      setOk('Perfil guardado. Ya puedes continuar.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <h2 className="text-xl font-bold text-ink">¿Cómo te llamas y cuándo te pagan?</h2>
        <p className="mt-1 text-sm text-zinc-600">Esto define tu moneda y desde qué día el presupuesto muestra el mes nuevo.</p>
      </div>
      <form onSubmit={guardar} className="flex flex-col gap-4">
        <Field label="Tu nombre">
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={60} placeholder="Ej. Sofía" className={inputCls} required />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Moneda">
            <select value={moneda} onChange={(e) => setMoneda(e.target.value)} className={inputCls}>
              {monedas.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Día de pago" hint="Hasta ese día verás el mes anterior.">
            <select value={diaPago} onChange={(e) => setDiaPago(e.target.value)} className={inputCls}>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>Día {d}</option>)}
            </select>
          </Field>
        </div>
        {error && <ErrorText>{error}</ErrorText>}
        {ok && <p className="text-sm text-emerald-700" role="status">{ok}</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={saving} className={`${secondaryBtn} flex-1`}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
          <button type="button" onClick={onNext} className={`${primaryBtn} flex-1`}>
            Siguiente
          </button>
        </div>
      </form>
    </div>
  )
}

/* ---------- Paso 1: Salario ---------- */
function PasoSalario({ mes, salarios, moneda, onChanged }: {
  mes: string
  salarios: Datos['salarios']
  moneda: string
  onChanged: () => Promise<void>
}) {
  const [desde, setDesde] = useState(currentMonth())
  const [monto, setMonto] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function guardar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const n = parseMoney(monto)
    if (!(n > 0)) return setError('El monto debe ser mayor que cero.')
    if (!desde) return setError('Elige el mes de vigencia.')
    setSaving(true)
    try {
      await saveSalarioHistorial(desde, n)
      setMonto('')
      await onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <h2 className="text-xl font-bold text-ink">Configura tu salario</h2>
        <p className="mt-1 text-sm text-zinc-600">Sin salario no se puede generar el presupuesto. Aplica desde <strong>{monthLabel(desde || mes)}</strong>.</p>
      </div>
      <form onSubmit={guardar} className="flex flex-col gap-3 rounded-2xl bg-mist p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Mes de vigencia">
            <input type="month" value={desde} onChange={(e) => setDesde(e.target.value)} className={inputCls} required />
          </Field>
          <Field label="Monto mensual">
            <MoneyInput value={monto} onChange={setMonto} required />
          </Field>
        </div>
        {error && <ErrorText>{error}</ErrorText>}
        <button type="submit" disabled={saving} className={primaryBtn}>
          {saving ? 'Guardando…' : salarios.length === 0 ? 'Guardar mi salario' : 'Agregar otro salario'}
        </button>
      </form>
      {salarios.length === 0 ? (
        <Empty>Aún no has registrado tu salario. Escríbelo arriba.</Empty>
      ) : (
        <ul className="flex flex-col gap-2">
          {salarios.slice(0, 5).map((h) => (
            <li key={h.id} className="flex items-center justify-between rounded-2xl bg-mist px-4 py-3 text-sm">
              <span className="text-ink">Desde {h.desde.slice(0, 7)} · <strong>{formatMoney(Number(h.monto), moneda)}</strong></span>
              <button
                type="button"
                onClick={async () => { if (window.confirm('¿Eliminar este salario?')) { await deleteSalarioHistorial(h.id); await onChanged() } }}
                className="text-sm font-medium text-red-600"
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* ---------- Paso 2: Categorías ---------- */
function PasoCategorias({ categories, onChanged }: {
  categories: Datos['categories']
  onChanged: () => Promise<void>
}) {
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState<CategoryType>('gasto')
  const [icono, setIcono] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const propias = categories.filter((c) => c.user_id !== null)
  const existeSalario = categories.some((c) => c.nombre.toLowerCase() === 'salario' && c.tipo === 'ingreso')
  const existeAhorro = categories.some((c) => c.nombre.toLowerCase() === 'ahorro' && c.tipo === 'gasto')

  const sugeridasGasto: { nombre: string; icono: string }[] = [
    { nombre: 'Arriendo', icono: '🏠' },
    { nombre: 'Servicios', icono: '💡' },
    { nombre: 'Mercado', icono: '🛒' },
    { nombre: 'Transporte', icono: '🚌' },
  ]
  const iconosRapidos = ['🏠', '🛒', '🚌', '💡', '🐶', '🩺', '🎬', '🛍️', '📦', '💰']

  async function agregar(n: string, t: CategoryType, ic: string | null = null) {
    const limpio = n.trim()
    if (!limpio) return
    setSaving(true)
    setError(null)
    try {
      await createCategory(limpio, t, ic?.trim() || null)
      setNombre('')
      setIcono('')
      await onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <h2 className="text-xl font-bold text-ink">Crea tus categorías</h2>
        <p className="mt-1 text-sm text-zinc-600">Por defecto ya tienes <strong>💼 Salario</strong> (ingreso) y <strong>🐷 Ahorro</strong> (gasto). Si quieres, agrega tus gastos (opcional).</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={saving || existeSalario}
          onClick={() => agregar('Salario', 'ingreso', '💼')}
          title={existeSalario ? 'Ya tienes la categoría Salario' : 'Agregar categoría Salario (ingreso)'}
          className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {existeSalario ? '✓ 💼 Salario (ingreso)' : '+ 💼 Salario (ingreso)'}
        </button>
        <button
          type="button"
          disabled={saving || existeAhorro}
          onClick={() => agregar('Ahorro', 'gasto', '🐷')}
          title={existeAhorro ? 'Ya tienes la categoría Ahorro' : 'Agregar categoría Ahorro (gasto)'}
          className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {existeAhorro ? '✓ 🐷 Ahorro (gasto)' : '+ 🐷 Ahorro (gasto)'}
        </button>
        {sugeridasGasto.map((s) => (
          <button
            key={s.nombre}
            type="button"
            disabled={saving || propias.some((p) => p.nombre.toLowerCase() === s.nombre.toLowerCase())}
            onClick={() => agregar(s.nombre, 'gasto', s.icono)}
            className="rounded-full bg-mist px-4 py-2 text-sm font-medium text-ink disabled:opacity-40"
          >
            + {s.icono} {s.nombre}
          </button>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); agregar(nombre, tipo, icono) }} className="flex flex-col gap-3 rounded-2xl bg-mist p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_140px_90px]">
          <Field label="Nueva categoría">
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={40} placeholder="Ej. Mascotas" className={inputCls} />
          </Field>
          <Field label="Tipo">
            <select value={tipo} onChange={(e) => setTipo(e.target.value as CategoryType)} className={inputCls}>
              <option value="gasto">Gasto</option>
              <option value="ingreso">Ingreso</option>
            </select>
          </Field>
          <Field label="Icono">
            <input value={icono} onChange={(e) => setIcono(e.target.value)} maxLength={4} placeholder="🐶" className={`${inputCls} text-center`} aria-label="Icono" />
          </Field>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {iconosRapidos.map((em) => (
            <button
              key={em}
              type="button"
              onClick={() => setIcono(em)}
              aria-label={`Usar icono ${em}`}
              className={`flex h-9 w-9 items-center justify-center rounded-full text-lg ${icono === em ? 'bg-ink text-white' : 'bg-white'}`}
            >
              {em}
            </button>
          ))}
        </div>
        {error && <ErrorText>{error}</ErrorText>}
        <button type="submit" disabled={saving || !nombre.trim()} className={primaryBtn}>
          {saving ? 'Creando…' : 'Agregar categoría'}
        </button>
      </form>
      {propias.length === 0 ? (
        <Empty>Todavía no tienes categorías propias.</Empty>
      ) : (
        <ul className="flex flex-col gap-2">
          {propias.map((c) => (
            <li key={c.id} className="flex items-center justify-between rounded-2xl bg-mist px-4 py-3 text-sm">
              <span className="text-ink">{c.icono ? `${c.icono} ` : ''}{c.nombre} <span className="text-xs text-zinc-500">· {c.tipo}</span></span>
              <button
                type="button"
                onClick={async () => { if (window.confirm(`¿Eliminar "${c.nombre}"?`)) { await deleteCategory(c.id); await onChanged() } }}
                className="text-sm font-medium text-red-600"
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* ---------- Paso 3: Plantilla ---------- */
function PasoPlantilla({ planItems, categories, moneda, onChanged }: {
  planItems: Datos['planItems']
  categories: Datos['categories']
  moneda: string
  onChanged: () => Promise<void>
}) {
  const [nombre, setNombre] = useState('')
  const [grupo, setGrupo] = useState<PlanGrupo>('Gastos fijos')
  const [tipo, setTipo] = useState<'valor' | 'porcentaje'>('valor')
  const [valor, setValor] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const catsGasto = categories.filter((c) => c.tipo === 'gasto')

  async function agregar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const numero = tipo === 'valor' ? parseMoney(valor) : Number(valor.replace(',', '.'))
    if (!nombre.trim()) return setError('Ponle un nombre al gasto.')
    if (!(numero >= 0)) return setError('El valor debe ser un número positivo.')
    if (tipo === 'porcentaje' && numero > 100) return setError('El porcentaje no puede superar 100.')
    setSaving(true)
    try {
      await savePlanItem({
        nombre: nombre.trim(),
        grupo,
        categoria_id: categoriaId || null,
        tipo_monto: tipo,
        valor: numero,
        activo: true,
        orden: planItems.length,
        debt_id: null,
        goal_id: null,
      })
      setNombre('')
      setValor('')
      await onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <h2 className="text-xl font-bold text-ink">Arma tu plantilla</h2>
        <p className="mt-1 text-sm text-zinc-600">Tus gastos recurrentes. Usa % del salario para el diezmo o el ahorro.</p>
      </div>
      <form onSubmit={agregar} className="flex flex-col gap-3 rounded-2xl bg-mist p-4">
        <Field label="Nombre del gasto">
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={60} placeholder="Ej. Arriendo" className={inputCls} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Grupo">
            <select value={grupo} onChange={(e) => setGrupo(e.target.value as PlanGrupo)} className={inputCls}>
              {grupos.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </Field>
          <Field label="Categoría">
            <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className={inputCls}>
              <option value="">Sin categoría</option>
              {catsGasto.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-white p-1">
          {(['valor', 'porcentaje'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTipo(t)}
              className={`rounded-lg py-2 text-sm font-medium ${tipo === t ? 'bg-ink text-white' : 'text-zinc-500'}`}
            >
              {t === 'valor' ? 'Valor fijo' : '% salario'}
            </button>
          ))}
        </div>
        <Field label={tipo === 'porcentaje' ? 'Porcentaje (%)' : `Valor (${moneda})`}>
          {tipo === 'valor'
            ? <MoneyInput value={valor} onChange={setValor} />
            : <input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="Ej. 10" className={inputCls} />}
        </Field>
        {error && <ErrorText>{error}</ErrorText>}
        <button type="submit" disabled={saving} className={primaryBtn}>
          {saving ? 'Agregando…' : 'Agregar a mi plantilla'}
        </button>
      </form>
      {planItems.length === 0 ? (
        <Empty>Agrega tu primer gasto fijo, por ejemplo el arriendo.</Empty>
      ) : (
        <ul className="flex flex-col gap-2">
          {planItems.slice(0, 8).map((i) => (
            <li key={i.id} className="flex items-center justify-between rounded-2xl bg-mist px-4 py-3 text-sm">
              <span className="text-ink">{i.nombre} <span className="text-xs text-zinc-500">· {i.grupo} · {i.tipo_monto === 'porcentaje' ? `${i.valor}%` : formatMoney(i.valor, moneda)}</span></span>
              <button
                type="button"
                onClick={async () => { if (window.confirm(`¿Eliminar "${i.nombre}"?`)) { await deletePlanItem(i.id); await onChanged() } }}
                className="text-sm font-medium text-red-600"
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}
      {planItems.length > 8 && <p className="text-center text-xs text-zinc-500">…y {planItems.length - 8} más en Plantilla.</p>}
    </div>
  )
}

/* ---------- Paso 4: Presupuesto ---------- */
function PasoPresupuesto({ datos, onChanged }: {
  datos: Datos
  onChanged: () => Promise<void>
}) {
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  async function generar() {
    setError(null)
    setOk(null)
    if (datos.salarioMes == null) {
      setError('Primero registra tu salario (vuelve al paso 2).')
      return
    }
    if (datos.planItems.length === 0) {
      setError('Primero agrega tu plantilla (vuelve al paso anterior).')
      return
    }
    setWorking(true)
    try {
      const creados = await generarMes(datos.mes)
      await onChanged()
      setOk(creados > 0 ? `Listo: se generaron ${creados} ítems de ${monthLabel(datos.mes)}.` : 'Ese mes ya estaba generado.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar.')
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 text-center">
      <h2 className="text-xl font-bold text-ink">Genera tu primer presupuesto</h2>
      <p className="text-sm text-zinc-600">
        Mes <strong>{monthLabel(datos.mes)}</strong> · Salario{' '}
        <strong>{datos.salarioMes == null ? 'sin configurar' : formatMoney(datos.salarioMes, datos.profile.moneda)}</strong>
      </p>
      <div className="rounded-2xl bg-mist p-4 text-sm text-zinc-600">
        {datos.entriesCount === 0
          ? `Tienes ${datos.planItems.length} ítems en plantilla listos para generar.`
          : `Ya tienes ${datos.entriesCount} ítems generados este mes. Puedes continuar.`}
      </div>
      {error && <ErrorText>{error}</ErrorText>}
      {ok && <p className="text-sm text-emerald-700" role="status">{ok}</p>}
      <button type="button" onClick={generar} disabled={working} className={primaryBtn}>
        {working ? 'Generando…' : datos.entriesCount === 0 ? 'Generar presupuesto del mes' : 'Volver a generar'}
      </button>
    </div>
  )
}

/* ---------- Paso 5: Final ---------- */
function PasoFinal({ onFinish, finalizing }: {
  onFinish: () => void
  finalizing: boolean
}) {
  return (
    <div className="flex flex-col gap-4 text-center">
      <h2 className="text-xl font-bold text-ink">Todo listo 🎉</h2>
      <div className="rounded-2xl bg-mist p-4 text-left text-sm text-zinc-600">
        <p><strong className="text-ink">Seguridad:</strong> la verificación en dos pasos ya está activa. Guarda tu código TOTP en KeePass o Aegis.</p>
        <p className="mt-2"><strong className="text-ink">Atajos iOS (opcional):</strong> en Más → Atajos puedes crear un token para registrar gastos desde tu iPhone.</p>
        <p className="mt-2"><strong className="text-ink">Siguiente paso:</strong> en Presupuesto marca cada ítem como pagado a medida que pagues.</p>
      </div>
      <button type="button" onClick={onFinish} disabled={finalizing} className={primaryBtn}>
        {finalizing ? 'Guardando…' : 'Comenzar a usar Finanzas'}
      </button>
    </div>
  )
}

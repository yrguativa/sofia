import { PageHeader, Card } from '../components/ui'

export function SimulatorPage() {
  return (
    <>
      <PageHeader title="Simulador" />
      <Card>
        <p className="font-medium text-slate-900">Pendiente de integrar</p>
        <p className="mt-2 text-sm text-slate-600">
          Esta pantalla está lista para recibir el simulador. Su lógica de cálculo irá en
          <code className="mx-1 rounded bg-slate-100 px-1">src/lib/simulator.ts</code> como funciones puras, y la interfaz en este archivo.
        </p>
      </Card>
    </>
  )
}

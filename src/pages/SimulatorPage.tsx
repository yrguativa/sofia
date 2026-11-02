import { PageHeader, Card } from '../components/ui'

export function SimulatorPage() {
  return (
    <>
      <PageHeader title="Simulador" />
      <Card>
        <p className="font-semibold text-ink">Pendiente de integrar</p>
        <p className="mt-2 text-sm text-zinc-600">
          Esta pantalla está lista para recibir el simulador. Su lógica de cálculo irá en
          <code className="mx-1 rounded bg-mist px-1.5 py-0.5">src/lib/simulator.ts</code> como funciones puras, y la interfaz en este archivo.
        </p>
      </Card>
    </>
  )
}

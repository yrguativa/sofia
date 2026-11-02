export type ColorPago = 'verde' | 'amarillo'

export function colorPorCuenta(nombre: string | undefined): ColorPago | undefined {
  if (!nombre) return undefined
  return nombre === 'Bolsillo' ? 'amarillo' : 'verde'
}

export const fondosPago: Record<ColorPago | 'neutro', string> = {
  neutro: 'bg-white',
  verde: 'bg-acid/30 ring-1 ring-acid',
  amarillo: 'bg-sun ring-1 ring-sun-ring',
}

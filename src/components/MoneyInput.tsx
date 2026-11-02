import type { InputHTMLAttributes } from 'react'
import { formatMoneyInput, normalizeMoneyInput } from '../lib/money'
import { inputCls } from './ui'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  value: string
  onChange: (canonico: string) => void
}

export function MoneyInput({ value, onChange, className, ...rest }: Props) {
  return (
    <input
      {...rest}
      type="text"
      inputMode="decimal"
      placeholder="$ 0"
      value={formatMoneyInput(value)}
      onChange={(e) => onChange(normalizeMoneyInput(e.target.value))}
      className={className ?? inputCls}
    />
  )
}

import { useEffect, useState } from 'react'

const VERSION = '0.5.0'

export function SplashScreen() {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 1500)
    return () => clearTimeout(timer)
  }, [])

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-ink text-white">
      <div className="flex h-24 w-24 items-center justify-center rounded-[32px] bg-acid text-ink">
        <span className="text-5xl font-bold">$</span>
      </div>
      <h1 className="mt-6 text-2xl font-bold tracking-tight">Finanzas</h1>
      <p className="mt-2 text-sm text-zinc-400">v{VERSION}</p>
      <div className="mt-8 h-1 w-24 overflow-hidden rounded-full bg-white/20">
        <div className="h-full w-1/3 animate-pulse rounded-full bg-acid" />
      </div>
    </div>
  )
}

import { useCallback, useEffect, useState } from 'react'

export function useLoad<T>(loader: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      setData(await loader())
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ocurrió un error inesperado.')
    }
  }, [loader])

  useEffect(() => {
    reload()
  }, [reload])

  return { data, error, reload }
}

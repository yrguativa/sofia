import type { ReactNode } from 'react'
import { Icon } from './icons'
import { icons } from './iconPaths'

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-ink/40 backdrop-blur-sm lg:items-center lg:justify-center lg:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="mx-auto max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-[32px] bg-white p-6 pb-10 lg:rounded-[32px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-zinc-200" />
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-mist text-ink"
          >
            <Icon className="h-4 w-4">{icons.close}</Icon>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

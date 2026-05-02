'use client'

import { ReactNode, useState } from 'react'

type Props = {
  title: string
  defaultOpen?: boolean
  children: ReactNode
}

export default function ToggleSection({
  title,
  defaultOpen = false,
  children,
}: Props) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="rounded-2xl border bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between px-6 py-4 text-left"
      >
        <span className="font-semibold">{title}</span>
        <span className="text-sm text-slate-500">{open ? '닫기' : '열기'}</span>
      </button>

      {open && <div className="border-t p-6">{children}</div>}
    </div>
  )
}
'use client'

import { ReactNode } from 'react'

type SectionItem = {
  key: string
  label: string
  description?: string
  badge?: string
}

type Props = {
  title: string
  subtitle?: string
  activeKey: string | null
  items: SectionItem[]
  onChange: (key: string) => void
  headerAction?: ReactNode
  children: ReactNode
}

export default function DashboardShell({
  title,
  subtitle,
  activeKey,
  items,
  onChange,
  headerAction,
  children,
}: Props) {
  const showSidebar = Boolean(activeKey)

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-4">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">Academy Automation Beta</p>
              <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                {title}
              </h1>
              {subtitle && <p className="mt-1 text-sm text-slate-600 sm:text-base">{subtitle}</p>}
            </div>

            {headerAction && <div className="shrink-0">{headerAction}</div>}
          </div>
        </div>

        <div className={`grid gap-6 ${showSidebar ? 'lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start' : ''}`}>
          <section className="min-w-0">{children}</section>

          {showSidebar && (
            <aside className="space-y-3">
              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:sticky lg:top-6">
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                  {items.map((item) => {
                    const isActive = item.key === activeKey

                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => {
                            if (item.key === activeKey) {
                                onChange(null) // 다시 누르면 닫힘
                            } else {
                            onChange(item.key)
                            }
                        }}
                        className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                          isActive
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-semibold">{item.label}</span>
                          {item.badge && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-[11px] ${
                                isActive ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className={`mt-1 text-xs ${isActive ? 'text-slate-200' : 'text-slate-500'}`}>
                            {item.description}
                          </p>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>
    </main>
  )
}
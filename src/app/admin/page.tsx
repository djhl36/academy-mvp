'use client'

import { useEffect, useState } from 'react'
import DashboardShell from '@/components/DashboardShell'
import StudentForm from '@/components/StudentForm'
import StudentList from '@/components/StudentList'
import ClassGroupManager from '@/components/ClassGroupManager'
import AcademicRecordForm from '@/components/AcademicRecordForm'
import RecordList from '@/components/RecordList'
import ParentInquiryList from '@/components/ParentInquiryList'
import AdminNoticeCenter from '@/components/AdminNoticeCenter'
import AdminTaskList from '@/components/AdminTaskList'

const ADMIN_SECTIONS = [
  { key: 'students', label: '학생 등록/관리' },
  { key: 'classes', label: '반 등록/배정' },
  { key: 'records', label: '학업 데이터' },
  { key: 'tasks', label: '할 일 리스트', badge: '핵심' },
  { key: 'inquiries', label: '상담 내역' },
  { key: 'notice', label: '공지사항' },
] as const

type AdminSectionKey = (typeof ADMIN_SECTIONS)[number]['key']

const ADMIN_PASSWORD = 'admin1234'
const AUTH_STORAGE_KEY = 'academy-admin-authenticated'

export default function AdminPage() {
  const [activeKey, setActiveKey] = useState<AdminSectionKey | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [authenticated, setAuthenticated] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const storedAuthenticated = sessionStorage.getItem(AUTH_STORAGE_KEY)
    if (storedAuthenticated === 'true') {
      setAuthenticated(true)
      setAuthChecked(true)
      return
    }

    const password = window.prompt('관리자 비밀번호를 입력하세요.')
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem(AUTH_STORAGE_KEY, 'true')
      setAuthenticated(true)
    } else {
      window.alert('비밀번호가 틀렸거나 입력이 취소되었습니다. 관리자창에 접근할 수 없습니다.')
    }

    setAuthChecked(true)
  }, [])

  function refresh() {
    setRefreshKey((prev) => prev + 1)
  }

  const content = (() => {
    switch (activeKey) {
      case 'students':
        return (
          <div className="grid gap-6 lg:grid-cols-2">
            <StudentForm onCreated={refresh} />
            <StudentList refreshKey={refreshKey} />
          </div>
        )

      case 'classes':
        return <ClassGroupManager refreshKey={refreshKey} onChanged={refresh} />

      case 'records':
        return (
          <div className="grid gap-6">
            <AcademicRecordForm onCreated={refresh} />
            <RecordList refreshKey={refreshKey} />
          </div>
        )

      case 'tasks':
        return <AdminTaskList />

      case 'inquiries':
        return <ParentInquiryList />

      case 'notice':
        return <AdminNoticeCenter />

      default:
        return (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ADMIN_SECTIONS.map((item) => (
              <Card
                key={item.key}
                title={item.label}
                badge={'badge' in item ? item.badge : undefined}
                onClick={() => setActiveKey(item.key)}
              />
            ))}
          </div>
        )
    }
  })()

  if (!authChecked) {
    return (
      <DashboardShell
        title="관리자 대시보드"
        subtitle="학생, 반, 학업 데이터, 상담, 공지, 할 일을 관리합니다."
        activeKey={activeKey}
        items={ADMIN_SECTIONS as any}
        onChange={(key) => setActiveKey(key as AdminSectionKey)}
      >
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-700 shadow-sm">
          관리자 인증을 확인 중입니다...
        </div>
      </DashboardShell>
    )
  }

  if (!authenticated) {
    return (
      <DashboardShell
        title="관리자 대시보드"
        subtitle="학생, 반, 학업 데이터, 상담, 공지, 할 일을 관리합니다."
        activeKey={activeKey}
        items={ADMIN_SECTIONS as any}
        onChange={(key) => setActiveKey(key as AdminSectionKey)}
      >
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-700 shadow-sm">
          관리자 비밀번호가 필요합니다. 페이지를 새로고침하여 다시 시도하세요.
        </div>
      </DashboardShell>
    )
  }

  return (
    <DashboardShell
      title="관리자 대시보드"
      subtitle="학생, 반, 학업 데이터, 상담, 공지, 할 일을 관리합니다."
      activeKey={activeKey}
      items={ADMIN_SECTIONS as any}
      onChange={(key) => setActiveKey(key as AdminSectionKey)}
    >
      {content}
    </DashboardShell>
  )
}

function Card({
  title,
  badge,
  onClick,
}: {
  title: string
  badge?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm hover:bg-slate-50"
    >
      <div className="flex items-center gap-2">
        <p className="text-lg font-semibold text-slate-900">{title}</p>
        {badge && (
          <span className="rounded-full bg-black px-2 py-1 text-xs text-white">
            {badge}
          </span>
        )}
      </div>
    </button>
  )
}
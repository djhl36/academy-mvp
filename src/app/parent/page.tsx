'use client'

import { useEffect, useMemo, useState } from 'react'
import DashboardShell from '@/components/DashboardShell'
import ParentProfilePanel from '@/components/ParentProfilePanel'
import ParentInquiryForm from '@/components/ParentInquiryForm'
import ParentInquiryList from '@/components/ParentInquiryList'
import RecordList from '@/components/RecordList'
import { supabase } from '@/lib/supabase'
import { fetchNotices } from '@/lib/notice'
import { Student } from '@/lib/types'

const PARENT_SECTIONS = [
  { key: 'profile', label: '학생 프로필' },
  { key: 'notice', label: '공지사항', badge: 'NEW' },
  { key: 'record', label: '학업데이터' },
  { key: 'inquiry', label: '상담/문의' },
  { key: 'history', label: '상담내역' },
] as const

type ParentSectionKey = (typeof PARENT_SECTIONS)[number]['key']

type NoticeResult = {
  all?: any[]
  class?: any[]
  academy?: any[]
  individual?: any[]
}

export default function ParentPage() {
  const [activeKey, setActiveKey] = useState<ParentSectionKey | null>(null)
  const [student, setStudent] = useState<Student | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [studentCode, setStudentCode] = useState('')
  const [loginMessage, setLoginMessage] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('parent_student_code')
    if (saved) {
      setStudentCode(saved)
      handleLogin(saved)
    }
  }, [])

  async function handleLogin(customCode?: string) {
    const target = (customCode ?? studentCode).trim()
    setLoginMessage('')

    if (!target) {
      setLoginMessage('학생코드를 입력해주세요.')
      return
    }

    setLoginLoading(true)

    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('student_login_id', target)
      .maybeSingle()

    setLoginLoading(false)

    if (error || !data) {
      setStudent(null)
      setLoginMessage('일치하는 학생 정보가 없습니다.')
      return
    }

    setStudent(data as Student)
    localStorage.setItem('parent_student_code', target)
  }

  function handleLogout() {
    setStudent(null)
    setActiveKey(null)
    setStudentCode('')
    setLoginMessage('')
    localStorage.removeItem('parent_student_code')
  }

  function handleInquiryCreated() {
    setRefreshKey((prev) => prev + 1)
    setActiveKey('history')
  }

  const content = useMemo(() => {
    if (!student) {
      return (
        <div className="mx-auto max-w-md rounded-3xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-bold">학부모 로그인</h2>

          <input
            className="mb-3 w-full rounded-xl border px-4 py-3"
            placeholder="학생코드 입력"
            value={studentCode}
            onChange={(e) => setStudentCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleLogin()
            }}
          />

          <button
            type="button"
            onClick={() => handleLogin()}
            disabled={loginLoading}
            className="w-full rounded-xl bg-black py-3 text-white disabled:opacity-50"
          >
            {loginLoading ? '로그인 중...' : '로그인'}
          </button>

          <p className="mt-3 text-xs text-slate-500">
            관리자 페이지 학생 목록의 학생 ID로 로그인합니다.
          </p>

          {loginMessage && <p className="mt-2 text-sm text-red-500">{loginMessage}</p>}
        </div>
      )
    }

    if (!activeKey) {
      return (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button type="button" onClick={handleLogout} className="rounded-xl border px-3 py-2">
              로그아웃
            </button>
          </div>

          <Banner title="학생 프로필" onClick={() => setActiveKey('profile')}>
            <ParentProfilePanel student={student} compact />
          </Banner>

          <div className="grid gap-4 sm:grid-cols-2">
            <Banner title="공지사항" onClick={() => setActiveKey('notice')} />
            <Banner title="학업데이터" onClick={() => setActiveKey('record')} />
            <Banner title="상담/문의" onClick={() => setActiveKey('inquiry')} />
            <Banner title="상담내역" onClick={() => setActiveKey('history')} />
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <button type="button" onClick={handleLogout} className="rounded-xl border px-3 py-2">
            로그아웃
          </button>
        </div>

        {activeKey === 'profile' && <ParentProfilePanel student={student} />}
        {activeKey === 'notice' && <NoticeBoard studentId={student.id} />}
        {activeKey === 'record' && <RecordList refreshKey={refreshKey} studentId={student.id} />}
        {activeKey === 'inquiry' && <ParentInquiryForm student={student} onCreated={handleInquiryCreated} />}
        {activeKey === 'history' && <ParentInquiryList studentId={student.id} refreshKey={refreshKey} />}
      </div>
    )
  }, [activeKey, student, refreshKey, studentCode, loginMessage, loginLoading])

  return (
    <DashboardShell
      title="학부모 페이지"
      activeKey={student ? activeKey : null}
      items={PARENT_SECTIONS as any}
      onChange={setActiveKey}
    >
      {content}
    </DashboardShell>
  )
}

function Banner({ title, onClick, children }: any) {
  return (
    <button type="button" onClick={onClick} className="w-full rounded-2xl border bg-white p-5 text-left shadow-sm">
      <p className="font-bold">{title}</p>
      {children}
    </button>
  )
}

function NoticeBoard({ studentId }: { studentId: string }) {
  const [all, setAll] = useState<any[]>([])
  const [classNotices, setClassNotices] = useState<any[]>([])

  useEffect(() => {
    load()
  }, [studentId])

  async function load() {
    const res = (await fetchNotices(studentId)) as NoticeResult
    setAll(res.all ?? res.academy ?? [])
    setClassNotices(res.class ?? res.individual ?? [])
  }

  return (
    <div className="grid gap-4">
      <NoticeBox title="전체 공지" list={all} />
      <NoticeBox title="반별 공지" list={classNotices} />
    </div>
  )
}

function NoticeBox({ title, list }: any) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <p className="mb-2 font-semibold">{title}</p>
      {list.length === 0 && <p className="text-sm text-gray-400">없음</p>}
      {list.map((notice: any) => (
        <div key={notice.id} className="mb-2 rounded-xl border p-3">
          <p className="font-medium">{notice.title}</p>
          <p className="whitespace-pre-wrap text-sm text-gray-600">{notice.content}</p>
        </div>
      ))}
    </div>
  )
}

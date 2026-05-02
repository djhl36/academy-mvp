'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Student } from '@/lib/types'

type Props = {
  student: Student | null
  compact?: boolean
}

export default function ParentProfilePanel({ student, compact = false }: Props) {
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const [form, setForm] = useState({
    student_login_id: student?.student_login_id || '',
    school: student?.school || '',
    grade: student?.grade || '',
    student_phone: student?.student_phone || '',
    parent_name: student?.parent_name || '',
    parent_phone: student?.parent_phone || '',
    parent_email: student?.parent_email || '',
  })

  function handleChange(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    if (!student?.id) return

    setLoading(true)
    setMessage('')

    const { error } = await supabase
      .from('students')
      .update({
        student_login_id: form.student_login_id,
        school: form.school || null,
        grade: form.grade || '-',
        student_phone: form.student_phone || null,
        parent_name: form.parent_name || null,
        parent_phone: form.parent_phone || null,
        parent_email: form.parent_email || null,
      })
      .eq('id', student.id)

    setLoading(false)

    if (error) {
      setMessage(`저장 실패: ${error.message}`)
      return
    }

    setMessage('정보가 수정되었습니다.')
    setEditing(false)
    window.location.reload()
  }

  const title = student
    ? [student.school, student.grade, student.name].filter(Boolean).join(' / ')
    : '학생 정보 없음'

  if (compact) {
    return (
      <div className="w-full rounded-3xl border border-slate-900 bg-slate-900 p-5 text-left text-white shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">학생 프로필</p>
        <p className="mt-2 text-lg font-bold">{title}</p>
        <p className="mt-2 text-sm text-slate-300">
          {student ? `학생 ID: ${student.student_login_id || '-'}` : '로그인 후 표시됩니다.'}
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-500">학생 프로필</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">
            {student?.name ?? '학생 정보 없음'}
          </h2>
        </div>

        {!editing ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700"
          >
            정보수정
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700"
          >
            취소
          </button>
        )}
      </div>

      {!editing ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <InfoRow label="학생 ID" value={student?.student_login_id} />
          <InfoRow label="학교" value={student?.school} />
          <InfoRow label="학년" value={student?.grade} />
          <InfoRow label="학생 연락처" value={student?.student_phone} />
          <InfoRow label="학부모명" value={student?.parent_name} />
          <InfoRow label="학부모 연락처" value={student?.parent_phone} />
          <InfoRow label="학부모 이메일" value={student?.parent_email} />
        </div>
      ) : (
        <div className="mt-5 grid gap-4">
          <input
            className="rounded-xl border px-4 py-3"
            placeholder="학생 ID"
            value={form.student_login_id}
            onChange={(e) => handleChange('student_login_id', e.target.value)}
          />

          <input
            className="rounded-xl border px-4 py-3"
            placeholder="학교"
            value={form.school}
            onChange={(e) => handleChange('school', e.target.value)}
          />

          <input
            className="rounded-xl border px-4 py-3"
            placeholder="학년"
            value={form.grade}
            onChange={(e) => handleChange('grade', e.target.value)}
          />

          <input
            className="rounded-xl border px-4 py-3"
            placeholder="학생 연락처"
            value={form.student_phone}
            onChange={(e) => handleChange('student_phone', e.target.value)}
          />

          <input
            className="rounded-xl border px-4 py-3"
            placeholder="학부모명"
            value={form.parent_name}
            onChange={(e) => handleChange('parent_name', e.target.value)}
          />

          <input
            className="rounded-xl border px-4 py-3"
            placeholder="학부모 연락처"
            value={form.parent_phone}
            onChange={(e) => handleChange('parent_phone', e.target.value)}
          />

          <input
            className="rounded-xl border px-4 py-3"
            placeholder="학부모 이메일"
            value={form.parent_email}
            onChange={(e) => handleChange('parent_email', e.target.value)}
          />

          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="rounded-xl bg-black px-4 py-3 text-white disabled:opacity-50"
          >
            {loading ? '저장 중...' : '저장'}
          </button>

          {message && <p className="text-sm text-slate-600">{message}</p>}
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <p className="text-xs font-semibold text-slate-400">{label}</p>
      <p className="mt-1 text-sm text-slate-800">{value || '-'}</p>
    </div>
  )
}
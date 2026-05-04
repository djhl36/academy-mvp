'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { generateText } from '@/lib/gemini'

type Props = { onCreated: () => void }

type StudentItem = {
  id: string
  name: string
  grade: string | null
  school: string | null
}

type GroupRow = {
  id: string
  name: string
  class_group_students: {
    student_id: string
    students: StudentItem | StudentItem[] | null
  }[]
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

export default function AcademicRecordForm({ onCreated }: Props) {
  const [groups, setGroups] = useState<GroupRow[]>([])
  const [classGroupId, setClassGroupId] = useState('')
  const [recordDate, setRecordDate] = useState(today())
  const [progress, setProgress] = useState('')
  const [teacherNote, setTeacherNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchGroups()
  }, [])

  async function fetchGroups() {
    const { data } = await supabase
      .from('class_groups')
      .select(`
        id,
        name,
        class_group_students (
          student_id,
          students ( id, name, grade, school )
        )
      `)
      .order('name', { ascending: true })

    setGroups((data ?? []) as unknown as GroupRow[])
  }

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === classGroupId) ?? null,
    [groups, classGroupId]
  )

  const students = useMemo<StudentItem[]>(() => {
    if (!selectedGroup) return []

    return selectedGroup.class_group_students
      .map((item) => {
        if (Array.isArray(item.students)) return item.students[0] ?? null
        return item.students
      })
      .filter((student): student is StudentItem => Boolean(student))
  }, [selectedGroup])

  async function helpWrite() {
    if (!progress.trim()) {
      setMessage('먼저 진도 내용을 입력해주세요.')
      return
    }

    setAiLoading(true)
    setMessage('')

    try {
      const text = await generateText(`
다음 수업 기록을 학부모가 이해하기 쉬운 학업 데이터로 정리해라.
진도와 특이사항을 구분해서 짧게 작성해라.
JSON만 출력해라.

원문 진도:
${progress}

원문 특이사항:
${teacherNote || '없음'}

형식:
{
  "progress": "정리된 진도",
  "teacher_note": "정리된 특이사항"
}
`)
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim()
      const parsed = JSON.parse(cleaned)
      setProgress(parsed.progress || progress)
      setTeacherNote(parsed.teacher_note || teacherNote)
    } catch {
      setMessage('AI 정리 실패')
    } finally {
      setAiLoading(false)
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    if (!selectedGroup || !recordDate || !progress.trim()) {
      setMessage('반, 날짜, 진도 내용은 필수입니다.')
      setLoading(false)
      return
    }

    if (students.length === 0) {
      setMessage('이 반에 배정된 학생이 없습니다.')
      setLoading(false)
      return
    }

    const rows = students.map((student) => ({
      class_group_id: selectedGroup.id,
      student_id: student.id,
      record_date: recordDate,
      progress: progress.trim(),
      teacher_note: teacherNote.trim() || null,
    }))

    const { error } = await supabase
      .from('academic_records')
      .upsert(rows, { onConflict: 'class_group_id,student_id,record_date' })

    if (error) {
      setMessage(`저장 실패: ${error.message}`)
      setLoading(false)
      return
    }

    setProgress('')
    setTeacherNote('')
    setMessage('학업 데이터가 저장되었습니다.')
    setLoading(false)
    onCreated()
  }

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm lg:col-span-2">
      <h2 className="mb-4 text-xl font-semibold">학업 데이터 입력</h2>

      <form onSubmit={handleSubmit} className="grid gap-4">
        <select
          className="rounded-xl border px-4 py-3"
          value={classGroupId}
          onChange={(e) => setClassGroupId(e.target.value)}
          required
        >
          <option value="">반 선택</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>

        <input
          type="date"
          className="rounded-xl border px-4 py-3"
          value={recordDate}
          onChange={(e) => setRecordDate(e.target.value)}
          required
        />

        <textarea
          className="min-h-[120px] rounded-xl border px-4 py-3"
          placeholder="반 전체 진도"
          value={progress}
          onChange={(e) => setProgress(e.target.value)}
        />

        <textarea
          className="min-h-[100px] rounded-xl border px-4 py-3"
          placeholder="특이사항 / 학부모에게 공유할 메모"
          value={teacherNote}
          onChange={(e) => setTeacherNote(e.target.value)}
        />

        {selectedGroup && (
          <p className="text-sm text-slate-500">
            저장 대상: {students.map((s) => s.name).join(', ') || '학생 없음'}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={helpWrite}
            disabled={aiLoading}
            className="rounded-xl border px-4 py-3 disabled:opacity-50"
          >
            {aiLoading ? 'AI 정리 중...' : 'AI 학업데이터 정리'}
          </button>

          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-black px-4 py-3 text-white disabled:opacity-50"
          >
            {loading ? '저장 중...' : '학업 데이터 저장'}
          </button>
        </div>

        {message && <p className="text-sm text-slate-600">{message}</p>}
      </form>
    </div>
  )
}
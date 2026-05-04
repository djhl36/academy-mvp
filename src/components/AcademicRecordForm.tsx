'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { generateText } from '../lib/gemini'

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
  subject_id?: string
  class_group_students: {
    student_id: string
    students: StudentItem[] | StudentItem | null
  }[]
}

type Subject = {
  id: string
  name: string
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

export default function AcademicRecordForm({ onCreated }: Props) {
  const [groups, setGroups] = useState<GroupRow[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [classGroupId, setClassGroupId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [recordDate, setRecordDate] = useState(today())
  const [examType, setExamType] = useState('수업기록')
  const [progress, setProgress] = useState('')
  const [studentNotes, setStudentNotes] = useState<Record<string, string>>({})
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchBaseData()
  }, [])

  async function fetchBaseData() {
    const [{ data: groupData }, { data: subjectData }] = await Promise.all([
      supabase
        .from('class_groups')
        .select(`
          id,
          name,
          subject_id,
          class_group_students (
            student_id,
            students ( id, name, grade, school )
          )
        `)
        .order('name', { ascending: true }),

      supabase
        .from('subjects')
        .select('id, name')
        .order('name', { ascending: true }),
    ])

    setGroups((groupData as unknown as GroupRow[]) ?? [])
    setSubjects((subjectData as unknown as Subject[]) ?? [])
  }

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === classGroupId) ?? null,
    [groups, classGroupId]
  )

  const students = useMemo<StudentItem[]>(() => {
    return (
      selectedGroup?.class_group_students
        ?.map((item) => {
          const students = item.students
          return Array.isArray(students) ? students[0] : students
        })
        .filter((student): student is StudentItem => Boolean(student)) ?? []
    )
  }, [selectedGroup])

  function handleGroupChange(value: string) {
    setClassGroupId(value)
    setSubjectId((prev) => prev || subjects[0]?.id || '')
    setSelectedStudentIds([])
    setStudentNotes({})
  }

  function toggleStudent(studentId: string) {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    )
  }

  function updateStudentNote(studentId: string, value: string) {
    setStudentNotes((prev) => ({
      ...prev,
      [studentId]: value,
    }))
  }

  async function helpWrite() {
    if (!progress.trim()) {
      setMessage('먼저 공통 진도 내용을 입력해주세요.')
      return
    }

    setAiLoading(true)
    setMessage('')

    try {
      const noteText = students
        .map((student) => `${student.name}: ${studentNotes[student.id] || '없음'}`)
        .join('\n')

      const text = await generateText(`
다음 학업 데이터를 학부모가 이해하기 쉽게 정리해라.
공통 진도와 학생별 메모를 JSON으로만 출력해라.

공통 진도:
${progress}

학생별 메모:
${noteText}

형식:
{
  "progress": "정리된 공통 진도",
  "student_notes": {
    "학생이름": "정리된 개별 메모"
  }
}
`)
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim()
      const parsed = JSON.parse(cleaned)

      setProgress(parsed.progress || progress)

      if (parsed.student_notes) {
        const nextNotes: Record<string, string> = {}

        students.forEach((student) => {
          nextNotes[student.id] =
            parsed.student_notes[student.name] ||
            studentNotes[student.id] ||
            ''
        })

        setStudentNotes(nextNotes)
      }
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

    if (!selectedGroup || !subjectId || !recordDate || !examType.trim() || !progress.trim()) {
      setMessage('반, 과목, 날짜, 기록 유형, 공통 진도는 필수입니다.')
      setLoading(false)
      return
    }

    const targetStudents =
      selectedStudentIds.length > 0
        ? students.filter((student) => selectedStudentIds.includes(student.id))
        : students

    if (targetStudents.length === 0) {
      setMessage('저장할 학생이 없습니다.')
      setLoading(false)
      return
    }

    const rows = targetStudents.map((student) => ({
      class_group_id: selectedGroup.id,
      subject_id: subjectId,
      student_id: student.id,
      record_date: recordDate,
      exam_type: examType.trim(),
      progress: progress.trim(),
      teacher_note: studentNotes[student.id]?.trim() || null,
      score: null,
    }))

    const { error } = await supabase.from('academic_records').insert(rows)

    if (error) {
      setMessage(`저장 실패: ${error.message}`)
      setLoading(false)
      return
    }

    setProgress('')
    setStudentNotes({})
    setSelectedStudentIds([])
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
          onChange={(e) => handleGroupChange(e.target.value)}
          required
        >
          <option value="">반 선택</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>

        <select
          className="rounded-xl border px-4 py-3"
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          required
        >
          <option value="">과목 선택</option>
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.name}
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

        <input
          className="rounded-xl border px-4 py-3"
          placeholder="기록 유형 예: 수업기록, 테스트, 숙제점검"
          value={examType}
          onChange={(e) => setExamType(e.target.value)}
          required
        />

        <textarea
          className="min-h-[120px] rounded-xl border px-4 py-3"
          placeholder="반 공통 진도 / 공통 전달 내용"
          value={progress}
          onChange={(e) => setProgress(e.target.value)}
          required
        />

        {selectedGroup && (
          <div className="rounded-2xl border p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="font-semibold">개별 학생 메모</p>
              <p className="text-xs text-slate-500">
                선택하지 않으면 전체 학생에게 저장됩니다.
              </p>
            </div>

            {students.length === 0 && (
              <p className="text-sm text-slate-500">이 반에 배정된 학생이 없습니다.</p>
            )}

            <div className="grid gap-3">
              {students.map((student) => {
                const checked = selectedStudentIds.includes(student.id)

                return (
                  <div key={student.id} className="rounded-xl border bg-slate-50 p-3">
                    <label className="mb-2 flex items-center gap-2 text-sm font-medium">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleStudent(student.id)}
                      />
                      {student.name}
                      <span className="text-xs text-slate-400">
                        {student.school || '-'} / {student.grade || '-'}
                      </span>
                    </label>

                    <textarea
                      className="min-h-[80px] w-full rounded-xl border bg-white px-3 py-2 text-sm"
                      placeholder={`${student.name} 개별 메모`}
                      value={studentNotes[student.id] || ''}
                      onChange={(e) => updateStudentNote(student.id, e.target.value)}
                    />
                  </div>
                )
              })}
            </div>
          </div>
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
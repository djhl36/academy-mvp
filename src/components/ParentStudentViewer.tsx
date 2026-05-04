'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

type StudentProfile = {
  id: string
  student_code: string | null
  name: string
  grade: string | null
  school: string | null
  parent_name: string | null
  notes: string | null
  student_subjects?: {
    subjects: {
      name: string
    }[]
  }[]
  class_group_students?: {
    class_groups: {
      name: string
    }[]
  }[]
}

type RecordRow = {
  id: string
  record_date: string
  exam_type: string | null
  score: number | null
  progress: string | null
  teacher_note: string | null
  subjects: {
    name: string
  }[]
  class_groups: {
    name: string
  }[]
}

type Props = {
  onIdentified: (student: { name: string; parentName: string }) => void
}

export default function ParentStudentViewer({ onIdentified }: Props) {
  const [studentCode, setStudentCode] = useState('')
  const [student, setStudent] = useState<StudentProfile | null>(null)
  const [records, setRecords] = useState<RecordRow[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function handleSearch() {
    if (!studentCode.trim()) {
      setMessage('학생 아이디를 입력해주세요.')
      return
    }

    setLoading(true)
    setMessage('')
    setStudent(null)
    setRecords([])

    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select(`
        id,
        student_code,
        name,
        grade,
        school,
        parent_name,
        notes,
        student_subjects (
          subjects (
            name
          )
        ),
        class_group_students (
          class_groups (
            name
          )
        )
      `)
      .eq('student_code', studentCode.trim())
      .single()

    if (studentError || !studentData) {
      setMessage('학생을 찾지 못했습니다.')
      setLoading(false)
      return
    }

    const { data: recordData, error: recordError } = await supabase
      .from('academic_records')
      .select(`
        id,
        record_date,
        exam_type,
        score,
        progress,
        teacher_note,
        subjects (
          name
        ),
        class_groups (
          name
        )
      `)
      .eq('student_id', studentData.id)
      .order('record_date', { ascending: false })

    if (recordError) {
      setMessage(`학업 데이터를 불러오지 못했습니다: ${recordError.message}`)
      setLoading(false)
      return
    }

    setStudent(studentData as StudentProfile)
    setRecords((recordData as RecordRow[]) ?? [])
    onIdentified({
      name: studentData.name,
      parentName: studentData.parent_name ?? '',
    })
    setLoading(false)
  }

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-xl font-semibold">학생 정보 조회</h2>

      <div className="grid gap-4">
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-xl border px-4 py-3"
            placeholder="학생 아이디 입력"
            value={studentCode}
            onChange={(e) => setStudentCode(e.target.value)}
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={loading}
            className="rounded-xl bg-black px-4 py-3 text-white disabled:opacity-50"
          >
            {loading ? '조회 중...' : '조회'}
          </button>
        </div>

        {message && <p className="text-sm text-slate-600">{message}</p>}

        {student && (
          <div className="rounded-xl border p-4">
            <h3 className="mb-3 text-lg font-semibold">{student.name}</h3>

            <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
              <p>
                <span className="font-medium">학생 아이디:</span> {student.student_code || '-'}
              </p>
              <p>
                <span className="font-medium">학교:</span> {student.school || '-'}
              </p>
              <p>
                <span className="font-medium">학년:</span> {student.grade || '-'}
              </p>
              <p>
                <span className="font-medium">학부모명:</span> {student.parent_name || '-'}
              </p>
            </div>

            <div className="mt-4">
              <p className="mb-1 text-sm font-medium">수강 과목</p>
              <p className="text-sm text-slate-600">
                {student.student_subjects?.map((item) => item.subjects?.map(s => s.name)).flat().filter(Boolean).join(', ') || '-'}
              </p>
            </div>

            <div className="mt-4">
              <p className="mb-1 text-sm font-medium">수업반</p>
              <p className="text-sm text-slate-600">
                {student.class_group_students?.map((item) => item.class_groups?.map(c => c.name)).flat().filter(Boolean).join(', ') || '-'}
              </p>
            </div>

            <div className="mt-4">
              <p className="mb-1 text-sm font-medium">학생 메모</p>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{student.notes || '-'}</p>
            </div>
          </div>
        )}

        {student && (
          <div className="rounded-xl border p-4">
            <h3 className="mb-3 text-lg font-semibold">학업 데이터</h3>

            {records.length === 0 ? (
              <p className="text-sm text-slate-500">등록된 학업 데이터가 없습니다.</p>
            ) : (
              <div className="space-y-3">
                {records.map((record) => (
                  <div key={record.id} className="rounded-xl border p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="font-medium">
                        {record.subjects?.[0]?.name || '과목 없음'} / {record.class_groups?.[0]?.name || '수업반 없음'}
                      </p>
                      <span className="text-xs text-slate-400">{record.record_date}</span>
                    </div>

                    <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                      <p>
                        <span className="font-medium">유형:</span> {record.exam_type || '-'}
                      </p>
                      <p>
                        <span className="font-medium">점수:</span> {record.score ?? '-'}
                      </p>
                      <p className="md:col-span-2">
                        <span className="font-medium">진도:</span> {record.progress || '-'}
                      </p>
                      <p className="md:col-span-2 whitespace-pre-wrap">
                        <span className="font-medium">특이사항:</span> {record.teacher_note || '-'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Student, Subject } from '@/lib/types'

type StudentRow = Student & {
  student_subjects?: {
    id?: string
    subject_id: string
    subjects: Subject | null
  }[]
}

type Props = {
  refreshKey: number
}

const SUBJECT_OPTIONS = ['국어', '영어', '수학', '사회', '과학', '기타']

export default function StudentList({ refreshKey }: Props) {
  const [students, setStudents] = useState<StudentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const [form, setForm] = useState({
    student_login_id: '',
    name: '',
    grade: '',
    school: '',
    student_phone: '',
    parent_name: '',
    parent_phone: '',
    parent_email: '',
    notes: '',
  })
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])

  useEffect(() => {
    fetchStudents()
  }, [refreshKey])

  async function fetchStudents() {
    setLoading(true)
    setError('')

    const { data, error } = await supabase
      .from('students')
      .select(`
        *,
        student_subjects (
          id,
          subject_id,
          subjects (*)
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      setError('학생 목록을 불러오지 못했습니다.')
      setStudents([])
      setLoading(false)
      return
    }

    setStudents((data as StudentRow[]) ?? [])
    setLoading(false)
  }

  function startEdit(student: StudentRow) {
    setEditId(student.id)
    setForm({
      student_login_id: student.student_login_id || '',
      name: student.name || '',
      grade: student.grade || '',
      school: student.school || '',
      student_phone: student.student_phone || '',
      parent_name: student.parent_name || '',
      parent_phone: student.parent_phone || '',
      parent_email: student.parent_email || '',
      notes: student.notes || '',
    })
    setSelectedSubjects(
      student.student_subjects
        ?.map((item) => item.subjects?.name)
        .filter(Boolean) as string[] || []
    )
    setError('')
  }

  function cancelEdit() {
    setEditId(null)
    setSelectedSubjects([])
    setForm({
      student_login_id: '',
      name: '',
      grade: '',
      school: '',
      student_phone: '',
      parent_name: '',
      parent_phone: '',
      parent_email: '',
      notes: '',
    })
  }

  function toggleSubject(subjectName: string) {
    setSelectedSubjects((prev) =>
      prev.includes(subjectName)
        ? prev.filter((item) => item !== subjectName)
        : [...prev, subjectName]
    )
  }

  async function ensureSubjectsExist() {
    const { data } = await supabase.from('subjects').select('id, name')
    const existing = new Set((data ?? []).map((item: any) => item.name))
    const missing = SUBJECT_OPTIONS.filter((name) => !existing.has(name))

    if (missing.length > 0) {
      await supabase.from('subjects').insert(missing.map((name) => ({ name })))
    }
  }

  async function saveStudent(studentId: string) {
    if (!form.name.trim()) {
      setError('학생 이름은 필수입니다.')
      return
    }

    setSaving(true)
    setError('')

    const { error: updateError } = await supabase
      .from('students')
      .update({
        student_login_id: form.student_login_id.trim() || null,
        name: form.name.trim(),
        grade: form.grade.trim() || '-',
        school: form.school.trim() || null,
        student_phone: form.student_phone.trim() || null,
        parent_name: form.parent_name.trim() || null,
        parent_phone: form.parent_phone.trim() || null,
        parent_email: form.parent_email.trim() || null,
        notes: form.notes.trim() || null,
      })
      .eq('id', studentId)

    if (updateError) {
      setSaving(false)
      setError(`학생 정보 수정 실패: ${updateError.message}`)
      return
    }

    await ensureSubjectsExist()

    const { data: subjectData } = await supabase
      .from('subjects')
      .select('id, name')

    const subjectMap = new Map((subjectData ?? []).map((item: any) => [item.name, item.id]))

    const { error: deleteSubjectError } = await supabase
      .from('student_subjects')
      .delete()
      .eq('student_id', studentId)

    if (deleteSubjectError) {
      setSaving(false)
      setError(`과목 수정 실패: ${deleteSubjectError.message}`)
      return
    }

    const rows = selectedSubjects
      .map((name) => {
        const subjectId = subjectMap.get(name)
        if (!subjectId) return null
        return {
          student_id: studentId,
          subject_id: subjectId,
        }
      })
      .filter(Boolean)

    if (rows.length > 0) {
      const { error: insertSubjectError } = await supabase
        .from('student_subjects')
        .insert(rows as { student_id: string; subject_id: string }[])

      if (insertSubjectError) {
        setSaving(false)
        setError(`과목 수정 실패: ${insertSubjectError.message}`)
        return
      }
    }

    setSaving(false)
    cancelEdit()
    fetchStudents()
  }

  async function deleteStudent(studentId: string) {
    if (confirmDeleteId !== studentId) {
      setConfirmDeleteId(studentId)
      return
    }

    setDeletingId(studentId)
    setError('')

    await supabase.from('class_group_students').delete().eq('student_id', studentId)
    await supabase.from('student_subjects').delete().eq('student_id', studentId)
    await supabase.from('academic_records').delete().eq('student_id', studentId)
    await supabase.from('teacher_tasks').delete().eq('student_id', studentId)
    await supabase.from('parent_inquiries').delete().eq('student_id', studentId)

    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', studentId)

    setDeletingId(null)
    setConfirmDeleteId(null)

    if (error) {
      setError(`학생 삭제 실패: ${error.message}`)
      return
    }

    if (editId === studentId) {
      cancelEdit()
    }

    fetchStudents()
  }

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">학생 목록</h2>
        <button
          onClick={fetchStudents}
          className="rounded-lg border px-3 py-2 text-sm hover:bg-slate-50"
        >
          새로고침
        </button>
      </div>

      {loading && <p className="text-sm text-slate-500">불러오는 중...</p>}
      {!loading && error && <p className="text-sm text-red-500">{error}</p>}
      {!loading && !error && students.length === 0 && (
        <p className="text-sm text-slate-500">등록된 학생이 없습니다.</p>
      )}

      {!loading && !error && students.length > 0 && (
        <div className="space-y-4">
          {students.map((student) => {
            const subjects =
              student.student_subjects?.map((item) => item.subjects?.name).filter(Boolean) ?? []

            const isEditing = editId === student.id
            const isDeleting = deletingId === student.id
            const isConfirmingDelete = confirmDeleteId === student.id

            return (
              <div key={student.id} className="rounded-xl border border-slate-200 p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {isEditing ? form.name || '이름 없음' : student.name}
                    </h3>
                    <p className="mt-1 text-xs text-slate-400">
                      {student.created_at
                        ? new Date(student.created_at).toLocaleDateString('ko-KR')
                        : '-'}
                    </p>
                  </div>

                  {!isEditing ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(student)}
                        className="rounded-lg border px-3 py-2 text-sm"
                      >
                        수정
                      </button>

                      {!isConfirmingDelete ? (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(student.id)}
                          className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600"
                        >
                          삭제
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => deleteStudent(student.id)}
                            disabled={isDeleting}
                            className="rounded-lg bg-red-600 px-3 py-2 text-sm text-white disabled:opacity-50"
                          >
                            {isDeleting ? '삭제 중...' : '정말 삭제'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="rounded-lg border px-3 py-2 text-sm"
                          >
                            취소
                          </button>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => saveStudent(student.id)}
                        disabled={saving}
                        className="rounded-lg bg-black px-3 py-2 text-sm text-white disabled:opacity-50"
                      >
                        {saving ? '저장 중...' : '저장'}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="rounded-lg border px-3 py-2 text-sm"
                      >
                        취소
                      </button>
                    </div>
                  )}
                </div>

                {!isEditing ? (
                  <>
                    <div className="mb-3 rounded-xl bg-slate-50 p-3">
                      <p className="mb-1 text-sm font-medium text-slate-800">학생 ID</p>
                      <p className="text-sm text-slate-700">{student.student_login_id || '-'}</p>
                    </div>

                    <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                      <p><span className="font-medium">학년:</span> {student.grade || '-'}</p>
                      <p><span className="font-medium">학교:</span> {student.school || '-'}</p>
                      <p><span className="font-medium">학생 연락처:</span> {student.student_phone || '-'}</p>
                      <p><span className="font-medium">학부모명:</span> {student.parent_name || '-'}</p>
                      <p><span className="font-medium">학부모 연락처:</span> {student.parent_phone || '-'}</p>
                      <p><span className="font-medium">학부모 이메일:</span> {student.parent_email || '-'}</p>
                    </div>

                    <div className="mt-3">
                      <p className="mb-1 text-sm font-medium text-slate-800">수강 과목</p>
                      {subjects.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {subjects.map((subjectName) => (
                            <span
                              key={subjectName}
                              className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700"
                            >
                              {subjectName}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500">과목 없음</p>
                      )}
                    </div>

                    <div className="mt-3">
                      <p className="mb-1 text-sm font-medium text-slate-800">메모</p>
                      <p className="text-sm text-slate-600 whitespace-pre-wrap">{student.notes || '-'}</p>
                    </div>
                  </>
                ) : (
                  <div className="grid gap-3">
                    <input
                      className="rounded-xl border px-4 py-3"
                      placeholder="학생 ID"
                      value={form.student_login_id}
                      onChange={(e) => setForm((prev) => ({ ...prev, student_login_id: e.target.value }))}
                    />
                    <input
                      className="rounded-xl border px-4 py-3"
                      placeholder="학생 이름"
                      value={form.name}
                      onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    />
                    <input
                      className="rounded-xl border px-4 py-3"
                      placeholder="학년"
                      value={form.grade}
                      onChange={(e) => setForm((prev) => ({ ...prev, grade: e.target.value }))}
                    />
                    <input
                      className="rounded-xl border px-4 py-3"
                      placeholder="학교"
                      value={form.school}
                      onChange={(e) => setForm((prev) => ({ ...prev, school: e.target.value }))}
                    />
                    <input
                      className="rounded-xl border px-4 py-3"
                      placeholder="학생 연락처"
                      value={form.student_phone}
                      onChange={(e) => setForm((prev) => ({ ...prev, student_phone: e.target.value }))}
                    />
                    <input
                      className="rounded-xl border px-4 py-3"
                      placeholder="학부모명"
                      value={form.parent_name}
                      onChange={(e) => setForm((prev) => ({ ...prev, parent_name: e.target.value }))}
                    />
                    <input
                      className="rounded-xl border px-4 py-3"
                      placeholder="학부모 연락처"
                      value={form.parent_phone}
                      onChange={(e) => setForm((prev) => ({ ...prev, parent_phone: e.target.value }))}
                    />
                    <input
                      className="rounded-xl border px-4 py-3"
                      placeholder="학부모 이메일"
                      value={form.parent_email}
                      onChange={(e) => setForm((prev) => ({ ...prev, parent_email: e.target.value }))}
                    />
                    <textarea
                      className="min-h-[100px] rounded-xl border px-4 py-3"
                      placeholder="메모"
                      value={form.notes}
                      onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                    />

                    <div>
                      <p className="mb-2 text-sm font-medium text-slate-800">수강 과목</p>
                      <div className="flex flex-wrap gap-2">
                        {SUBJECT_OPTIONS.map((subjectName) => {
                          const active = selectedSubjects.includes(subjectName)
                          return (
                            <button
                              key={subjectName}
                              type="button"
                              onClick={() => toggleSubject(subjectName)}
                              className={`rounded-full border px-4 py-2 text-sm ${
                                active ? 'bg-black text-white' : 'bg-white text-black'
                              }`}
                            >
                              {subjectName}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
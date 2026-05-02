'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Student = {
  id: string
  name: string
  school: string | null
  grade: string | null
}

type ClassGroup = {
  id: string
  name: string
}

type AssignedRow = {
  student_id: string
}

export default function ClassGroupAssignment({ onChanged }: { onChanged?: () => void }) {
  const [students, setStudents] = useState<Student[]>([])
  const [groups, setGroups] = useState<ClassGroup[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [schoolFilter, setSchoolFilter] = useState('전체')
  const [gradeFilter, setGradeFilter] = useState('전체')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchBaseData()
  }, [])

  useEffect(() => {
    if (!selectedGroupId) {
      setSelectedStudentIds([])
      return
    }
    fetchAssignedStudents(selectedGroupId)
  }, [selectedGroupId])

  async function fetchBaseData() {
    const [{ data: studentData }, { data: groupData }] = await Promise.all([
      supabase.from('students').select('id, name, school, grade').order('name', { ascending: true }),
      supabase.from('class_groups').select('id, name').order('name', { ascending: true }),
    ])

    setStudents((studentData as Student[]) ?? [])
    setGroups((groupData as ClassGroup[]) ?? [])
  }

  async function fetchAssignedStudents(groupId: string) {
    const { data } = await supabase
      .from('class_group_students')
      .select('student_id')
      .eq('class_group_id', groupId)

    setSelectedStudentIds(((data as AssignedRow[]) ?? []).map((item) => item.student_id))
  }

  function toggleStudent(studentId: string) {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    )
  }

  const schoolOptions = useMemo(() => {
    return ['전체', ...Array.from(new Set(students.map((s) => s.school).filter(Boolean) as string[]))]
  }, [students])

  const gradeOptions = useMemo(() => {
    return ['전체', ...Array.from(new Set(students.map((s) => s.grade).filter(Boolean) as string[]))]
  }, [students])

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const schoolOk = schoolFilter === '전체' || student.school === schoolFilter
      const gradeOk = gradeFilter === '전체' || student.grade === gradeFilter
      return schoolOk && gradeOk
    })
  }, [students, schoolFilter, gradeFilter])

  const visibleIds = filteredStudents.map((student) => student.id)
  const visibleSelectedCount = visibleIds.filter((id) => selectedStudentIds.includes(id)).length
  const allVisibleSelected = visibleIds.length > 0 && visibleSelectedCount === visibleIds.length

  function toggleAllVisible() {
    if (allVisibleSelected) {
      setSelectedStudentIds((prev) => prev.filter((id) => !visibleIds.includes(id)))
      return
    }

    setSelectedStudentIds((prev) => Array.from(new Set([...prev, ...visibleIds])))
  }

  async function saveAssignments() {
    if (!selectedGroupId) {
      setMessage('수업반을 선택해주세요.')
      return
    }

    setLoading(true)
    setMessage('')

    const { error: deleteError } = await supabase
      .from('class_group_students')
      .delete()
      .eq('class_group_id', selectedGroupId)

    if (deleteError) {
      setMessage(`배정 저장 실패: ${deleteError.message}`)
      setLoading(false)
      return
    }

    if (selectedStudentIds.length > 0) {
      const rows = selectedStudentIds.map((studentId) => ({
        class_group_id: selectedGroupId,
        student_id: studentId,
      }))

      const { error: insertError } = await supabase
        .from('class_group_students')
        .insert(rows)

      if (insertError) {
        setMessage(`배정 저장 실패: ${insertError.message}`)
        setLoading(false)
        return
      }
    }

    setMessage('학생 배정이 저장되었습니다.')
    setLoading(false)
    onChanged?.()
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">학생 ↔ 수업반 배정</h2>
        <button
          type="button"
          onClick={saveAssignments}
          disabled={loading || !selectedGroupId}
          className="rounded-xl bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {loading ? '저장 중...' : '배정 저장'}
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="space-y-3">
          <select
            className="w-full rounded-xl border px-4 py-3"
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
          >
            <option value="">수업반 선택</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>

          {message && <p className="text-sm text-slate-600">{message}</p>}
        </div>

        <div className="rounded-xl border border-slate-200 p-4">
          <div className="mb-4 flex flex-wrap gap-2">
            <select
              className="rounded-xl border px-3 py-2 text-sm"
              value={schoolFilter}
              onChange={(e) => setSchoolFilter(e.target.value)}
            >
              {schoolOptions.map((item) => (
                <option key={item} value={item}>
                  학교: {item}
                </option>
              ))}
            </select>

            <select
              className="rounded-xl border px-3 py-2 text-sm"
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
            >
              {gradeOptions.map((item) => (
                <option key={item} value={item}>
                  학년: {item}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={toggleAllVisible}
              className="rounded-xl border px-3 py-2 text-sm"
            >
              {allVisibleSelected ? '보이는 학생 전체 해제' : '보이는 학생 전체 선택'}
            </button>
          </div>

          {!selectedGroupId ? (
            <p className="text-sm text-slate-500">먼저 수업반을 선택해주세요.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-left">
                    <th className="px-3 py-3">선택</th>
                    <th className="px-3 py-3">학교</th>
                    <th className="px-3 py-3">학년</th>
                    <th className="px-3 py-3">이름</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="border-b">
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selectedStudentIds.includes(student.id)}
                          onChange={() => toggleStudent(student.id)}
                        />
                      </td>
                      <td className="px-3 py-3">{student.school || '-'}</td>
                      <td className="px-3 py-3">{student.grade || '-'}</td>
                      <td className="px-3 py-3">{student.name}</td>
                    </tr>
                  ))}

                  {filteredStudents.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center text-slate-500">
                        학생이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
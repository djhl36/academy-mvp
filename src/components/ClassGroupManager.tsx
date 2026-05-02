'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Student } from '@/lib/types'

type Props = {
  refreshKey: number
  onChanged: () => void
}

type GroupRow = {
  id: string
  name: string
}

export default function ClassGroupManager({ refreshKey, onChanged }: Props) {
  const [groups, setGroups] = useState<GroupRow[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [groupName, setGroupName] = useState('')
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchBaseData()
  }, [refreshKey])

  useEffect(() => {
    if (!selectedGroupId) {
      setSelectedStudentIds([])
      return
    }
    loadMembers(selectedGroupId)
  }, [selectedGroupId])

  async function fetchBaseData() {
    const [{ data: groupData }, { data: studentData }] = await Promise.all([
      supabase.from('class_groups').select('id, name').order('created_at', { ascending: false }),
      supabase.from('students').select('*').order('name', { ascending: true }),
    ])

    setGroups((groupData as GroupRow[]) ?? [])
    setStudents((studentData as Student[]) ?? [])
  }

  async function loadMembers(groupId: string) {
    const { data } = await supabase
      .from('class_group_students')
      .select('student_id')
      .eq('class_group_id', groupId)

    setSelectedStudentIds((data ?? []).map((item: any) => item.student_id))
  }

  function reset() {
    setSelectedGroupId('')
    setGroupName('')
    setSelectedStudentIds([])
    setMessage('')
  }

  async function saveGroup() {
    if (!groupName.trim()) {
      setMessage('반 이름을 입력해주세요.')
      return
    }

    setLoading(true)
    setMessage('')

    if (selectedGroupId) {
      const { error } = await supabase
        .from('class_groups')
        .update({ name: groupName.trim() })
        .eq('id', selectedGroupId)

      if (error) {
        setMessage(`반 수정 실패: ${error.message}`)
        setLoading(false)
        return
      }
    } else {
      const { data, error } = await supabase
        .from('class_groups')
        .insert({ name: groupName.trim() })
        .select('id')
        .single()

      if (error || !data) {
        setMessage(`반 생성 실패: ${error?.message ?? '오류'}`)
        setLoading(false)
        return
      }

      setSelectedGroupId(data.id)
    }

    await fetchBaseData()
    setMessage('반 정보가 저장되었습니다.')
    onChanged()
    setLoading(false)
  }

  async function saveMembers() {
    if (!selectedGroupId) {
      setMessage('먼저 반을 선택해주세요.')
      return
    }

    setLoading(true)
    setMessage('')

    const { error: deleteError } = await supabase
      .from('class_group_students')
      .delete()
      .eq('class_group_id', selectedGroupId)

    if (deleteError) {
      setMessage(`학생 배정 실패: ${deleteError.message}`)
      setLoading(false)
      return
    }

    if (selectedStudentIds.length > 0) {
      const rows = selectedStudentIds.map((studentId) => ({
        class_group_id: selectedGroupId,
        student_id: studentId,
      }))

      const { error: insertError } = await supabase.from('class_group_students').insert(rows)

      if (insertError) {
        setMessage(`학생 배정 실패: ${insertError.message}`)
        setLoading(false)
        return
      }
    }

    setMessage('학생 배정이 저장되었습니다.')
    await fetchBaseData()
    onChanged()
    setLoading(false)
  }

  function selectGroup(group: GroupRow) {
    setSelectedGroupId(group.id)
    setGroupName(group.name)
    setMessage('')
  }

  function toggleStudent(id: string) {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId) ?? null,
    [groups, selectedGroupId]
  )

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm lg:col-span-2">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">반 등록 / 학생 배정</h2>
        <button type="button" onClick={reset} className="rounded-lg border px-3 py-2 text-sm">새 반</button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="space-y-4">
          <div className="grid gap-3 rounded-xl border p-4">
            <input className="rounded-xl border px-4 py-3" placeholder="반 이름" value={groupName} onChange={(e) => setGroupName(e.target.value)} />
            <button type="button" onClick={saveGroup} disabled={loading} className="rounded-xl bg-black px-4 py-3 text-white disabled:opacity-50">
              {loading ? '저장 중...' : selectedGroupId ? '반 수정' : '반 생성'}
            </button>
            {message && <p className="text-sm text-slate-600">{message}</p>}
          </div>

          <div className="rounded-xl border p-4">
            <p className="mb-3 font-medium">등록된 반</p>
            <div className="space-y-2">
              {groups.map((group) => (
                <button key={group.id} type="button" onClick={() => selectGroup(group)} className={`w-full rounded-xl border px-4 py-3 text-left text-sm ${selectedGroupId === group.id ? 'border-black bg-slate-100' : 'border-slate-200'}`}>
                  {group.name}
                </button>
              ))}
              {groups.length === 0 && <p className="text-sm text-slate-500">등록된 반이 없습니다.</p>}
            </div>
          </div>
        </div>

        <div className="rounded-xl border p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="font-medium">{selectedGroup ? `${selectedGroup.name} 학생 배정` : '반을 선택하세요'}</p>
            <button type="button" onClick={saveMembers} disabled={loading || !selectedGroupId} className="rounded-xl bg-black px-3 py-2 text-sm text-white disabled:opacity-50">
              배정 저장
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-left">
                  <th className="px-3 py-3">선택</th>
                  <th className="px-3 py-3">이름</th>
                  <th className="px-3 py-3">학교</th>
                  <th className="px-3 py-3">학년</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id} className="border-b">
                    <td className="px-3 py-3"><input type="checkbox" checked={selectedStudentIds.includes(student.id)} onChange={() => toggleStudent(student.id)} disabled={!selectedGroupId} /></td>
                    <td className="px-3 py-3">{student.name}</td>
                    <td className="px-3 py-3">{student.school || '-'}</td>
                    <td className="px-3 py-3">{student.grade || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

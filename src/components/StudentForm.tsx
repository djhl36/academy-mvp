'use client'

import { FormEvent, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Props = {
  onCreated: () => void
}

type ClassGroup = {
  id: string
  name: string
}

function makeStudentLoginId(name: string, parentPhone: string) {
  const digits = parentPhone.replace(/\D/g, '')
  return `${name.trim()}${digits.slice(-4)}`
}

export default function StudentForm({ onCreated }: Props) {
  const [name, setName] = useState('')
  const [grade, setGrade] = useState('')
  const [school, setSchool] = useState('')
  const [studentPhone, setStudentPhone] = useState('')
  const [parentName, setParentName] = useState('')
  const [parentPhone, setParentPhone] = useState('')
  const [parentEmail, setParentEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [groups, setGroups] = useState<ClassGroup[]>([])
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchGroups()
  }, [])

  async function fetchGroups() {
    const { data } = await supabase
      .from('class_groups')
      .select('id, name')
      .order('name', { ascending: true })

    setGroups((data as ClassGroup[]) ?? [])
  }

  function toggleGroup(id: string) {
    setSelectedGroupIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    if (!name.trim() || !grade.trim() || !parentPhone.trim()) {
      setMessage('학생 이름, 학년, 학부모 연락처는 필수입니다.')
      setLoading(false)
      return
    }

    const studentLoginId = makeStudentLoginId(name, parentPhone)

    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .insert({
        student_login_id: studentLoginId,
        name: name.trim(),
        grade: grade.trim(),
        school: school.trim() || null,
        student_phone: studentPhone.trim() || null,
        parent_name: parentName.trim() || null,
        parent_phone: parentPhone.trim() || null,
        parent_email: parentEmail.trim() || null,
        notes: notes.trim() || null,
      })
      .select('id, student_login_id')
      .single()

    if (studentError || !studentData) {
      setMessage(`학생 등록 실패: ${studentError?.message ?? '오류'}`)
      setLoading(false)
      return
    }

    if (selectedGroupIds.length > 0) {
      const rows = selectedGroupIds.map((classGroupId) => ({
        student_id: studentData.id,
        class_group_id: classGroupId,
      }))

      const { error: groupError } = await supabase
        .from('class_group_students')
        .insert(rows)

      if (groupError) {
        setMessage(`학생은 등록됐지만 반 배정 실패: ${groupError.message}`)
        setLoading(false)
        onCreated()
        return
      }
    }

    setName('')
    setGrade('')
    setSchool('')
    setStudentPhone('')
    setParentName('')
    setParentPhone('')
    setParentEmail('')
    setNotes('')
    setSelectedGroupIds([])
    setMessage(`학생 등록 완료. 학생 ID: ${studentData.student_login_id}`)
    setLoading(false)
    onCreated()
  }

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-xl font-semibold">학생 등록</h2>

      <form onSubmit={handleSubmit} className="grid gap-4">
        <input className="rounded-xl border px-4 py-3" placeholder="학생 이름 *" value={name} onChange={(e) => setName(e.target.value)} required />
        <input className="rounded-xl border px-4 py-3" placeholder="학년 *" value={grade} onChange={(e) => setGrade(e.target.value)} />
        <input className="rounded-xl border px-4 py-3" placeholder="학교" value={school} onChange={(e) => setSchool(e.target.value)} />
        <input className="rounded-xl border px-4 py-3" placeholder="학생 연락처" value={studentPhone} onChange={(e) => setStudentPhone(e.target.value)} />
        <input className="rounded-xl border px-4 py-3" placeholder="학부모 이름" value={parentName} onChange={(e) => setParentName(e.target.value)} />
        <input className="rounded-xl border px-4 py-3" placeholder="학부모 연락처 *" value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} required />
        <input type="email" className="rounded-xl border px-4 py-3" placeholder="학부모 이메일" value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} />
        <textarea className="min-h-[90px] rounded-xl border px-4 py-3" placeholder="메모" value={notes} onChange={(e) => setNotes(e.target.value)} />

        <div>
          <p className="mb-2 font-medium">반 배정</p>
          <div className="flex flex-wrap gap-2">
            {groups.map((group) => {
              const active = selectedGroupIds.includes(group.id)
              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className={`rounded-full border px-4 py-2 text-sm ${active ? 'bg-black text-white' : 'bg-white text-black'}`}
                >
                  {group.name}
                </button>
              )
            })}
          </div>
        </div>

        <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          학생 ID는 이름 + 학부모 연락처 뒤 4자리로 자동 생성됩니다.
        </div>

        <button type="submit" disabled={loading} className="rounded-xl bg-black px-4 py-3 text-white disabled:opacity-50">
          {loading ? '등록 중...' : '학생 등록'}
        </button>

        {message && <p className="text-sm text-slate-600 whitespace-pre-wrap">{message}</p>}
      </form>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Subject = {
  id: string
  name: string
}

export default function ClassGroupForm({ onCreated }: { onCreated?: () => void }) {
  const [name, setName] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchSubjects()
  }, [])

  async function fetchSubjects() {
    const { data } = await supabase.from('subjects').select('*').order('name')
    setSubjects((data as Subject[]) || [])
  }

  async function handleSubmit(e: any) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    if (!name.trim() || !subjectId) {
      setMessage('반 이름 / 과목 필수')
      setLoading(false)
      return
    }

    const { error } = await supabase.from('class_groups').insert({
      name,
      subject_id: subjectId,
    })

    setLoading(false)

    if (error) {
      setMessage(`등록 실패: ${error.message}`)
      return
    }

    setName('')
    setSubjectId('')
    setMessage('등록 완료')
    onCreated?.()
  }

  return (
    <div className="border rounded-2xl p-6">
      <h2 className="text-xl font-bold mb-4">수업반 등록</h2>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          className="border p-3 w-full"
          placeholder="반 이름 (예: 중2 수학 A반)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <select
          className="border p-3 w-full"
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
        >
          <option value="">과목 선택</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <button disabled={loading} className="bg-black text-white py-3 w-full rounded">
          등록
        </button>

        {message && <p className="text-sm text-gray-500">{message}</p>}
      </form>
    </div>
  )
}
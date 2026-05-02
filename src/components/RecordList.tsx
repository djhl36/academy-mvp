'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type RecordRow = {
  id: string
  student_id: string
  record_date: string
  progress: string | null
  teacher_note: string | null
  students: { name: string } | null
  subjects?: { name: string } | null
  class_groups: { name: string } | null
}

export default function RecordList({
  refreshKey = 0,
  studentId = null,
}: {
  refreshKey?: number
  studentId?: string | null
}) {
  const [records, setRecords] = useState<RecordRow[]>([])
  const [openId, setOpenId] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchData()
  }, [refreshKey, studentId])

  async function fetchData() {
    setMessage('')

    let query = supabase
      .from('academic_records')
      .select(`
        id,
        student_id,
        record_date,
        progress,
        teacher_note,
        students ( name ),
        subjects ( name ),
        class_groups ( name )
      `)
      .order('record_date', { ascending: false })

    if (studentId) query = query.eq('student_id', studentId)

    const { data, error } = await query

    if (error) {
      let fallback = supabase
        .from('academic_records')
        .select(`
          id,
          student_id,
          record_date,
          progress,
          teacher_note,
          students ( name ),
          class_groups ( name )
        `)
        .order('record_date', { ascending: false })

      if (studentId) fallback = fallback.eq('student_id', studentId)

      const { data: fallbackData, error: fallbackError } = await fallback

      if (fallbackError) {
        setRecords([])
        setMessage(`학업 데이터를 불러오지 못했습니다: ${fallbackError.message}`)
        return
      }

      setRecords((fallbackData as any) || [])
      return
    }

    setRecords((data as any) || [])
  }

  const grouped = useMemo(() => {
    const map: Record<string, any> = {}

    records.forEach((record) => {
      const key = `${record.class_groups?.name || '미지정'}_${record.record_date}_${record.subjects?.name || ''}`

      if (!map[key]) {
        map[key] = {
          key,
          className: record.class_groups?.name || '미지정 반',
          subject: record.subjects?.name || '',
          date: record.record_date,
          progress: record.progress,
          items: [],
        }
      }

      map[key].items.push(record)
    })

    return Object.values(map)
  }, [records])

  return (
    <div className="space-y-4">
      {message && <p className="rounded-2xl border bg-white p-5 text-sm text-red-500">{message}</p>}

      {!message && grouped.length === 0 && (
        <p className="rounded-2xl border bg-white p-5 text-sm text-slate-500">등록된 학업 데이터가 없습니다.</p>
      )}

      {grouped.map((group: any) => (
        <div key={group.key} className="rounded-2xl border bg-white">
          <button
            type="button"
            onClick={() => setOpenId(openId === group.key ? null : group.key)}
            className="w-full p-4 text-left"
          >
            <p className="font-semibold">
              {[group.subject, group.className].filter(Boolean).join(' / ')}
            </p>
            <p className="text-sm text-gray-500">{group.date}</p>
            <p className="mt-2 line-clamp-2 text-sm">{group.progress || '-'}</p>
          </button>

          {openId === group.key && (
            <div className="space-y-3 border-t p-4">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="mb-1 text-xs font-semibold text-slate-400">진도</p>
                <p className="whitespace-pre-wrap text-sm">{group.progress || '-'}</p>
              </div>

              <div className="rounded-xl border p-3">
                <p className="mb-2 text-xs font-semibold text-slate-400">학생별 특이사항</p>
                <div className="space-y-2">
                  {group.items.map((item: RecordRow) => (
                    <div key={item.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                      <p className="font-medium">{item.students?.name || '학생명 없음'}</p>
                      <p className="mt-1 whitespace-pre-wrap text-slate-600">{item.teacher_note || '-'}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

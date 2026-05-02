'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Inquiry = {
  id: string
  student_name: string | null
  title?: string | null
  content: string | null
  reply?: string | null
  status?: string | null
  created_at: string
}

export default function ParentInquiryList({
  studentId = null,
  refreshKey = 0,
}: {
  studentId?: string | null
  refreshKey?: number
}) {
  const [list, setList] = useState<Inquiry[]>([])
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    fetchList()
  }, [studentId, refreshKey])

  async function fetchList() {
    let query = supabase
      .from('parent_inquiries')
      .select('*')
      .order('created_at', { ascending: false })

    if (studentId) query = query.eq('student_id', studentId)

    const { data, error } = await query

    if (error) {
      setList([])
      return
    }

    const ids = (data ?? []).map((d) => d.id)

    if (ids.length === 0) {
      setList([])
      return
    }

    const { data: tasks } = await supabase
      .from('teacher_tasks')
      .select('inquiry_id, reply, status')
      .in('inquiry_id', ids)

    const map = new Map((tasks ?? []).map((t: any) => [t.inquiry_id, t]))

    const merged = (data ?? []).map((d: any) => ({
      ...d,
      reply: d.reply || map.get(d.id)?.reply || null,
      status: d.status || map.get(d.id)?.status || 'pending',
    }))

    setList(merged)
  }

  return (
    <div className="space-y-4">
      {list.length === 0 && (
        <p className="rounded-2xl border bg-white p-5 text-sm text-slate-500">상담 내역이 없습니다.</p>
      )}

      {list.map((item) => (
        <div key={item.id} className="rounded-2xl border bg-white">
          <button
            type="button"
            onClick={() => setOpenId(openId === item.id ? null : item.id)}
            className="w-full p-4 text-left"
          >
            <p className="text-sm text-gray-400">
              {new Date(item.created_at).toLocaleDateString('ko-KR')}
            </p>
            <p className="font-medium">
              {item.title || item.content?.slice(0, 20) || '문의'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {item.status === 'done' ? '답변 완료' : '접수됨'}
            </p>
          </button>

          {openId === item.id && (
            <div className="space-y-3 border-t p-4">
              <div className="rounded-xl bg-gray-50 p-3">
                <p className="mb-1 text-xs font-semibold text-slate-400">문의 내용</p>
                <p className="whitespace-pre-wrap text-sm">{item.content || '-'}</p>
              </div>

              <div className="rounded-xl border p-3">
                <p className="mb-1 text-xs font-semibold text-slate-400">답변</p>
                <p className="whitespace-pre-wrap text-sm">{item.reply || '아직 답변이 등록되지 않았습니다.'}</p>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

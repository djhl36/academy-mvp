'use client'

import { useState, FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { classifyInquiry } from '@/lib/classifyInquiry'
import { Student } from '@/lib/types'

type Props = {
  student: Student | null
  onCreated?: () => void
}

export default function ParentInquiryForm({ student, onCreated }: Props) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    if (!student?.id) {
      setMessage('학생 정보가 없습니다.')
      setLoading(false)
      return
    }

    if (!content.trim()) {
      setMessage('문의 내용을 입력해주세요.')
      setLoading(false)
      return
    }

    const inquiryContent = content.trim()

    const { data, error } = await supabase
      .from('parent_inquiries')
      .insert({
        student_id: student.id,
        student_name: student.name,
        parent_name: student.parent_name || null,
        content: inquiryContent,
      })
      .select()
      .single()

    if (error || !data) {
      console.error(error)
      setMessage('문의 저장 실패')
      setLoading(false)
      return
    }

    let result = {
      type: 'consult',
      summary: inquiryContent.slice(0, 30) || '학부모 문의',
    }

    try {
      result = await classifyInquiry(inquiryContent)
    } catch {
      //
    }

    const { error: taskError } = await supabase
      .from('teacher_tasks')
      .insert({
        inquiry_id: data.id,
        student_id: student.id,
        student_name: student.name,
        type: result.type,
        summary: `${student.name} - ${result.summary}`,
        status: 'pending',
      })

    if (taskError) {
      console.error(taskError)
      setMessage('문의는 저장되었지만 교사 업무 생성에 실패했습니다.')
      setLoading(false)
      return
    }

    setContent('')
    setMessage('문의가 접수되었습니다.')
    setLoading(false)
    onCreated?.()
  }

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-xl font-semibold">학부모 상담/문의</h2>

      <form onSubmit={handleSubmit} className="grid gap-4">
        <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <p>
            <span className="font-medium">학생:</span> {student?.name || '-'}
          </p>
          <p>
            <span className="font-medium">학부모:</span> {student?.parent_name || '-'}
          </p>
        </div>

        <textarea
          className="min-h-[120px] rounded-xl border px-4 py-3"
          placeholder="문의 내용을 입력하세요"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />

        <button
          type="submit"
          disabled={loading || !student?.id}
          className="rounded-xl bg-black px-4 py-3 text-white disabled:opacity-50"
        >
          {loading ? '처리 중...' : '문의 보내기'}
        </button>

        {message && <p className="text-sm text-slate-600">{message}</p>}
      </form>
    </div>
  )
}
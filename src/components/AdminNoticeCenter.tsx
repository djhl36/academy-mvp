'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { createNotice, fetchNotices } from '@/lib/notice'
import { generateText } from '@/lib/gemini'

type Notice = {
  id: string
  target_type: 'all' | 'class'
  title: string
  content: string
  class_group_id?: string | null
  created_at: string
  class_groups?: { name: string } | null
}

type ClassGroup = {
  id: string
  name: string
}

export default function AdminNoticeCenter() {
  const [all, setAll] = useState<Notice[]>([])
  const [classNotices, setClassNotices] = useState<Notice[]>([])
  const [groups, setGroups] = useState<ClassGroup[]>([])
  const [targetType, setTargetType] = useState<'all' | 'class'>('all')
  const [classGroupId, setClassGroupId] = useState('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    load()
    fetchGroups()
  }, [])

  async function load() {
    const res = await fetchNotices()
    setAll(res.all as Notice[])
    setClassNotices(res.class as Notice[])
  }

  async function fetchGroups() {
    const { data } = await supabase.from('class_groups').select('id, name').order('name')
    setGroups((data as ClassGroup[]) ?? [])
  }

  async function helpWrite() {
    if (!content.trim()) {
      setMessage('공지 내용을 간단히 입력해주세요.')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const text = await generateText(`
다음 학원 공지를 학부모에게 보내기 좋은 말투로 정리해라.
제목과 본문을 JSON으로만 출력해라.

원문:
${content}

형식:
{
  "title": "제목",
  "content": "정리된 본문"
}
`)
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim()
      const parsed = JSON.parse(cleaned)
      setTitle(parsed.title || title)
      setContent(parsed.content || content)
    } catch {
      setMessage('AI 공지 작성 실패')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate() {
    if (!title.trim() || !content.trim()) {
      setMessage('제목과 내용을 입력해주세요.')
      return
    }

    if (targetType === 'class' && !classGroupId) {
      setMessage('반을 선택해주세요.')
      return
    }

    setLoading(true)
    setMessage('')

    const { error } = await createNotice({
      target_type: targetType,
      class_group_id: targetType === 'class' ? classGroupId : null,
      title: title.trim(),
      content: content.trim(),
      is_active: true,
    })

    if (error) {
      setMessage(`공지 등록 실패: ${error.message}`)
      setLoading(false)
      return
    }

    setTitle('')
    setContent('')
    setClassGroupId('')
    setMessage('공지 등록 완료')
    await load()
    setLoading(false)
  }

  return (
    <div className="grid gap-6">
      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">공지 등록</h2>

        <div className="grid gap-3">
          <select className="rounded-xl border px-4 py-3" value={targetType} onChange={(e) => setTargetType(e.target.value as any)}>
            <option value="all">전체 공지</option>
            <option value="class">반별 공지</option>
          </select>

          {targetType === 'class' && (
            <select className="rounded-xl border px-4 py-3" value={classGroupId} onChange={(e) => setClassGroupId(e.target.value)}>
              <option value="">반 선택</option>
              {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
            </select>
          )}

          <input className="rounded-xl border px-4 py-3" placeholder="제목" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea className="min-h-[120px] rounded-xl border px-4 py-3" placeholder="공지 내용" value={content} onChange={(e) => setContent(e.target.value)} />

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={helpWrite} disabled={loading} className="rounded-xl border px-4 py-3 disabled:opacity-50">AI 공지 정리</button>
            <button type="button" onClick={handleCreate} disabled={loading} className="rounded-xl bg-black px-4 py-3 text-white disabled:opacity-50">공지 등록</button>
          </div>

          {message && <p className="text-sm text-slate-600">{message}</p>}
        </div>
      </div>

      <NoticeSection title="전체 공지" list={all} />
      <NoticeSection title="반별 공지" list={classNotices} />
    </div>
  )
}

function NoticeSection({ title, list }: { title: string; list: Notice[] }) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <h3 className="mb-3 font-semibold">{title}</h3>
      {list.length === 0 && <p className="text-sm text-gray-400">없음</p>}
      <div className="space-y-2">
        {list.map((notice) => (
          <div key={notice.id} className="rounded-xl border p-3">
            <p className="font-medium">{notice.title}</p>
            {notice.class_groups?.name && <p className="text-xs text-gray-400">대상: {notice.class_groups.name}</p>}
            <p className="whitespace-pre-wrap text-sm text-gray-600">{notice.content}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

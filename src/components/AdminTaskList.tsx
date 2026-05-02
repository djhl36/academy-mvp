'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { generateText } from '@/lib/gemini'

type TaskRow = {
  id: string
  inquiry_id: string | null
  student_id: string | null
  student_name: string | null
  summary: string | null
  type: string | null
  status: string | null
  reply: string | null
  class_name: string | null
  created_at: string | null
  completed_at: string | null
}

type InquiryRow = {
  id: string
  title: string | null
  content: string | null
  student_id: string | null
}

type StudentRow = {
  id: string
  name: string
}

type ClassGroupStudentRow = {
  student_id: string
  class_group_id: string
}

type ClassGroupRow = {
  id: string
  name: string
}

type TaskView = TaskRow & {
  title: string
  original: string
  scope: 'internal' | 'external'
  className: string
  studentName: string
  isNew: boolean
}

export default function AdminTaskList() {
  const [tasks, setTasks] = useState<TaskView[]>([])
  const [openId, setOpenId] = useState<string | null>(null)
  const [newTaskText, setNewTaskText] = useState('')
  const [newTaskType, setNewTaskType] = useState<'internal' | 'external'>('internal')
  const [replyMap, setReplyMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [aiLoadingId, setAiLoadingId] = useState<string | null>(null)

  useEffect(() => {
    fetchTasks()
  }, [])

  async function fetchTasks() {
    setLoading(true)
    setMessage('')

    try {
      const { data: taskData, error: taskError } = await supabase
        .from('teacher_tasks')
        .select('*')
        .order('created_at', { ascending: false })

      if (taskError) throw taskError

      const { data: inquiryData } = await supabase
        .from('parent_inquiries')
        .select('id, title, content, student_id')

      const { data: studentData } = await supabase
        .from('students')
        .select('id, name')

      const { data: memberData } = await supabase
        .from('class_group_students')
        .select('student_id, class_group_id')

      const { data: groupData } = await supabase
        .from('class_groups')
        .select('id, name')

      const inquiryMap = new Map(
        ((inquiryData as InquiryRow[] | null) ?? []).map((item) => [item.id, item])
      )

      const studentMap = new Map(
        ((studentData as StudentRow[] | null) ?? []).map((item) => [item.id, item.name])
      )

      const groupMap = new Map(
        ((groupData as ClassGroupRow[] | null) ?? []).map((item) => [item.id, item.name])
      )

      const studentClassMap = new Map<string, string>()

      ;((memberData as ClassGroupStudentRow[] | null) ?? []).forEach((item) => {
        const className = groupMap.get(item.class_group_id)
        if (className && !studentClassMap.has(item.student_id)) {
          studentClassMap.set(item.student_id, className)
        }
      })

      const mapped = ((taskData as TaskRow[] | null) ?? []).map((task) => {
        const inquiry = task.inquiry_id ? inquiryMap.get(task.inquiry_id) : null

        const studentId = task.student_id || inquiry?.student_id || null

        const scope: 'internal' | 'external' =
          task.inquiry_id || task.type === 'external' || task.type === 'consult'
            ? 'external'
            : 'internal'

        const studentName =
          task.student_name ||
          (studentId ? studentMap.get(studentId) : '') ||
          '-'

        const className =
          task.class_name ||
          (studentId ? studentClassMap.get(studentId) : '') ||
          '-'

        return {
          ...task,
          scope,
          studentName,
          className,
          title: task.summary || inquiry?.title || '제목 없음',
          original: inquiry?.content || task.summary || '',
          isNew: task.status !== 'done',
        }
      })

      setTasks(mapped)
    } catch (error: any) {
      setTasks([])
      setMessage(`할 일 목록 불러오기 실패: ${error?.message || '알 수 없는 오류'}`)
    } finally {
      setLoading(false)
    }
  }

  async function createTask() {
    if (!newTaskText.trim()) {
      setMessage('할 일 내용을 입력해주세요.')
      return
    }

    setLoading(true)
    setMessage('')

    const { error } = await supabase.from('teacher_tasks').insert({
      inquiry_id: null,
      student_id: null,
      student_name: null,
      type: newTaskType,
      summary: newTaskText.trim(),
      status: 'pending',
      reply: null,
      class_name: null,
    })

    if (error) {
      setMessage(`할 일 추가 실패: ${error.message}`)
      setLoading(false)
      return
    }

    setNewTaskText('')
    await fetchTasks()
  }

  async function polishReply(task: TaskView) {
    const text = replyMap[task.id]?.trim()

    if (!text) {
      setMessage('먼저 답변 또는 처리 내용을 입력해주세요.')
      return
    }

    setAiLoadingId(task.id)
    setMessage('')

    try {
      const result = await generateText(`
다음 내용을 학부모 또는 업무 기록용으로 자연스럽고 간결하게 다듬어라.
결과 문장만 출력해라.

원문:
${text}
`)
      setReplyMap((prev) => ({
        ...prev,
        [task.id]: result.trim() || text,
      }))
    } catch {
      setMessage('AI 다듬기 실패')
    } finally {
      setAiLoadingId(null)
    }
  }

  async function completeTask(task: TaskView) {
    const reply = replyMap[task.id]?.trim() || task.reply || '처리 완료'

    const { error } = await supabase
      .from('teacher_tasks')
      .update({
        status: 'done',
        reply,
        completed_at: new Date().toISOString(),
      })
      .eq('id', task.id)

    if (error) {
      setMessage(`완료 처리 실패: ${error.message}`)
      return
    }

    await fetchTasks()
  }

  async function deleteTask(taskId: string) {
    const ok = window.confirm('이 할 일을 삭제할까요?')
    if (!ok) return

    const { error } = await supabase
      .from('teacher_tasks')
      .delete()
      .eq('id', taskId)

    if (error) {
      setMessage(`삭제 실패: ${error.message}`)
      return
    }

    await fetchTasks()
  }

  const visibleTasks = useMemo(() => tasks, [tasks])

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">할 일 추가</h2>

        <div className="mb-3 flex gap-2">
          <button
            type="button"
            onClick={() => setNewTaskType('internal')}
            className={`rounded-xl px-4 py-2 text-sm ${
              newTaskType === 'internal'
                ? 'bg-black text-white'
                : 'border bg-white text-slate-700'
            }`}
          >
            원내 행정
          </button>

          <button
            type="button"
            onClick={() => setNewTaskType('external')}
            className={`rounded-xl px-4 py-2 text-sm ${
              newTaskType === 'external'
                ? 'bg-black text-white'
                : 'border bg-white text-slate-700'
            }`}
          >
            대외 업무
          </button>
        </div>

        <textarea
          className="min-h-[100px] w-full rounded-xl border px-4 py-3"
          placeholder="할 일 내용을 입력하세요"
          value={newTaskText}
          onChange={(e) => setNewTaskText(e.target.value)}
        />

        <button
          type="button"
          onClick={createTask}
          disabled={loading}
          className="mt-3 rounded-xl bg-black px-4 py-3 text-white disabled:opacity-50"
        >
          할 일 추가
        </button>

        {message && <p className="mt-3 text-sm text-red-500">{message}</p>}
      </div>

      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">할 일 리스트</h2>

        {loading && <p className="text-sm text-slate-500">불러오는 중...</p>}

        {!loading && visibleTasks.length === 0 && (
          <p className="text-sm text-slate-500">등록된 할 일이 없습니다.</p>
        )}

        <div className="space-y-2">
          {visibleTasks.map((task) => {
            const opened = openId === task.id
            const done = task.status === 'done'

            return (
              <div key={task.id} className="rounded-xl border">
                <button
                  type="button"
                  onClick={() => setOpenId(opened ? null : task.id)}
                  className="grid w-full grid-cols-[1fr_1fr_2fr_auto] items-center gap-3 px-4 py-3 text-left text-sm hover:bg-slate-50"
                >
                  <span>{task.className}</span>
                  <span>{task.studentName}</span>
                  <span className="font-medium">
                    {task.title}
                    {task.isNew && !done && (
                      <span className="ml-2 rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">
                        NEW
                      </span>
                    )}
                  </span>
                  <span className={done ? 'text-green-600' : 'text-slate-400'}>
                    {done ? '완료' : task.scope === 'internal' ? '원내' : '대외'}
                  </span>
                </button>

                {opened && (
                  <div className="space-y-3 border-t p-4">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="mb-1 text-xs font-semibold text-slate-400">원문</p>
                      <p className="whitespace-pre-wrap text-sm">{task.original || '-'}</p>
                    </div>

                    {task.reply && (
                      <div className="rounded-xl bg-green-50 p-3">
                        <p className="mb-1 text-xs font-semibold text-green-700">처리 내용</p>
                        <p className="whitespace-pre-wrap text-sm text-green-900">{task.reply}</p>
                      </div>
                    )}

                    {!done && (
                      <>
                        <textarea
                          className="min-h-[90px] w-full rounded-xl border px-3 py-2 text-sm"
                          placeholder="답변 또는 처리 내용을 입력하세요"
                          value={replyMap[task.id] ?? task.reply ?? ''}
                          onChange={(e) =>
                            setReplyMap((prev) => ({
                              ...prev,
                              [task.id]: e.target.value,
                            }))
                          }
                        />

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => polishReply(task)}
                            disabled={aiLoadingId === task.id}
                            className="rounded-xl border px-4 py-2 text-sm disabled:opacity-50"
                          >
                            {aiLoadingId === task.id ? 'AI 정리 중...' : 'AI 요약/다듬기'}
                          </button>

                          <button
                            type="button"
                            onClick={() => completeTask(task)}
                            className="rounded-xl bg-black px-4 py-2 text-sm text-white"
                          >
                            완료 처리
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteTask(task.id)}
                            className="rounded-xl border border-red-200 px-4 py-2 text-sm text-red-600"
                          >
                            삭제
                          </button>
                        </div>
                      </>
                    )}

                    {done && (
                      <button
                        type="button"
                        onClick={() => deleteTask(task.id)}
                        className="rounded-xl border border-red-200 px-4 py-2 text-sm text-red-600"
                      >
                        삭제
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
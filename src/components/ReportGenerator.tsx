'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { generateText } from '@/lib/gemini'
import { Student } from '@/lib/types'

type StudentDetail = Student & {
  student_subjects?: {
    subject_id: string
    subjects: {
      id: string
      name: string
    }[]
  }[]
  class_group_students?: {
    class_group_id: string
    class_groups: {
      id: string
      name: string
    }[]
  }[]
}

type RecordRow = {
  id: string
  record_date: string
  exam_type: string | null
  score: number | null
  progress: string | null
  teacher_note: string | null
  subjects: {
    name: string
  }[]
  class_groups: {
    name: string
  }[]
}

type InquiryRow = {
  id: string
  student_name: string | null
  parent_name: string | null
  content: string
  created_at: string
  reply?: string | null
  status?: string | null
}

const MESSAGE_TYPES = [
  {
    value: 'academic_report',
    label: '학업 리포트',
    instruction:
      '학부모에게 전달할 학업 리포트를 작성해라. 전체 학습상태, 최근 흐름, 강점, 보완점, 다음 학습 방향이 포함되게 해라.',
  },
  {
    value: 'parent_reply',
    label: '학부모 상담 답변',
    instruction:
      '학부모에게 보낼 답변 메시지를 작성해라. 공손하고 명확하며 실제 학원 상담 톤으로 작성해라.',
  },
  {
    value: 'class_feedback',
    label: '수업 피드백',
    instruction:
      '해당 학생의 최근 수업 피드백 메시지를 작성해라. 진도, 태도, 이해도, 보완점이 드러나게 해라.',
  },
  {
    value: 'praise',
    label: '칭찬 메시지',
    instruction:
      '학생 또는 학부모에게 보낼 칭찬 메시지를 작성해라. 과장 없이 실제 데이터 기반으로 작성해라.',
  },
  {
    value: 'warning',
    label: '보완/주의 안내',
    instruction:
      '학생의 보완점이나 주의가 필요한 부분을 안내하는 메시지를 작성해라. 부드럽지만 분명하게 작성해라.',
  },
  {
    value: 'study_plan',
    label: '학습 계획 안내',
    instruction:
      '다음 2~4주 학습 계획 안내 메시지를 작성해라. 실행 가능한 공부 방향과 숙제/복습 포인트를 포함해라.',
  },
  {
    value: 'custom',
    label: '직접 입력',
    instruction: '',
  },
]

export default function ReportGenerator() {
  const [students, setStudents] = useState<Student[]>([])
  const [studentId, setStudentId] = useState('')
  const [messageType, setMessageType] = useState('academic_report')
  const [customPrompt, setCustomPrompt] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchStudents()
  }, [])

  async function fetchStudents() {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      setStudents([])
      setMessage(`학생 목록을 불러오지 못했습니다: ${error.message}`)
      return
    }

    setStudents((data as Student[]) ?? [])
  }

  const selectedStudent = useMemo(
    () => students.find((student) => student.id === studentId) ?? null,
    [students, studentId]
  )

  async function generate() {
    if (!studentId) {
      setMessage('학생을 먼저 선택해주세요.')
      return
    }

    const selectedType = MESSAGE_TYPES.find((item) => item.value === messageType)

    if (!selectedType) {
      setMessage('메시지 유형을 선택해주세요.')
      return
    }

    if (messageType === 'custom' && !customPrompt.trim()) {
      setMessage('직접 요청 내용을 입력해주세요.')
      return
    }

    setLoading(true)
    setResult('')
    setMessage('')

    const [
      { data: studentDetailData, error: studentError },
      { data: academicData, error: academicError },
      { data: inquiryData, error: inquiryError },
      { data: taskData, error: taskError },
    ] = await Promise.all([
      supabase
        .from('students')
        .select(`
          *,
          student_subjects (
            subject_id,
            subjects (
              id,
              name
            )
          ),
          class_group_students (
            class_group_id,
            class_groups (
              id,
              name
            )
          )
        `)
        .eq('id', studentId)
        .single(),
      supabase
        .from('academic_records')
        .select(`
          id,
          record_date,
          exam_type,
          score,
          progress,
          teacher_note,
          subjects (
            name
          ),
          class_groups (
            name
          )
        `)
        .eq('student_id', studentId)
        .order('record_date', { ascending: false })
        .limit(30),
      supabase
        .from('parent_inquiries')
        .select('*')
        .eq('student_name', selectedStudent?.name ?? '')
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('teacher_tasks')
        .select('*')
        .eq('student_name', selectedStudent?.name ?? '')
        .order('created_at', { ascending: false })
        .limit(20),
    ])

    if (studentError) {
      setMessage(`학생 데이터를 불러오지 못했습니다: ${studentError.message}`)
      setLoading(false)
      return
    }

    if (academicError) {
      setMessage(`학업 데이터를 불러오지 못했습니다: ${academicError.message}`)
      setLoading(false)
      return
    }

    if (inquiryError) {
      setMessage(`상담 데이터를 불러오지 못했습니다: ${inquiryError.message}`)
      setLoading(false)
      return
    }

    if (taskError) {
      setMessage(`교사 업무 데이터를 불러오지 못했습니다: ${taskError.message}`)
      setLoading(false)
      return
    }

    const studentDetail = (studentDetailData as StudentDetail) ?? null
    const academicRecords = (academicData as RecordRow[]) ?? []
    const inquiries = (inquiryData as InquiryRow[]) ?? []
    const tasks = (taskData as any[]) ?? []

    const subjectNames =
      studentDetail?.student_subjects
        ?.map((item) => item.subjects?.map(s => s.name))
        .flat()
        .filter(Boolean) ?? []

    const classGroupNames =
      studentDetail?.class_group_students
        ?.map((item) => item.class_groups?.map(c => c.name))
        .flat()
        .filter(Boolean) ?? []

    const prompt = `
너는 학원 운영을 돕는 메시지 작성 도우미다.

아래 학생 데이터를 바탕으로 요청된 메시지를 한국어로 작성해라.

[작성 요청]
메시지 유형: ${selectedType.label}
기본 지시:
${selectedType.instruction || '-'}

추가 요청:
${messageType === 'custom' ? customPrompt.trim() : customPrompt.trim() || '없음'}

[학생 기본 정보]
이름: ${studentDetail?.name ?? '미상'}
  학생코드: ${studentDetail?.student_login_id ?? '없음'}
학년: ${studentDetail?.grade ?? '미상'}
학교: ${studentDetail?.school ?? '미상'}
학생 연락처: ${studentDetail?.student_phone ?? '없음'}
학부모명: ${studentDetail?.parent_name ?? '없음'}
학부모 연락처: ${studentDetail?.parent_phone ?? '없음'}
학생 메모: ${studentDetail?.notes ?? '없음'}
수강 과목: ${subjectNames.length > 0 ? subjectNames.join(', ') : '없음'}
수업반: ${classGroupNames.length > 0 ? classGroupNames.join(', ') : '없음'}

[최근 학업 데이터]
${academicRecords.length > 0 ? JSON.stringify(academicRecords, null, 2) : '없음'}

[학부모 상담/문의 내역]
${inquiries.length > 0 ? JSON.stringify(inquiries, null, 2) : '없음'}

[교사 업무/답변 관련 데이터]
${tasks.length > 0 ? JSON.stringify(tasks, null, 2) : '없음'}

[작성 규칙]
1. 반드시 위 데이터에 근거해서 작성해라.
2. 없는 사실은 지어내지 마라.
3. 메시지는 바로 복붙 가능한 자연스러운 문장으로 작성해라.
4. 너무 장황하지 않게 작성하되, 필요한 내용은 빠뜨리지 마라.
5. 학원 현장에서 실제로 보내는 톤으로 작성해라.
6. 제목이 꼭 필요하지 않으면 제목 없이 본문만 작성해라.
7. 요청이 학부모 대상이면 공손한 존댓말, 학생 대상이면 자연스러운 지도 톤으로 작성해라.
`

    try {
      const text = await generateText(prompt)

      if (!text.trim()) {
        setMessage('생성 결과가 비어 있습니다. 다시 시도해주세요.')
        setLoading(false)
        return
      }

      setResult(text)
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : '메시지 생성 중 오류가 발생했습니다.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm lg:col-span-2">
      <h2 className="mb-4 text-xl font-semibold">AI 메시지 생성</h2>

      <div className="grid gap-4">
        <select
          className="w-full rounded-xl border px-4 py-3"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
        >
          <option value="">학생 선택</option>
          {students.map((student) => (
            <option key={student.id} value={student.id}>
              {student.name}
              {student.grade ? ` (${student.grade})` : ''}
              {student.school ? ` / ${student.school}` : ''}
            </option>
          ))}
        </select>

        <select
          className="w-full rounded-xl border px-4 py-3"
          value={messageType}
          onChange={(e) => setMessageType(e.target.value)}
        >
          {MESSAGE_TYPES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        <textarea
          className="min-h-[120px] w-full rounded-xl border px-4 py-3"
          placeholder={
            messageType === 'custom'
              ? '예: 중간고사 이후 학부모에게 보낼 상담 메시지 작성'
              : '추가 요청이 있으면 입력하세요. 없으면 비워도 됩니다.'
          }
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
        />

        <button
          type="button"
          onClick={generate}
          disabled={loading || !studentId}
          className="rounded-xl bg-black px-4 py-3 text-white disabled:opacity-50"
        >
          {loading ? '생성 중...' : '메시지 생성'}
        </button>

        {message && <p className="text-sm text-slate-600">{message}</p>}

        {result && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 whitespace-pre-wrap text-sm leading-7 text-slate-800">
            {result}
          </div>
        )}
      </div>
    </div>
  )
}
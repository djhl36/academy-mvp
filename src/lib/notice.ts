import { supabase } from '@/lib/supabase'

export async function fetchNotices(studentId?: string | null) {
  const { data, error } = await supabase
    .from('academy_notices')
    .select('*, class_groups(name)')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) {
    return { all: [], class: [], academy: [], individual: [] }
  }

  const rows = data ?? []

  const all = rows.filter((notice: any) =>
    notice.target_type === 'all' || notice.type === 'academy'
  )

  let studentClassGroupIds: string[] = []

  if (studentId) {
    const { data: memberRows } = await supabase
      .from('class_group_students')
      .select('class_group_id')
      .eq('student_id', studentId)

    studentClassGroupIds = (memberRows ?? []).map((row: any) => row.class_group_id)
  }

  const classRows = rows.filter((notice: any) => {
    if (notice.target_type === 'class') {
      if (!studentId) return true
      return notice.class_group_id && studentClassGroupIds.includes(notice.class_group_id)
    }

    if (notice.type === 'individual') {
      if (notice.student_id) return !studentId || notice.student_id === studentId
      if (notice.class_group_id) return !studentId || studentClassGroupIds.includes(notice.class_group_id)
      return !studentId
    }

    return false
  })

  return {
    all,
    class: classRows,
    academy: all,
    individual: classRows,
  }
}

export async function createNotice(payload: any) {
  const insertPayload: any = {
    type: payload.target_type === 'all' ? 'academy' : 'individual',
    target_type: payload.target_type,
    class_group_id: payload.class_group_id ?? null,
    student_id: payload.student_id ?? null,
    title: payload.title,
    content: payload.content,
    is_active: payload.is_active ?? true,
  }

  if (payload.class_name) insertPayload.class_name = payload.class_name

  return supabase.from('academy_notices').insert(insertPayload)
}

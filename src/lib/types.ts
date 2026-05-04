export type Student = {
  id: string
  student_login_id: string | null
  name: string
  grade: string | null
  school: string | null
  student_phone: string | null
  parent_name: string | null
  parent_phone: string | null
  parent_email: string | null
  notes: string | null
  created_at: string
}

export type Subject = {
  id: string
  name: string
  created_at: string
}

export type ClassGroup = {
  id: string
  name: string
  created_at: string
}

export type TaskStatus = 'pending' | 'done'

export type TaskType = 'inquiry' | 'manual'

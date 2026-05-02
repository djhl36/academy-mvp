import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const webhookUrl = process.env.TASK_NOTIFY_WEBHOOK_URL

    console.log('[/api/task-notify] incoming body:', JSON.stringify(body, null, 2))

    if (!webhookUrl) {
      console.error('TASK_NOTIFY_WEBHOOK_URL not set')
      return NextResponse.json(
        { ok: false, message: 'TASK_NOTIFY_WEBHOOK_URL not set' },
        { status: 500 }
      )
    }

    if (!body?.recipientEmail) {
      console.error('recipientEmail missing in payload')
      return NextResponse.json(
        { ok: false, message: 'recipientEmail missing' },
        { status: 400 }
      )
    }

    const zapPayload = {
      recipientEmail: String(body.recipientEmail || ''),
      to: String(body.recipientEmail || ''),
      parentName: String(body.parentName || ''),
      studentName: String(body.studentName || ''),
      className: String(body.className || ''),
      inquiryTitle: String(body.inquiryTitle || ''),
      originalContent: String(body.originalContent || ''),
      reply: String(body.reply || ''),
      completedAt: String(body.completedAt || ''),
      mailSubject: String(body.mailSubject || ''),
      subject: String(body.mailSubject || ''),
      mailBody: String(body.mailBody || ''),
      body: String(body.mailBody || ''),
    }

    console.log('[/api/task-notify] webhook payload:', JSON.stringify(zapPayload, null, 2))

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(zapPayload),
    })

    const responseText = await response.text()

    console.log('[/api/task-notify] webhook response status:', response.status)
    console.log('[/api/task-notify] webhook response body:', responseText)

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Webhook send failed',
          status: response.status,
          responseText,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      sent: zapPayload,
    })
  } catch (error) {
    console.error('[/api/task-notify] unexpected error:', error)

    return NextResponse.json(
      { ok: false, message: 'Unexpected error' },
      { status: 500 }
    )
  }
}
import { generateText } from './gemini'

export async function filterInquiryTone(content: string) {
  const prompt = `
다음 학부모 문의 내용을 바탕으로, 의미는 유지하되 교사에게 전달하기 좋은 차분하고 자연스러운 문장으로 다듬어라.

규칙:
- 원문의 핵심은 절대 바꾸지 마라.
- 길이는 너무 늘리지 마라.
- 변명, 해설, 머리말 없이 다듬어진 문장만 출력해라.
- 정중하고 전달력 있는 상담 문의 톤으로 작성해라.

원문:
${content}
`

  try {
    const text = await generateText(prompt)
    return (text || '').trim() || content.trim()
  } catch {
    return content.trim()
  }
}
import { generateText } from './gemini'

export async function classifyInquiry(content: string) {
  const prompt = `
다음 학부모 문의를 분석해서 JSON만 출력해라. 설명 금지.

문의:
"${content}"

출력 형식:
{
  "title": "문의 제목",
  "summary": "한 줄 요약"
}
`

  try {
    const text = await generateText(prompt)
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    return {
      title: content.trim().slice(0, 20) || '학부모 문의',
      summary: content.trim().slice(0, 40) || '학부모 문의',
    }
  }
}

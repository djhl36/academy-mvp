import { generateText } from './gemini'

export async function generateInquiryTitle(content: string) {
  const prompt = `
다음 학부모 문의 내용을 바탕으로 교사 할 일 리스트에 들어갈 아주 짧은 제목 1개만 작성해라.

규칙:
- 18자 이내
- 군더더기 없이 핵심만
- 따옴표, 번호, 설명 없이 제목만 출력
- 지나치게 공격적이거나 감정적인 표현은 중립적으로 정리

문의 내용:
${content}
`

  try {
    const text = await generateText(prompt)
    const cleaned = (text || '').replace(/[\n\r]/g, ' ').trim().replace(/^['"“”]+|['"“”]+$/g, '')
    return cleaned || content.trim().slice(0, 18) || '학부모 문의'
  } catch {
    return content.trim().slice(0, 18) || '학부모 문의'
  }
}
import { GoogleGenAI } from '@google/genai'

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY

if (!apiKey) {
  throw new Error('NEXT_PUBLIC_GEMINI_API_KEY is not set')
}

const ai = new GoogleGenAI({ apiKey })

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRetryableGeminiError(error: unknown) {
  const message =
    error instanceof Error ? error.message : typeof error === 'string' ? error : ''

  return (
    message.includes('"code":503') ||
    message.includes('503') ||
    message.includes('UNAVAILABLE') ||
    message.includes('high demand')
  )
}

export async function generateText(prompt: string) {
  let lastError: unknown = null

  for (let i = 0; i < 3; i += 1) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      })

      return response.text ?? ''
    } catch (error) {
      lastError = error

      if (!isRetryableGeminiError(error) || i === 2) {
        break
      }

      await sleep(700 * (i + 1))
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Gemini request failed')
}
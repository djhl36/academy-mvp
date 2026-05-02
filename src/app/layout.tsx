import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '학원 자동화 베타',
  description: '학원 업무 자동화 베타 테스트 UI',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
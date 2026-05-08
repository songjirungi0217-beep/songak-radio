import './globals.css'

export const metadata = {
  title: '방송부 사연 신청',
  description: '교내 방송부 노래 및 사연 신청 웹 시스템',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}

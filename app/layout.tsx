import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Text to Emojis Converter',
  description: 'Encrypt your text into emojis with a secret password and decrypt them back to text.',
  keywords: ['text to emoji', 'encryption', 'converter', 'password protection'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}

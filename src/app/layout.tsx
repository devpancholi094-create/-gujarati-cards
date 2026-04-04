import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Gujarati Card Games',
  description: 'Play Mendicot, Satto, Kachu Phool, 420 & Joker with friends online!',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Cards' },
  openGraph: { title: 'Gujarati Card Games', description: 'Play Gujarati card games with friends!', type: 'website' },
}

export const viewport: Viewport = {
  themeColor: '#0a3320',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="apple-touch-icon" href="/icons/icon-192.png" /></head>
      <body className="felt-bg min-h-screen">{children}</body>
    </html>
  )
}

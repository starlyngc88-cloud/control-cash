import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { Sidebar } from "@/components/layout/sidebar"
import { LanguageProvider } from "@/i18n/useLanguage"
import { AuthProvider } from "@/components/auth/AuthProvider"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "KellyCash",
  description: "La platica bajo control",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="flex min-h-screen">
        <AuthProvider>
          <LanguageProvider>
            <Sidebar />
            <main className="flex-1 p-6 overflow-auto">{children}</main>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  )
}

import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { LanguageProvider } from "@/i18n/useLanguage"
import { AuthProvider } from "@/components/auth/AuthProvider"
import { MonthFilterProvider } from "@/components/MonthFilterContext"
import { HeaderActionsProvider } from "@/components/HeaderActionsContext"

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
  icons: {
    icon: "/icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="bg-[#f8fafc] font-sans text-slate-800 h-screen flex overflow-hidden">
        <AuthProvider>
          <LanguageProvider>
            <MonthFilterProvider>
              <HeaderActionsProvider>
              <Sidebar />
              <main className="flex-1 flex flex-col h-screen overflow-hidden">
                <Header />
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                  {children}
                </div>
              </main>
              </HeaderActionsProvider>
            </MonthFilterProvider>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  )
}

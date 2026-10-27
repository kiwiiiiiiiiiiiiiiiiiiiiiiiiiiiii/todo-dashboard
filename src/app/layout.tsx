import type { Metadata } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { cn } from "../lib/utils"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Linear Dashboard - Personal Accountability",
  description: "Enterprise-grade personal accountability and learning dashboard",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={cn(
        "min-h-screen bg-background text-foreground antialiased",
        inter.variable,
        jetbrainsMono.variable
      )}>
        <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.05),_transparent_50%)]" />
        {children}
      </body>
    </html>
  )
}
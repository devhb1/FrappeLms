// RootLayout is the main layout component for the entire Next.js app.
// It sets up global metadata, fonts, theme, and authentication context.
// All pages are rendered inside this layout.
import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/components/auth-provider"
import "./globals.css"

// Metadata for SEO and social sharing. This is used by Next.js to populate <head> tags.
export const metadata: Metadata = {
  title: "MaalEdu - Shape Tomorrow's Digital World | Blockchain Education",
  description:
    "Master blockchain technology with our globally recognized dual diploma program. Professional & Academic diplomas from Maal Data Lab and Warnborough College UK. Start your blockchain career today.",
  keywords:
    "blockchain education, dual diploma, blockchain certification, cryptocurrency course, smart contracts, blockchain developer, MaalEdu, Warnborough College",
  authors: [{ name: "MaalEdu" }],
  icons: {
    icon: [
      { url: "/HeadLogo.png", sizes: "any" },
      { url: "/HeadLogo.png", type: "image/png" }
    ],
    shortcut: "/HeadLogo.png",
    apple: "/HeadLogo.png"
  },
  openGraph: {
    title: "MaalEdu - Shape Tomorrow's Digital World",
    description: "Master blockchain technology with our globally recognized dual diploma program.",
    url: "https://maaledu.com",
    siteName: "MaalEdu",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MaalEdu - Shape Tomorrow's Digital World",
    description: "Master blockchain technology with our globally recognized dual diploma program.",
  },
}

// The main layout component. All pages are rendered inside this.
// 'children' is the content of each page.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
        {/* This script sets the initial theme (dark/light) based on localStorage or system preference. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme')
                if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark')
                } else {
                  document.documentElement.classList.remove('dark')
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`}>
        {/* ThemeProvider makes dark/light theme available throughout the app. */}
        <ThemeProvider>
          {/* AuthProvider provides authentication context to all child components. */}
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

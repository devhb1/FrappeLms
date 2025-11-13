"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

export function ThemeDebug() {
    const { theme, resolvedTheme, systemTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) return null

    return (
        <div className="fixed bottom-4 right-4 bg-card border border-border rounded-lg p-3 text-xs font-mono z-50 shadow-lg">
            <div className="text-foreground">
                <div>Theme: {theme}</div>
                <div>Resolved: {resolvedTheme}</div>
                <div>System: {systemTheme}</div>
                <div>Class: {document.documentElement.classList.contains('dark') ? 'dark' : 'light'}</div>
            </div>
        </div>
    )
}

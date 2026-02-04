'use client'

import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from './ui/button'

export default function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
    const [isInstalled, setIsInstalled] = useState(false)

    useEffect(() => {
        // Check if app is already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true)
        }

        const handler = (e: any) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault()
            // Stash the event so it can be triggered later.
            setDeferredPrompt(e)
        }

        window.addEventListener('beforeinstallprompt', handler)

        // Listen for app installed event
        window.addEventListener('appinstalled', () => {
            setIsInstalled(true)
            setDeferredPrompt(null)
            console.log('PWA was installed')
        })

        return () => {
            window.removeEventListener('beforeinstallprompt', handler)
        }
    }, [])

    const handleInstallClick = async () => {
        if (!deferredPrompt) {
            return
        }

        // Show the install prompt
        deferredPrompt.prompt()

        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice
        console.log(`User response to the install prompt: ${outcome}`)

        // We've used the prompt, and can't use it again, throw it away
        setDeferredPrompt(null)
    }

    // Only show button if we have the prompt event and it's not installed
    if (!deferredPrompt || isInstalled) {
        // Optional: For testing purposes on localhost, you might want to force show it or debug.
        // But for production, we hide it if there's no prompt available.
        // However, on some browsers, the event fires immediately.
        return null
    }

    return (
        <Button
            variant="outline"
            size="sm"
            className="w-full gap-2 justify-start mt-auto"
            onClick={handleInstallClick}
        >
            <Download className="h-4 w-4" />
            <span>앱 다운로드</span>
        </Button>
    )
}

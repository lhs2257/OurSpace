'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Bell, BellOff } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { urlBase64ToUint8Array } from '@/lib/utils'

export default function PushNotificationManager({ userId }: { userId: string }) {
    const [isSubscribed, setIsSubscribed] = useState(false)
    const [subscription, setSubscription] = useState<PushSubscription | null>(null)
    const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

    useEffect(() => {
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            // 1. Register Service Worker explicitly to ensure it exists
            navigator.serviceWorker.register('/sw.js')
                .then(reg => {
                    setRegistration(reg)
                    // 2. Check existing subscription
                    return reg.pushManager.getSubscription()
                })
                .then(sub => {
                    if (sub && !(sub.expirationTime && Date.now() > sub.expirationTime)) {
                        setSubscription(sub)
                        setIsSubscribed(true)
                    }
                })
                .catch(err => console.error('Service Worker registration failed:', err))
        }
    }, [])

    async function subscribeToPush() {
        // Fallback: Try to get registration if missing
        let reg = registration
        if (!reg && 'serviceWorker' in navigator) {
            reg = await navigator.serviceWorker.ready
            setRegistration(reg)
        }

        if (!reg) {
            console.error('No Service Worker registration found')
            return
        }

        try {
            const sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(
                    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
                )
            })

            setSubscription(sub)
            setIsSubscribed(true)

            // Save subscription to DB
            const supabase = createClient()
            const { error } = await supabase
                .from('push_subscriptions')
                .insert({
                    user_id: userId,
                    endpoint: sub.endpoint,
                    p256dh: sub.toJSON().keys?.p256dh!,
                    auth: sub.toJSON().keys?.auth!
                })

            if (error) console.error('Failed to save subscription:', error)

            console.log('Web Push Subscribed!')
        } catch (error) {
            console.error('Failed to subscribe to Push', error)
        }
    }

    async function unsubscribeFromPush() {
        if (!subscription) return

        await subscription.unsubscribe()

        // Remove from DB
        const supabase = createClient()
        await supabase
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', subscription.endpoint)

        setSubscription(null)
        setIsSubscribed(false)
        console.log('Web Push Unsubscribed!')
    }


    // Always render the button, disabled only if SW is strictly not supported
    // (Optional: loading state)

    return (
        <div className="flex items-center space-x-2">
            {isSubscribed ? (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={unsubscribeFromPush}
                    className="text-gray-500 hover:text-red-500"
                >
                    <BellOff className="h-4 w-4 mr-2" />
                    알림 끄기
                </Button>
            ) : (
                <Button
                    variant="default"
                    size="sm"
                    onClick={subscribeToPush}
                >
                    <Bell className="h-4 w-4 mr-2" />
                    알림 켜기
                </Button>
            )}
        </div>
    )
}

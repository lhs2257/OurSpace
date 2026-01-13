'use server'

import { createClient } from '@/lib/supabase-server'
import webpush from 'web-push'

webpush.setVapidDetails(
    process.env.NEXT_PUBLIC_VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.NEXT_PRIVATE_VAPID_PRIVATE_KEY!
)

export async function sendPushNotification(title: string, body: string, url: string = '/') {
    const supabase = await createClient()

    // 1. Get all subscriptions
    const { data: subscriptions } = await supabase
        .from('push_subscriptions')
        .select('*')

    if (!subscriptions || subscriptions.length === 0) return

    // 2. Send push to each subscription
    const notifications = subscriptions.map(sub => {
        const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
                p256dh: sub.p256dh,
                auth: sub.auth
            }
        }

        const payload = JSON.stringify({
            title,
            body,
            url,
            icon: '/icon-192x192.png'
        })

        return webpush.sendNotification(pushSubscription, payload)
            .catch(err => {
                if (err.statusCode === 410) {
                    // Subscription expired, delete from DB
                    console.log(`Subscription expired for ${sub.user_id}, deleting...`)
                    supabase.from('push_subscriptions').delete().eq('id', sub.id).then()
                } else {
                    console.error('Error sending push:', err)
                }
            })
    })

    await Promise.all(notifications)
    return { success: true, count: subscriptions.length }
}

export async function sendPushToUser(userId: string, title: string, body: string, url: string = '/') {
    const supabase = await createClient()

    // 1. Get subscriptions for specific user
    const { data: subscriptions } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId)

    if (!subscriptions || subscriptions.length === 0) return { success: false, message: 'No subscriptions found' }

    // 2. Send push to each subscription
    const notifications = subscriptions.map(sub => {
        const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
                p256dh: sub.p256dh,
                auth: sub.auth
            }
        }

        const payload = JSON.stringify({
            title,
            body,
            url,
            icon: '/icon-192x192.png'
        })

        return webpush.sendNotification(pushSubscription, payload)
            .catch(err => {
                if (err.statusCode === 410) {
                    supabase.from('push_subscriptions').delete().eq('id', sub.id).then()
                } else {
                    console.error('Error sending push:', err)
                }
            })
    })

    await Promise.all(notifications)
    return { success: true, count: subscriptions.length }
}

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import webpush from 'web-push'

export async function GET(request: Request) {
    // 1. Verify Vercel Cron (Optional but recommended security)
    // const authHeader = request.headers.get('authorization')
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return new Response('Unauthorized', { status: 401 })
    // }

    // 2. Check if it's a weekday (Mon-Fri) in KST
    // UTC 00:30 is KST 09:30.
    // getDay(): 0 = Sun, 1 = Mon, ..., 6 = Sat
    const now = new Date()
    const kstTime = new Date(now.getTime() + (9 * 60 * 60 * 1000)) // UTC to KST
    const dayOfWeek = kstTime.getUTCDay()

    // 0(Sun) or 6(Sat) -> Skip
    if (dayOfWeek === 0 || dayOfWeek === 6) {
        return NextResponse.json({ message: 'Weekend, skipping notification.' })
    }

    // 3. Configure Web Push
    webpush.setVapidDetails(
        process.env.NEXT_PUBLIC_VAPID_SUBJECT!,
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
        process.env.NEXT_PRIVATE_VAPID_PRIVATE_KEY!
    )

    const supabase = await createClient()

    // 4. Get all subscriptions and send push
    const { data: subscriptions } = await supabase
        .from('push_subscriptions')
        .select('*')

    if (!subscriptions || subscriptions.length === 0) {
        return NextResponse.json({ message: 'No subscriptions found.' })
    }

    const notifications = subscriptions.map(sub => {
        const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
                p256dh: sub.p256dh,
                auth: sub.auth
            }
        }

        const payload = JSON.stringify({
            title: '출근 전 알림 ⏰',
            body: '곧 업무 시작 시간입니다! (10:00 AM)',
            url: '/dashboard',
            icon: '/icon-192x192.png'
        })

        return webpush.sendNotification(pushSubscription, payload)
            .catch(err => {
                if (err.statusCode === 410) {
                    console.log(`Subscription expired for ${sub.user_id}`)
                    supabase.from('push_subscriptions').delete().eq('id', sub.id).then()
                } else {
                    console.error('Error sending cron push:', err)
                }
            })
    })

    await Promise.all(notifications)

    return NextResponse.json({
        message: 'Notifications sent',
        count: subscriptions.length
    })
}

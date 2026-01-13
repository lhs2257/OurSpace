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

    // 3. Send Push Notification using the shared action
    // This ensures we use exactly the same logic as the working "Test Notification"
    try {
        const { sendPushNotification } = await import('@/lib/push-actions')
        await sendPushNotification(
            '출근 30분 전 알림 ⏰',
            '30분 남았다.. 빨랑 출근해라.. 아오..'
        )
        return NextResponse.json({ message: 'Notifications triggered via shared action' })
    } catch (error) {
        console.error('Cron Push Error:', error)
        return NextResponse.json({ message: 'Error sending notifications', error }, { status: 500 })
    }
}

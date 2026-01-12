'use server'

import { createClient } from './supabase-server'
import { revalidatePath } from 'next/cache'

export async function checkIn(userId: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('attendance')
        .insert({
            user_id: userId,
            type: 'check_in',
        })
        .select()
        .single()

    if (error) {
        console.error('Check-in error:', error)
        return { success: false, error: error.message }
    }

    // Push 알림 전송 (비동기)
    const { data: user } = await supabase.auth.getUser()
    const userName = user.user?.user_metadata?.full_name || user.user?.email?.split('@')[0] || '팀원'

    // sendPushNotification은 비동기로 실행되지만 여기서 await하지 않아도 됨 (Fire & Forget)
    // 단, Vercel Serverless 함수 실행 시간에는 영향을 줄 수 있으므로 간단히 처리
    import('./push-actions').then(({ sendPushNotification }) => {
        sendPushNotification(
            '출근 알림',
            `${userName}님이 출근했습니다. ☀️`,
            '/'
        ).catch(e => console.error(e))
    })

    revalidatePath('/dashboard')
    return { success: true, data }
}

export async function checkOut(userId: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('attendance')
        .insert({
            user_id: userId,
            type: 'check_out',
        })
        .select()
        .single()

    if (error) {
        console.error('Check-out error:', error)
        return { success: false, error: error.message }
    }

    // Push 알림 전송
    const { data: user } = await supabase.auth.getUser()
    const userName = user.user?.user_metadata?.full_name || user.user?.email?.split('@')[0] || '팀원'

    import('./push-actions').then(({ sendPushNotification }) => {
        sendPushNotification(
            '퇴근 알림',
            `${userName}님이 퇴근했습니다. 👋`,
            '/'
        ).catch(e => console.error(e))
    })

    revalidatePath('/dashboard')
    return { success: true, data }
}

export async function getTodayAttendance(userId: string) {
    const supabase = await createClient()

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: true })

    if (error) {
        console.error('Get attendance error:', error)
        return { success: false, error: error.message, data: [] }
    }

    return { success: true, data: data || [] }
}

export async function getAllTodayAttendance() {
    const supabase = await createClient()

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // 1. 출퇴근 기록 조회
    const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('*')
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false })

    if (attendanceError) {
        console.error('Get all attendance error:', attendanceError)
        return { success: false, error: attendanceError.message, data: [] }
    }

    // 2. 모든 프로필 조회
    const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, theme_color')

    // 3. 수동으로 매핑
    const dataWithProfiles = (attendanceData || []).map(record => {
        const profile = (profilesData || []).find(p => p.id === record.user_id)
        return {
            ...record,
            profiles: profile || null
        }
    })

    return { success: true, data: dataWithProfiles }
}


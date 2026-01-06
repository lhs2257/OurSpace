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


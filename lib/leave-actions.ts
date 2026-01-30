'use server'

import { createClient } from './supabase-server'
import { revalidatePath } from 'next/cache'

export type LeaveType = 'annual' | 'half'

export interface LeaveRecord {
    leave_date: string
    leave_type: LeaveType
    created_at: string
}

export interface LeaveBalance {
    annual_remaining: number
    half_remaining: number
}

/**
 * 연차/반차 신청
 */
export async function applyLeave(leaveDate: string, leaveType: LeaveType) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { success: false, error: '로그인이 필요합니다.' }
    }

    // apply_leave_record 함수 호출
    const { data, error } = await supabase.rpc('apply_leave_record', {
        p_user_id: user.id,
        p_leave_date: leaveDate,
        p_leave_type: leaveType
    })

    if (error) {
        console.error('Apply leave error:', error)
        return { success: false, error: error.message }
    }

    // data는 json 객체
    const result = data as { success: boolean; error?: string; leave_id?: string }

    if (!result.success) {
        return { success: false, error: result.error || '연차/반차 신청에 실패했습니다.' }
    }

    revalidatePath('/attendance/stats')
    return { success: true, data: result }
}

/**
 * 연차/반차 취소
 */
export async function cancelLeave(leaveDate: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { success: false, error: '로그인이 필요합니다.' }
    }

    // cancel_leave_record 함수 호출
    const { data, error } = await supabase.rpc('cancel_leave_record', {
        p_user_id: user.id,
        p_leave_date: leaveDate
    })

    if (error) {
        console.error('Cancel leave error:', error)
        return { success: false, error: error.message }
    }

    const result = data as { success: boolean; error?: string }

    if (!result.success) {
        return { success: false, error: result.error || '연차/반차 취소에 실패했습니다.' }
    }

    revalidatePath('/attendance/stats')
    return { success: true }
}

/**
 * 월별 연차/반차 잔여 개수 조회
 */
export async function getMonthlyLeaveBalance(monthYear: string): Promise<{ success: boolean; data?: LeaveBalance; error?: string }> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { success: false, error: '로그인이 필요합니다.' }
    }

    // get_or_create_leave_balance 함수 호출
    const { data, error } = await supabase.rpc('get_or_create_leave_balance', {
        p_user_id: user.id,
        p_month_year: monthYear
    })

    if (error) {
        console.error('Get leave balance error:', error)
        return { success: false, error: error.message }
    }

    // data는 배열로 반환됨 (RETURNS TABLE)
    if (!data || data.length === 0) {
        return { success: false, error: '잔여 개수를 조회할 수 없습니다.' }
    }

    const balance: LeaveBalance = {
        annual_remaining: data[0].annual_remaining,
        half_remaining: data[0].half_remaining
    }

    return { success: true, data: balance }
}

/**
 * 월별 연차/반차 기록 조회
 */
export async function getMonthlyLeaveRecords(monthYear: string): Promise<{ success: boolean; data?: LeaveRecord[]; error?: string }> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { success: false, error: '로그인이 필요합니다.' }
    }

    // get_leave_records_for_month 함수 호출
    const { data, error } = await supabase.rpc('get_leave_records_for_month', {
        p_user_id: user.id,
        p_month_year: monthYear
    })

    if (error) {
        console.error('Get leave records error:', error)
        return { success: false, error: error.message }
    }

    const records: LeaveRecord[] = data || []

    return { success: true, data: records }
}

/**
 * 특정 날짜의 연차/반차 기록 조회
 */
export async function getLeaveForDate(date: string): Promise<{ success: boolean; data?: LeaveRecord; error?: string }> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { success: false, error: '로그인이 필요합니다.' }
    }

    const { data, error } = await supabase
        .from('leave_records')
        .select('leave_date, leave_type, created_at')
        .eq('user_id', user.id)
        .eq('leave_date', date)
        .single()

    if (error) {
        // 데이터가 없는 경우는 에러가 아님
        if (error.code === 'PGRST116') {
            return { success: true, data: undefined }
        }
        console.error('Get leave for date error:', error)
        return { success: false, error: error.message }
    }

    return { success: true, data: data as LeaveRecord }
}

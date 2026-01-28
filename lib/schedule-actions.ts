'use server'

import { createClient } from './supabase-server'
import { revalidatePath } from 'next/cache'

export interface Schedule {
    id: number
    user_id: string
    title: string
    description?: string
    start_time: string
    end_time: string
    color: string
    shared_with?: string[] // Array of user IDs or 'ALL'
    created_at: string
    profiles?: {
        id: string
        full_name: string
        avatar_url: string
        theme_color?: string
    }
}

export async function getAllProfiles() {
    const supabase = await createClient()

    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, theme_color')
        .order('full_name')

    if (error) {
        console.error('Error fetching profiles:', error)
        return { success: false, error: error.message }
    }

    return { success: true, data: profiles }
}

export async function createSchedule(data: {
    userId: string
    title: string
    description?: string
    startTime: string
    endTime: string
    color?: string
    sharedWith?: string[]
}) {
    const supabase = await createClient()

    const { data: schedule, error } = await supabase
        .from('schedules')
        .insert({
            user_id: data.userId,
            title: data.title,
            description: data.description,
            start_time: data.startTime,
            end_time: data.endTime,
            color: data.color || '#3b82f6',
            shared_with: data.sharedWith || null,
        })
        .select()
        .single()

    if (error) {
        console.error('Create schedule error:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/calendar')
    return { success: true, data: schedule }
}

export async function updateSchedule(id: number, data: {
    title?: string
    description?: string
    startTime?: string
    endTime?: string
    color?: string
    sharedWith?: string[]
}) {
    const supabase = await createClient()

    const updateData: any = {}
    if (data.title !== undefined) updateData.title = data.title
    if (data.description !== undefined) updateData.description = data.description
    if (data.startTime !== undefined) updateData.start_time = data.startTime
    if (data.endTime !== undefined) updateData.end_time = data.endTime
    if (data.color !== undefined) updateData.color = data.color
    if (data.sharedWith !== undefined) updateData.shared_with = data.sharedWith

    const { data: schedule, error } = await supabase
        .from('schedules')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

    if (error) {
        console.error('Update schedule error:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/calendar')
    return { success: true, data: schedule }
}

export async function deleteSchedule(id: number) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('schedules')
        .delete()
        .eq('id', id)

    if (error) {
        console.error('Delete schedule error:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/calendar')
    return { success: true }
}

export async function getSchedules(startDate: string, endDate: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('schedules')
        .select(`
            *,
            profiles (
                id,
                full_name,
                avatar_url
            )
        `)
        .gte('start_time', startDate)
        .lte('start_time', endDate)
        .order('start_time', { ascending: true })

    if (error) {
        console.error('Get schedules error:', error)
        return { success: false, error: error.message, data: [] }
    }

    return { success: true, data: data || [] }
}

export async function getAllSchedules() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('schedules')
        .select(`
            *,
            profiles (
                id,
                full_name,
                avatar_url
            )
        `)
        .order('start_time', { ascending: true })

    if (error) {
        console.error('Error fetching all schedules:', error)
        return { success: false, error: error.message, data: [] }
    }

    return { success: true, data: data || [] }
}

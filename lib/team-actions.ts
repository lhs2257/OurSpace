'use server'

import { createClient } from '@/lib/supabase-server'

export interface TeamMember {
    id: string
    full_name: string
    email: string
    theme_color?: string
    avatar_url?: string
}

/**
 * Get all team members (all profiles in the system)
 */
export async function getTeamMembers() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { success: false, error: 'Not authenticated' }
    }

    const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, theme_color, avatar_url')
        .order('full_name', { ascending: true })

    if (error) {
        return { success: false, error: error.message }
    }

    return { success: true, data: data as TeamMember[] }
}

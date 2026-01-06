'use server'

import { createClient } from './supabase-server'

export async function getCurrentUser() {
    const supabase = await createClient()

    const {
        data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
        return null
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

    return {
        id: session.user.id,
        email: session.user.email,
        fullName: profile?.full_name || session.user.user_metadata?.full_name || '',
        avatarUrl: profile?.avatar_url || '',
        themeColor: profile?.theme_color || 'blue',
    }
}

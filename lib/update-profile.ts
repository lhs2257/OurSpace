'use server'

import { createClient } from './supabase-server'
import { revalidatePath } from 'next/cache'

export async function updateProfile(data: {
    fullName: string
    themeColor: string
}) {
    const supabase = await createClient()

    const {
        data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
        return { success: false, error: 'Unauthorized' }
    }

    const { error } = await supabase
        .from('profiles')
        .update({
            full_name: data.fullName,
            theme_color: data.themeColor,
        })
        .eq('id', session.user.id)

    if (error) {
        console.error('Update profile error:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/dashboard')
    revalidatePath('/', 'layout') // 사이드바 업데이트를 위해 레이아웃 재검증
    return { success: true }
}

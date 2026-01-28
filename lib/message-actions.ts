'use server'

import { createClient } from './supabase-server'
import { revalidatePath } from 'next/cache'

export interface Message {
    id: number
    sender_id: string
    content: string
    attachment_url?: string
    room_id?: string
    created_at: string
    profiles?: {
        id: string
        full_name: string
        avatar_url: string
        theme_color?: string
    }
}

export async function sendMessage(senderId: string, content: string, roomId?: string, attachmentUrl?: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('messages')
        .insert({
            sender_id: senderId,
            content: content,
            room_id: roomId,
            attachment_url: attachmentUrl,
        })
        .select()
        .single()

    if (error) {
        console.error('Send message error:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/chat')
    return { success: true, data }
}

export async function getMessages() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('messages')
        .select(`
            *,
            profiles (
                id,
                full_name,
                avatar_url,
                theme_color
            )
        `)
        .order('created_at', { ascending: true })

    if (error) {
        console.error('Get messages error:', error)
        return { success: false, error: error.message, data: [] }
    }

    return { success: true, data: data || [] }
}

/**
 * Get messages for a specific room
 */
export async function getRoomMessages(roomId: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('messages')
        .select(`
            *,
            profiles (
                id,
                full_name,
                avatar_url,
                theme_color
            )
        `)
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })

    if (error) {
        console.error('Get room messages error:', error)
        return { success: false, error: error.message, data: [] }
    }

    return { success: true, data: data || [] }
}

export async function uploadFile(file: File, userId: string) {
    const supabase = await createClient()

    // 파일명 생성 (중복 방지를 위해 타임스탬프 추가)
    const timestamp = Date.now()
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}/${timestamp}.${fileExt}`

    const { data, error } = await supabase.storage
        .from('chat-files')
        .upload(fileName, file)

    if (error) {
        console.error('Upload file error:', error)
        return { success: false, error: error.message }
    }

    // 공개 URL 생성
    const { data: { publicUrl } } = supabase.storage
        .from('chat-files')
        .getPublicUrl(fileName)

    return { success: true, data: { path: data.path, url: publicUrl } }
}

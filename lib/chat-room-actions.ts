'use server'

import { createClient } from '@/lib/supabase-server'

export interface ChatRoom {
    id: string
    name: string
    created_by: string
    created_at: string
}

export interface ChatRoomMember {
    id: string
    room_id: string
    user_id: string
    joined_at: string
    profiles?: {
        id: string
        full_name: string
        theme_color?: string
    }
}

/**
 * Get all chat rooms the current user is a member of
 */
export async function getChatRooms() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { success: false, error: 'Not authenticated' }
    }

    const { data, error } = await supabase
        .from('chat_room_members')
        .select(`
            room_id,
            chat_rooms (
                id,
                name,
                created_by,
                created_at
            )
        `)
        .eq('user_id', user.id)
        .order('joined_at', { ascending: false })

    if (error) {
        return { success: false, error: error.message }
    }

    // Extract chat_rooms from the nested structure
    const rooms = data?.map((item: any) => item.chat_rooms).filter(Boolean) as unknown as ChatRoom[]

    return { success: true, data: rooms }
}

/**
 * Create a new chat room and add members
 */
export async function createChatRoom(name: string, memberIds: string[]) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { success: false, error: 'Not authenticated' }
    }

    // Create the chat room
    const { data: room, error: roomError } = await supabase
        .from('chat_rooms')
        .insert({
            name,
            created_by: user.id
        })
        .select()
        .single()

    if (roomError || !room) {
        return { success: false, error: roomError?.message || 'Failed to create room' }
    }

    // Add creator as a member
    const allMemberIds = [...new Set([user.id, ...memberIds])]

    const membersToInsert = allMemberIds.map(userId => ({
        room_id: room.id,
        user_id: userId
    }))

    const { error: membersError } = await supabase
        .from('chat_room_members')
        .insert(membersToInsert)

    if (membersError) {
        // Rollback: delete the room if adding members failed
        await supabase.from('chat_rooms').delete().eq('id', room.id)
        return { success: false, error: membersError.message }
    }

    return { success: true, data: room }
}

/**
 * Get all members of a specific chat room
 */
export async function getChatRoomMembers(roomId: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('chat_room_members')
        .select(`
            id,
            room_id,
            user_id,
            joined_at,
            profiles (
                id,
                full_name,
                theme_color
            )
        `)
        .eq('room_id', roomId)
        .order('joined_at', { ascending: true })

    if (error) {
        return { success: false, error: error.message }
    }

    return { success: true, data: data as unknown as ChatRoomMember[] }
}

/**
 * Add a member to a chat room
 */
export async function addMemberToRoom(roomId: string, userId: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('chat_room_members')
        .insert({
            room_id: roomId,
            user_id: userId
        })

    if (error) {
        return { success: false, error: error.message }
    }

    return { success: true }
}

/**
 * Remove a member from a chat room
 */
export async function removeMemberFromRoom(roomId: string, userId: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('chat_room_members')
        .delete()
        .eq('room_id', roomId)
        .eq('user_id', userId)

    if (error) {
        return { success: false, error: error.message }
    }

    return { success: true }
}

'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, Paperclip, Loader2, ArrowLeft, Plus } from 'lucide-react'
import ChatMessage from '@/components/ChatMessage'
import TeamMemberList from '@/components/TeamMemberList'
import ChatRoomList from '@/components/ChatRoomList'
import CreateRoomModal from '@/components/CreateRoomModal'
import { getRoomMessages, sendMessage, uploadFile, Message } from '@/lib/message-actions'
import { getChatRooms, createChatRoom, ChatRoom } from '@/lib/chat-room-actions'
import { getTeamMembers, TeamMember } from '@/lib/team-actions'
import { createClient } from '@/lib/supabase-client'

interface ChatPageClientProps {
    userId: string
}

export default function ChatPageClient({ userId }: ChatPageClientProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const roomId = searchParams.get('room')

    // State
    const [messages, setMessages] = useState<Message[]>([])
    const [newMessage, setNewMessage] = useState('')
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [rooms, setRooms] = useState<ChatRoom[]>([])
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
    const [currentRoom, setCurrentRoom] = useState<ChatRoom | null>(null)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

    const messagesEndRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Load lobby data (rooms and team members)
    useEffect(() => {
        loadLobbyData()
    }, [])

    // Load room messages when room changes
    useEffect(() => {
        if (roomId) {
            loadRoomData(roomId)
            setupRealtimeSubscription(roomId)
        } else {
            setCurrentRoom(null)
            setMessages([])
        }

        return () => {
            // Cleanup realtime subscription
            const supabase = createClient()
            supabase.removeAllChannels()
        }
    }, [roomId])

    // Auto-scroll when new messages arrive
    useEffect(() => {
        scrollToBottom()
    }, [messages])

    async function loadLobbyData() {
        const [roomsResult, membersResult] = await Promise.all([
            getChatRooms(),
            getTeamMembers()
        ])

        if (roomsResult.success && roomsResult.data) {
            setRooms(roomsResult.data)
        }

        if (membersResult.success && membersResult.data) {
            setTeamMembers(membersResult.data)
        }
    }

    async function loadRoomData(roomId: string) {
        const result = await getRoomMessages(roomId)
        if (result.success && result.data) {
            setMessages(result.data as Message[])
        }

        // Find current room info
        const room = rooms.find(r => r.id === roomId)
        if (room) {
            setCurrentRoom(room)
        } else {
            // Reload rooms if not found (might be a new room)
            const roomsResult = await getChatRooms()
            if (roomsResult.success && roomsResult.data) {
                setRooms(roomsResult.data)
                const foundRoom = roomsResult.data.find(r => r.id === roomId)
                setCurrentRoom(foundRoom || null)
            }
        }
    }

    function setupRealtimeSubscription(roomId: string) {
        const supabase = createClient()

        const channel = supabase
            .channel(`room-${roomId}-messages`)
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
                async (payload) => {
                    // Fetch the new message with profile data
                    const { data } = await supabase
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
                        .eq('id', payload.new.id)
                        .single()

                    if (data) {
                        setMessages((prev) => [...prev, data as Message])
                    }
                }
            )
            .subscribe()
    }

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newMessage.trim() || !roomId) return

        setLoading(true)
        setError(null)
        const result = await sendMessage(userId, newMessage, roomId)
        if (result.success) {
            setNewMessage('')
        } else {
            setError(result.error || '메시지 전송에 실패했습니다.')
        }
        setLoading(false)
    }

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !roomId) return

        if (file.size > 5 * 1024 * 1024) {
            alert('파일 크기는 5MB 이하여야 합니다.')
            return
        }

        setUploading(true)
        const uploadResult = await uploadFile(file, userId)

        if (uploadResult.success && uploadResult.data) {
            const fileName = file.name
            const messageResult = await sendMessage(userId, fileName, roomId, uploadResult.data.url)

            if (messageResult.success && fileInputRef.current) {
                fileInputRef.current.value = ''
            }
        } else {
            alert('파일 업로드에 실패했습니다.')
        }
        setUploading(false)
    }

    const handleRoomClick = (roomId: string) => {
        router.push(`/chat?room=${roomId}`)
    }

    const handleBackToLobby = () => {
        router.push('/chat')
    }

    const handleCreateRoom = async (roomName: string, memberIds: string[]) => {
        const result = await createChatRoom(roomName, memberIds)
        if (result.success && result.data) {
            // Reload rooms and navigate to new room
            await loadLobbyData()
            router.push(`/chat?room=${result.data.id}`)
        } else {
            alert(result.error || '채팅방 생성에 실패했습니다.')
        }
    }

    // Render lobby view (team members + room list)
    if (!roomId) {
        return (
            <div className="h-[calc(100vh-4rem)] flex flex-col">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-900">채팅</h1>
                    <p className="mt-2 text-gray-600">팀원들과 실시간으로 소통하세요</p>
                </div>

                {/* Lobby Layout */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
                    {/* Left: Team Members (1/3) */}
                    <Card className="lg:col-span-1 overflow-hidden flex flex-col">
                        <TeamMemberList members={teamMembers} />
                    </Card>

                    {/* Right: Chat Rooms (2/3) */}
                    <Card className="lg:col-span-2 overflow-hidden flex flex-col">
                        <div className="p-4 border-b flex items-center justify-between">
                            <div>
                                <h2 className="font-semibold text-lg text-gray-900">채팅방 목록</h2>
                                <p className="text-sm text-gray-500 mt-1">참여중인 채팅방</p>
                            </div>
                            <Button onClick={() => setIsCreateModalOpen(true)}>
                                <Plus className="h-4 w-4 mr-2" />
                                새 채팅방
                            </Button>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <ChatRoomList rooms={rooms} onRoomClick={handleRoomClick} />
                        </div>
                    </Card>
                </div>

                {/* Create Room Modal */}
                <CreateRoomModal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    members={teamMembers}
                    currentUserId={userId}
                    onCreate={handleCreateRoom}
                />
            </div>
        )
    }

    // Render room view (full chat interface)
    return (
        <div className="h-[calc(100vh-4rem)] flex flex-col">
            {/* Header with Back Button */}
            <div className="mb-6 flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={handleBackToLobby}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">{currentRoom?.name || '채팅방'}</h1>
                    <p className="mt-1 text-gray-600">실시간 메시징</p>
                </div>
            </div>

            {/* Chat Container */}
            <Card className="flex-1 flex flex-col overflow-hidden">
                {/* Messages */}
                <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
                    {messages.length > 0 ? (
                        <>
                            {messages.map((message) => (
                                <ChatMessage
                                    key={message.id}
                                    message={message}
                                    isOwn={message.sender_id === userId}
                                />
                            ))}
                            <div ref={messagesEndRef} />
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                            <p>메시지가 없습니다. 대화를 시작해보세요!</p>
                        </div>
                    )}
                </CardContent>

                {/* Input Area */}
                <div className="border-t p-4">
                    {error && (
                        <div className="mb-3 rounded-md bg-red-50 p-3">
                            <p className="text-sm text-red-800">{error}</p>
                        </div>
                    )}
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                        {/* File Upload Button */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            accept="image/*,.pdf,.doc,.docx"
                            onChange={handleFileSelect}
                        />
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                        >
                            {uploading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <Paperclip className="h-5 w-5" />
                            )}
                        </Button>

                        {/* Message Input */}
                        <Input
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="메시지를 입력하세요..."
                            disabled={loading || uploading}
                            className="flex-1"
                        />

                        {/* Send Button */}
                        <Button type="submit" disabled={loading || uploading || !newMessage.trim()}>
                            {loading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <Send className="h-5 w-5" />
                            )}
                        </Button>
                    </form>
                </div>
            </Card>
        </div>
    )
}

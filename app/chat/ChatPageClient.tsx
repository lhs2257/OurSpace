'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, Paperclip, Loader2 } from 'lucide-react'
import ChatMessage from '@/components/ChatMessage'
import { getMessages, sendMessage, uploadFile, Message } from '@/lib/message-actions'
import { createClient } from '@/lib/supabase-client'

interface ChatPageClientProps {
    userId: string
}

export default function ChatPageClient({ userId }: ChatPageClientProps) {
    const [messages, setMessages] = useState<Message[]>([])
    const [newMessage, setNewMessage] = useState('')
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        loadMessages()

        // Realtime 구독 설정
        const supabase = createClient()
        const channel = supabase
            .channel('messages-changes')
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages' },
                async (payload) => {
                    // 새 메시지를 프로필 정보와 함께 조회
                    const { data } = await supabase
                        .from('messages')
                        .select(`
                            *,
                            profiles (
                                id,
                                full_name,
                                avatar_url
                            )
                        `)
                        .eq('id', payload.new.id)
                        .single()

                    if (data) {
                        setMessages((prevMessages) => [...prevMessages, data as Message])
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    useEffect(() => {
        // 새 메시지가 있을 때 자동 스크롤
        scrollToBottom()
    }, [messages])

    async function loadMessages() {
        const result = await getMessages()
        if (result.success && result.data) {
            setMessages(result.data as Message[])
        }
    }

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newMessage.trim()) return

        setLoading(true)
        setError(null)
        const result = await sendMessage(userId, newMessage)
        if (result.success) {
            setNewMessage('')
            // 메시지 전송 후 스크롤 (실시간 구독이 메시지를 추가하면 자동 스크롤됨)
        } else {
            setError(result.error || '메시지 전송에 실패했습니다.')
        }
        setLoading(false)
    }

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // 파일 크기 제한 (5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('파일 크기는 5MB 이하여야 합니다.')
            return
        }

        setUploading(true)
        const uploadResult = await uploadFile(file, userId)

        if (uploadResult.success && uploadResult.data) {
            // 파일 업로드 성공 시 메시지 전송
            const fileName = file.name
            const messageResult = await sendMessage(
                userId,
                fileName,
                uploadResult.data.url
            )

            if (messageResult.success) {
                // 파일 입력 초기화
                if (fileInputRef.current) {
                    fileInputRef.current.value = ''
                }
            }
        } else {
            alert('파일 업로드에 실패했습니다. Supabase Storage 버킷을 확인해주세요.')
        }
        setUploading(false)
    }

    return (
        <div className="h-[calc(100vh-4rem)] flex flex-col">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900">채팅</h1>
                <p className="mt-2 text-gray-600">팀원들과 실시간으로 소통하세요</p>
            </div>

            {/* Chat Container */}
            <Card className="flex-1 flex flex-col">
                <CardHeader className="border-b">
                    <CardTitle>팀 채팅</CardTitle>
                    <CardDescription>실시간 메시징 및 파일 공유</CardDescription>
                </CardHeader>

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

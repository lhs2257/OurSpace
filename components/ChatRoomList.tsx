'use client'

import { ChatRoom } from '@/lib/chat-room-actions'
import { MessageSquare } from 'lucide-react'

interface ChatRoomListProps {
    rooms: ChatRoom[]
    onRoomClick: (roomId: string) => void
}

export default function ChatRoomList({ rooms, onRoomClick }: ChatRoomListProps) {
    return (
        <div className="h-full flex flex-col">
            <div className="p-4 border-b">
                <h2 className="font-semibold text-lg text-gray-900">채팅방</h2>
                <p className="text-sm text-gray-500 mt-1">{rooms.length}개의 채팅방</p>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {rooms.length > 0 ? (
                    rooms.map((room) => (
                        <button
                            key={room.id}
                            onClick={() => onRoomClick(room.id)}
                            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left border border-gray-200"
                        >
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white flex-shrink-0">
                                <MessageSquare className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                    {room.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {new Date(room.created_at).toLocaleDateString('ko-KR')}
                                </p>
                            </div>
                        </button>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8 text-center">
                        <MessageSquare className="h-12 w-12 mb-3 text-gray-300" />
                        <p className="text-sm">채팅방이 없습니다.</p>
                        <p className="text-xs mt-1">새 채팅방을 만들어보세요!</p>
                    </div>
                )}
            </div>
        </div>
    )
}

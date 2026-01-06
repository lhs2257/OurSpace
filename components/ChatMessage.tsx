import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Message } from '@/lib/message-actions'
import { FileImage } from 'lucide-react'

interface ChatMessageProps {
    message: Message
    isOwn: boolean
}

export default function ChatMessage({ message, isOwn }: ChatMessageProps) {
    return (
        <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}>
            <div className={`flex gap-2 max-w-[70%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar */}
                {!isOwn && (
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex-shrink-0" />
                )}

                {/* Message Content */}
                <div className="flex flex-col gap-1">
                    {!isOwn && message.profiles && (
                        <span className="text-xs text-gray-600 px-3">{message.profiles.full_name || '사용자'}</span>
                    )}

                    <div
                        className={`rounded-2xl px-4 py-2 ${isOwn
                                ? 'bg-blue-600 text-white rounded-tr-sm'
                                : 'bg-gray-100 text-gray-900 rounded-tl-sm'
                            }`}
                    >
                        {/* 첨부 파일 (이미지) */}
                        {message.attachment_url && (
                            <div className="mb-2">
                                {message.attachment_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                    <img
                                        src={message.attachment_url}
                                        alt="첨부 이미지"
                                        className="rounded-lg max-w-full h-auto max-h-64 object-cover"
                                    />
                                ) : (
                                    <a
                                        href={message.attachment_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`flex items-center gap-2 ${isOwn ? 'text-white hover:text-blue-100' : 'text-blue-600 hover:text-blue-700'
                                            }`}
                                    >
                                        <FileImage className="h-5 w-5" />
                                        <span className="text-sm underline">첨부 파일</span>
                                    </a>
                                )}
                            </div>
                        )}

                        {/* 메시지 텍스트 */}
                        <p className="whitespace-pre-wrap break-words">{message.content}</p>
                    </div>

                    {/* 시간 */}
                    <span className={`text-xs text-gray-500 px-3 ${isOwn ? 'text-right' : 'text-left'}`}>
                        {format(new Date(message.created_at), 'a h:mm', { locale: ko })}
                    </span>
                </div>
            </div>
        </div>
    )
}

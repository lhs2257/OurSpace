import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { DailyLog } from '@/app/daily-log/page'
import { Edit2, Trash2 } from 'lucide-react'
interface DailyLogCardProps {
    log: DailyLog
    currentUserId: string | null
    onEdit: () => void
    onDelete: () => void
}

export default function DailyLogCard({ log, currentUserId, onEdit, onDelete }: DailyLogCardProps) {
    // Generate avatar initial
    const avatarInitial = log.profiles?.full_name
        ? log.profiles.full_name[0].toUpperCase()
        : 'U'

    // You can also randomly pick colors or use themeColor if logic exists
    const avatarColor = "bg-blue-500 text-white"

    const isOwner = currentUserId === log.user_id

    const handleDelete = () => {
        if (window.confirm('정말로 이 일지를 삭제하시겠습니까?')) {
            onDelete()
        }
    }

    return (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group flex flex-col h-full">
            {/* Header: User Info & Time */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/50">
                <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full ${avatarColor} flex items-center justify-center font-semibold text-sm shadow-sm`}>
                        {avatarInitial}
                    </div>
                    <span className="font-medium text-sm text-gray-900">
                        {log.profiles?.full_name || 'Alumni'}
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500" title={new Date(log.created_at).toLocaleString()}>
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: ko })}
                    </span>
                    {isOwner && (
                        <div className="flex items-center gap-1 border-l border-gray-200 pl-3">
                            <button
                                onClick={onEdit}
                                className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                                title="수정"
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                                onClick={handleDelete}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="삭제"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Content: Title & Body */}
            <div className="p-5 flex-1 flex flex-col gap-3">
                <h4 className="text-base font-semibold text-gray-900 line-clamp-2">
                    {log.title}
                </h4>
                <div className="relative flex-1">
                    <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                        {log.content}
                    </p>
                </div>
            </div>
        </div>
    )
}

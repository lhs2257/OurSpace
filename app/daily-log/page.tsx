'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import CreateDailyLogModal from '@/components/CreateDailyLogModal'
import DailyLogCard from '@/components/DailyLogCard'

export interface DailyLog {
    id: string
    user_id: string
    date: string
    title: string
    content: string
    created_at: string
    updated_at: string
    profiles: {
        full_name: string
        avatar_url: string | null
    }
}

export default function DailyLogPage() {
    const [logs, setLogs] = useState<DailyLog[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [editingLog, setEditingLog] = useState<DailyLog | null>(null)
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)
    const supabase = createClient()

    const fetchLogs = async () => {
        setIsLoading(true)
        try {
            const { data, error } = await supabase
                .from('daily_logs')
                .select(`
                    id,
                    user_id,
                    date,
                    title,
                    content,
                    created_at,
                    updated_at,
                    profiles:user_id (full_name, avatar_url)
                `)
                .order('date', { ascending: false })
                .order('created_at', { ascending: false })

            if (error) throw error
            setLogs((data as unknown) as DailyLog[] || [])
        } catch (error) {
            console.error('Error fetching logs:', error)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                setCurrentUserId(user.id)
            }
        }
        fetchUser()
        fetchLogs()

        // Real-time subscription setup
        const channel = supabase
            .channel('public:daily_logs')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'daily_logs' },
                (payload) => {
                    // Refresh data entirely to ensure profile info is grabbed correctly easily
                    fetchLogs();
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    const handleDeleteLog = async (id: string) => {
        try {
            const { error } = await supabase.from('daily_logs').delete().eq('id', id)
            if (error) throw error
            fetchLogs()
        } catch (error) {
            console.error('Error deleting log:', error)
            alert('일지 삭제 중 오류가 발생했습니다.')
        }
    }

    // Group logs by date
    const groupedLogs = logs.reduce((acc, log) => {
        const date = log.date
        if (!acc[date]) {
            acc[date] = []
        }
        acc[date].push(log)
        return acc
    }, {} as Record<string, DailyLog[]>)

    return (
        <div className="flex-1 bg-gray-50/50 min-h-screen">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">팀 일지작성</h1>
                        <p className="mt-2 text-sm text-gray-500 max-w-2xl">
                            팀원들과 매일의 업무 내역, 발견한 점, 또는 공유하고 싶은 내용을 자유롭게 남겨주세요.
                        </p>
                    </div>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 transition-all active:scale-95"
                    >
                        <Plus className="-ml-0.5 h-5 w-5" aria-hidden="true" />
                        일지 추가
                    </button>
                </div>

                {/* Content Section */}
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
                        <Plus className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-4 text-sm font-semibold text-gray-900">작성된 일지가 없습니다</h3>
                        <p className="mt-1 text-sm text-gray-500">첫 번째 일지를 작성해 팀원들과 공유해보세요!</p>
                        <div className="mt-6">
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="inline-flex items-center rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
                            >
                                <Plus className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
                                일지 쓰기
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-10">
                        {Object.entries(groupedLogs).map(([date, dateLogs]) => (
                            <div key={date} className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-900 sticky top-0 py-2 z-10">
                                    {format(new Date(date), 'yyyy년 MM월 dd일')}
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {dateLogs.map((log) => (
                                        <DailyLogCard
                                            key={log.id}
                                            log={log}
                                            currentUserId={currentUserId}
                                            onEdit={() => {
                                                setEditingLog(log)
                                                setIsCreateModalOpen(true)
                                            }}
                                            onDelete={() => handleDeleteLog(log.id)}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <CreateDailyLogModal
                isOpen={isCreateModalOpen}
                onClose={() => {
                    setIsCreateModalOpen(false)
                    setTimeout(() => setEditingLog(null), 200) // Clear log after animation string closed
                }}
                onSuccess={() => fetchLogs()}
                logToEdit={editingLog}
            />
        </div>
    )
}

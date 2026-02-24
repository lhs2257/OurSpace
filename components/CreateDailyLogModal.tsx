'use client'

import { useState, useEffect } from 'react'
import { Dialog } from '@headlessui/react'
import { format } from 'date-fns'
import { Plus, X } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { DailyLog } from '@/app/daily-log/page'

interface CreateDailyLogModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    logToEdit?: DailyLog | null
}

export default function CreateDailyLogModal({ isOpen, onClose, onSuccess, logToEdit }: CreateDailyLogModalProps) {
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [title, setTitle] = useState('')
    const [content, setContent] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const supabase = createClient()

    // Reset or populate form when opened
    useEffect(() => {
        if (isOpen) {
            if (logToEdit) {
                setDate(logToEdit.date)
                setTitle(logToEdit.title)
                setContent(logToEdit.content)
            } else {
                setDate(format(new Date(), 'yyyy-MM-dd'))
                setTitle('')
                setContent('')
            }
            setError(null)
        }
    }, [isOpen, logToEdit])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (!title.trim() || !content.trim()) {
            setError('제목과 내용을 모두 입력해주세요.')
            return
        }

        setIsSubmitting(true)

        try {
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                throw new Error('로그인이 필요합니다.')
            }

            if (logToEdit) {
                const { error: updateError } = await supabase
                    .from('daily_logs')
                    .update({
                        date,
                        title: title.trim(),
                        content: content.trim()
                    })
                    .eq('id', logToEdit.id)

                if (updateError) throw updateError
            } else {
                const { error: insertError } = await supabase
                    .from('daily_logs')
                    .insert([
                        {
                            user_id: user.id,
                            date,
                            title: title.trim(),
                            content: content.trim()
                        }
                    ])

                if (insertError) throw insertError
            }

            onSuccess()
            onClose()
        } catch (err: any) {
            setError(err.message || '일지 등록에 실패했습니다.')
            console.error('Error creating daily log:', err)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
            {/* The backdrop, rendered as a fixed sibling to the panel container */}
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />

            {/* Full-screen wrapper for centering */}
            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="mx-auto max-w-2xl w-full bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="flex justify-between items-center p-6 border-b border-gray-100 shrink-0">
                        <Dialog.Title className="text-xl font-semibold text-gray-900">
                            {logToEdit ? '일지 수정하기' : '일지 작성하기'}
                        </Dialog.Title>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-500 transition-colors p-2 hover:bg-gray-100 rounded-full"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="p-6 overflow-y-auto">
                        {error && (
                            <div className="mb-4 rounded-md bg-red-50 p-4">
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        )}

                        <form id="create-log-form" onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label htmlFor="date" className="block text-sm font-medium leading-6 text-gray-900">
                                    날짜
                                </label>
                                <div className="mt-2">
                                    <input
                                        type="date"
                                        id="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-900 sm:text-sm sm:leading-6 px-3"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="title" className="block text-sm font-medium leading-6 text-gray-900">
                                    제목
                                </label>
                                <div className="mt-2">
                                    <input
                                        type="text"
                                        id="title"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="오늘의 주요 업무나 이슈를 적어주세요."
                                        className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-900 sm:text-sm sm:leading-6 px-3"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="content" className="block text-sm font-medium leading-6 text-gray-900">
                                    내용
                                </label>
                                <div className="mt-2">
                                    <textarea
                                        id="content"
                                        rows={8}
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                        placeholder="상세 내용을 자유롭게 적어주세요."
                                        className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-900 sm:text-sm sm:leading-6 px-3 resize-none"
                                        required
                                    />
                                </div>
                            </div>
                        </form>
                    </div>

                    <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 shrink-0 rounded-b-2xl border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200 transition-colors"
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            form="create-log-form"
                            disabled={isSubmitting}
                            className={`rounded-xl px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 ${isSubmitting
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-gray-900 hover:bg-gray-800 hover:shadow-md'
                                }`}
                        >
                            {isSubmitting ? (logToEdit ? '수정 중...' : '업로드 중...') : (logToEdit ? '수정 완료' : '업로드')}
                        </button>
                    </div>
                </Dialog.Panel>
            </div>
        </Dialog>
    )
}

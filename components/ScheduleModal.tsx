'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createSchedule, updateSchedule, deleteSchedule, Schedule, getAllProfiles } from '@/lib/schedule-actions'
import { format } from 'date-fns'
import { Check, User, Users } from 'lucide-react'

interface ScheduleModalProps {
    isOpen: boolean
    onClose: () => void
    selectedDate: Date | null
    userId: string
    userThemeColor?: string
    schedule?: Schedule | null
    onSuccess: () => void
    readOnly?: boolean
}

const colorOptions = [
    { value: '#3b82f6', label: '파랑', themeId: 'blue' },
    { value: '#10b981', label: '초록', themeId: 'green' },
    { value: '#f59e0b', label: '주황', themeId: 'orange' },
    { value: '#ef4444', label: '빨강', themeId: 'red' },
    { value: '#8b5cf6', label: '보라', themeId: 'purple' },
    { value: '#ec4899', label: '핑크', themeId: 'rose' },
]

export default function ScheduleModal({ isOpen, onClose, selectedDate, userId, userThemeColor, schedule, onSuccess, readOnly = false }: ScheduleModalProps) {
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [startTime, setStartTime] = useState('')
    const [endTime, setEndTime] = useState('')
    const [color, setColor] = useState('#3b82f6')
    const [profiles, setProfiles] = useState<any[]>([])
    const [sharedWith, setSharedWith] = useState<string[]>(['ALL']) // Default to ALL
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        loadProfiles()
    }, [])

    async function loadProfiles() {
        const result = await getAllProfiles()
        if (result.success && result.data) {
            setProfiles(result.data)
        }
    }

    useEffect(() => {
        if (schedule) {
            setTitle(schedule.title)
            setDescription(schedule.description || '')
            setStartTime(format(new Date(schedule.start_time), "yyyy-MM-dd'T'HH:mm"))
            setEndTime(format(new Date(schedule.end_time), "yyyy-MM-dd'T'HH:mm"))
            setColor(schedule.color)
            setSharedWith(schedule.shared_with || ['ALL'])
        } else if (selectedDate) {
            const dateStr = format(selectedDate, 'yyyy-MM-dd')
            setTitle('')
            setDescription('')
            setStartTime(`${dateStr}T09:00`)
            setEndTime(`${dateStr}T10:00`)
            setSharedWith(['ALL'])

            // 사용자 테마 색상에 맞는 색상 선택
            if (userThemeColor) {
                const matchedColor = colorOptions.find(c => c.themeId === userThemeColor || c.themeId === 'indigo') // indigo 매핑
                if (matchedColor) {
                    setColor(matchedColor.value)
                } else {
                    setColor('#3b82f6')
                }
            } else {
                setColor('#3b82f6')
            }
        }
        setError(null) // Reset error when modal opens
    }, [schedule, selectedDate, userThemeColor])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            if (schedule) {
                // 수정
                const result = await updateSchedule(schedule.id, {
                    title,
                    description,
                    startTime,
                    endTime,
                    color,
                    sharedWith,
                })
                if (result.success) {
                    onSuccess()
                    onClose()
                } else {
                    setError(result.error || '일정 수정에 실패했습니다.')
                }
            } else {
                // 생성
                const result = await createSchedule({
                    userId,
                    title,
                    description,
                    startTime,
                    endTime,
                    color,
                    sharedWith,
                })
                if (result.success) {
                    onSuccess()
                    onClose()
                } else {
                    setError(result.error || '일정 생성에 실패했습니다.')
                }
            }
        } catch (error) {
            console.error('Schedule save error:', error)
            setError('알 수 없는 오류가 발생했습니다.')
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!schedule) return
        setLoading(true)

        try {
            const result = await deleteSchedule(schedule.id)
            if (result.success) {
                onSuccess()
                onClose()
            }
        } catch (error) {
            console.error('Schedule delete error:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{schedule ? '일정 수정' : '일정 추가'}</DialogTitle>
                    <DialogDescription>
                        {schedule ? '일정 정보를 수정하세요.' : '새로운 일정을 추가하세요.'}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">제목</Label>
                            <Input
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="회의, 미팅 등"
                                required
                                disabled={readOnly}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">설명 (선택)</Label>
                            <Textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="일정에 대한 추가 정보"
                                rows={3}
                                disabled={readOnly}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="startTime">시작 시간</Label>
                                <Input
                                    id="startTime"
                                    type="datetime-local"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    required
                                    disabled={readOnly}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="endTime">종료 시간</Label>
                                <Input
                                    id="endTime"
                                    type="datetime-local"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    required
                                    disabled={readOnly}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>색상</Label>
                            <div className="flex gap-2">
                                {colorOptions.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        className={`h-8 w-8 rounded-full border-2 transition-all ${color === option.value ? 'border-gray-900 scale-110' : 'border-gray-300'
                                            }`}
                                        style={{ backgroundColor: option.value }}
                                        onClick={() => !readOnly && setColor(option.value)}
                                        title={option.label}
                                        disabled={readOnly}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label>작업자</Label>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant={sharedWith.includes('ALL') ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setSharedWith(['ALL'])}
                                className="flex-1"
                                disabled={readOnly}
                            >
                                <Users className="w-4 h-4 mr-2" />
                                전체 공개
                            </Button>
                            <Button
                                type="button"
                                variant={!sharedWith.includes('ALL') ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setSharedWith(sharedWith.includes('ALL') ? [] : sharedWith)}
                                className="flex-1"
                                disabled={readOnly}
                            >
                                <User className="w-4 h-4 mr-2" />
                                지정 공개
                            </Button>
                        </div>

                        {!sharedWith.includes('ALL') && (
                            <div className="border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto bg-gray-50">
                                {profiles.length > 0 ? (
                                    profiles.map((profile) => (
                                        <div key={profile.id} className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                id={`user-${profile.id}`}
                                                checked={sharedWith.includes(profile.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSharedWith([...sharedWith, profile.id])
                                                    } else {
                                                        setSharedWith(sharedWith.filter(id => id !== profile.id))
                                                    }
                                                }}
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                                                disabled={readOnly}
                                            />
                                            <Label htmlFor={`user-${profile.id}`} className="text-sm font-normal cursor-pointer flex-1">
                                                {profile.full_name}
                                            </Label>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-gray-500 text-center py-2">팀원이 없습니다.</p>
                                )}
                            </div>
                        )}
                    </div>
                    {error && (
                        <div className="rounded-md bg-red-50 p-3">
                            <p className="text-sm text-red-800">{error}</p>
                        </div>
                    )}
                    <DialogFooter>
                        {schedule && !readOnly && (
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={handleDelete}
                                disabled={loading}
                            >
                                삭제
                            </Button>
                        )}
                        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                            {readOnly ? '닫기' : '취소'}
                        </Button>
                        {!readOnly && (
                            <Button type="submit" disabled={loading}>
                                {loading ? '저장 중...' : '저장'}
                            </Button>
                        )}
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog >
    )
}

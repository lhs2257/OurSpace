'use client'

import { useState, useEffect } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Clock } from 'lucide-react'
import { format, startOfMonth, endOfMonth, isSameDay } from 'date-fns'
import { ko } from 'date-fns/locale'
import ScheduleModal from '@/components/ScheduleModal'
import { getAllSchedules, Schedule } from '@/lib/schedule-actions'
import { createClient } from '@/lib/supabase-client'

// TODO: Replace with actual user ID from auth
const MOCK_USER_ID = '00000000-0000-0000-0000-000000000000'

export default function CalendarPage() {
    const [date, setDate] = useState<Date | undefined>(new Date())
    const [schedules, setSchedules] = useState<Schedule[]>([])
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadSchedules()

        // Realtime 구독 설정
        const supabase = createClient()
        const channel = supabase
            .channel('schedules-changes')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'schedules' },
                () => {
                    loadSchedules()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    async function loadSchedules() {
        setLoading(true)
        const result = await getAllSchedules()
        if (result.success && result.data) {
            setSchedules(result.data as Schedule[])
        }
        setLoading(false)
    }

    const selectedDaySchedules = schedules.filter(schedule =>
        date && isSameDay(new Date(schedule.start_time), date)
    )

    const datesWithSchedules = schedules.map(s => new Date(s.start_time))

    const handleAddSchedule = () => {
        setSelectedSchedule(null)
        setIsModalOpen(true)
    }

    const handleEditSchedule = (schedule: Schedule) => {
        setSelectedSchedule(schedule)
        setIsModalOpen(true)
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">캘린더</h1>
                    <p className="mt-2 text-gray-600">팀원들과 일정을 공유하세요</p>
                </div>
                <Button onClick={handleAddSchedule}>
                    <Plus className="mr-2 h-4 w-4" />
                    일정 추가
                </Button>
            </div>

            {/* Calendar Grid */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Calendar */}
                <Card>
                    <CardHeader>
                        <CardTitle>월간 캘린더</CardTitle>
                        <CardDescription>날짜를 선택하여 일정을 확인하세요</CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            locale={ko}
                            className="rounded-md border"
                            modifiers={{
                                scheduled: datesWithSchedules
                            }}
                            modifiersClassNames={{
                                scheduled: 'bg-blue-100 font-bold'
                            }}
                        />
                    </CardContent>
                </Card>

                {/* Schedule List */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5" />
                            {date ? format(date, 'M월 d일 일정', { locale: ko }) : '일정'}
                        </CardTitle>
                        <CardDescription>
                            {selectedDaySchedules.length > 0
                                ? `${selectedDaySchedules.length}개의 일정이 있습니다`
                                : '일정이 없습니다'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <p className="text-center text-gray-500 py-8">로딩 중...</p>
                        ) : selectedDaySchedules.length > 0 ? (
                            <div className="space-y-3">
                                {selectedDaySchedules.map((schedule) => (
                                    <button
                                        key={schedule.id}
                                        onClick={() => handleEditSchedule(schedule)}
                                        className="w-full text-left p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div
                                                className="h-10 w-1 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: schedule.color }}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-gray-900">{schedule.title}</p>
                                                {schedule.description && (
                                                    <p className="text-sm text-gray-600 mt-1">{schedule.description}</p>
                                                )}
                                                <p className="text-sm text-gray-500 mt-1">
                                                    {format(new Date(schedule.start_time), 'HH:mm', { locale: ko })} -{' '}
                                                    {format(new Date(schedule.end_time), 'HH:mm', { locale: ko })}
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                <p>선택한 날짜에 일정이 없습니다</p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-4"
                                    onClick={handleAddSchedule}
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    일정 추가
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* All Upcoming Schedules */}
            <Card>
                <CardHeader>
                    <CardTitle>전체 일정</CardTitle>
                    <CardDescription>모든 예정된 일정을 확인하세요</CardDescription>
                </CardHeader>
                <CardContent>
                    {schedules.length > 0 ? (
                        <div className="space-y-2">
                            {schedules.slice(0, 10).map((schedule) => (
                                <button
                                    key={schedule.id}
                                    onClick={() => handleEditSchedule(schedule)}
                                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors border"
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="h-8 w-1 rounded-full"
                                            style={{ backgroundColor: schedule.color }}
                                        />
                                        <div className="text-left">
                                            <p className="font-medium text-gray-900">{schedule.title}</p>
                                            <p className="text-sm text-gray-500">
                                                {format(new Date(schedule.start_time), 'M월 d일 (E) HH:mm', { locale: ko })}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            <p>등록된 일정이 없습니다</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Schedule Modal */}
            <ScheduleModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                selectedDate={date || new Date()}
                userId={MOCK_USER_ID}
                schedule={selectedSchedule}
                onSuccess={loadSchedules}
            />
        </div>
    )
}

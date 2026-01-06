'use client'

import { useState, useEffect } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Clock, Calendar as CalendarIcon } from 'lucide-react'
import { format, isSameDay } from 'date-fns'
import { ko } from 'date-fns/locale'
import ScheduleModal from '@/components/ScheduleModal'
import { getAllSchedules, Schedule } from '@/lib/schedule-actions'
import { createClient } from '@/lib/supabase-client'

interface CalendarClientProps {
    currentUser: {
        id: string
        fullName: string
        themeColor: string
    }
}

export default function CalendarClient({ currentUser }: CalendarClientProps) {
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
        // 본인의 일정이 아니면 수정 불가 (상세 보기는 가능하게 할 수도 있음)
        if (schedule.user_id !== currentUser.id) {
            alert('작성자만 수정할 수 있습니다.')
            return
        }
        setSelectedSchedule(schedule)
        setIsModalOpen(true)
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                        <CalendarIcon className="h-8 w-8 text-blue-600" />
                        캘린더
                    </h1>
                    <p className="mt-2 text-gray-600">팀원들의 일정을 확인하고 공유하세요</p>
                </div>
                <Button onClick={handleAddSchedule} className="w-full md:w-auto">
                    <Plus className="mr-2 h-4 w-4" />
                    새 일정 추가
                </Button>
            </div>

            {/* Calendar Grid */}
            <div className="grid gap-6 lg:grid-cols-[1fr,400px]">
                {/* Calendar */}
                <Card className="h-full">
                    <CardHeader>
                        <CardTitle>월간 캘린더</CardTitle>
                        <CardDescription>날짜를 선택하여 상세 일정을 확인하세요</CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center p-4">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            locale={ko}
                            className="rounded-md border shadow-sm w-full max-w-[600px] flex justify-center"
                            classNames={{
                                month: "space-y-4 w-full",
                                head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] w-full",
                                cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20 w-full h-14 md:h-20",
                                day: "h-full w-full p-0 font-normal aria-selected:opacity-100 hover:bg-gray-100 rounded-md transition-colors",
                                day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                            }}
                            modifiers={{
                                scheduled: datesWithSchedules
                            }}
                            modifiersClassNames={{
                                scheduled: 'after:content-[""] after:absolute after:bottom-2 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:bg-blue-500 after:rounded-full'
                            }}
                        />
                    </CardContent>
                </Card>

                {/* Schedule List */}
                <Card className="h-full flex flex-col">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5" />
                            {date ? format(date, 'M월 d일 (E)', { locale: ko }) : '일정'}
                        </CardTitle>
                        <CardDescription>
                            {selectedDaySchedules.length > 0
                                ? `총 ${selectedDaySchedules.length}개의 일정이 있습니다`
                                : '예정된 일정이 없습니다'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto max-h-[600px]">
                        {loading ? (
                            <div className="flex items-center justify-center h-40">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                            </div>
                        ) : selectedDaySchedules.length > 0 ? (
                            <div className="space-y-3">
                                {selectedDaySchedules.map((schedule) => (
                                    <div
                                        key={schedule.id}
                                        onClick={() => handleEditSchedule(schedule)}
                                        className={`w-full text-left p-3 rounded-lg border transition-all hover:shadow-md ${schedule.user_id === currentUser.id
                                                ? 'cursor-pointer hover:bg-gray-50 border-gray-200'
                                                : 'cursor-default bg-gray-50/50 border-gray-100'
                                            }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div
                                                className="h-full min-h-[40px] w-1.5 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: schedule.color }}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start">
                                                    <p className="font-semibold text-gray-900 line-clamp-1">{schedule.title}</p>
                                                    {schedule.profiles && (
                                                        <span className="text-xs text-gray-400 flex-shrink-0 ml-2 bg-white px-1.5 py-0.5 rounded border border-gray-100">
                                                            {schedule.profiles.full_name}
                                                        </span>
                                                    )}
                                                </div>

                                                {schedule.description && (
                                                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{schedule.description}</p>
                                                )}

                                                <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                                                    <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-medium">
                                                        {format(new Date(schedule.start_time), 'a h:mm', { locale: ko })}
                                                    </span>
                                                    <span>-</span>
                                                    <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-medium">
                                                        {format(new Date(schedule.end_time), 'a h:mm', { locale: ko })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 flex flex-col items-center justify-center h-full">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                    <CalendarIcon className="h-8 w-8 text-gray-400" />
                                </div>
                                <p className="text-gray-900 font-medium">일정이 없습니다</p>
                                <p className="text-sm text-gray-500 mt-1 mb-4">새로운 일정을 추가해보세요</p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleAddSchedule}
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    일정 추가하기
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
                                    // 내 일정이면 호버 효과 활성화, 아니면 비활성화 (커서는 handleEditSchedule 내부 로직보단 여기서 제어하는게 직관적일 수 있으나, 일관성을 위해 내부 로직 따름)
                                    className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                                        schedule.user_id === currentUser.id 
                                        ? 'hover:bg-gray-50 cursor-pointer' 
                                        : 'hover:bg-gray-50/50 cursor-default'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="h-8 w-1 rounded-full"
                                            style={{ backgroundColor: schedule.color }}
                                        />
                                        <div className="text-left">
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium text-gray-900">{schedule.title}</p>
                                                {schedule.profiles && (
                                                    <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                                        {schedule.profiles.full_name}
                                                    </span>
                                                )}
                                            </div>
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
                userId={currentUser.id}
                userThemeColor={currentUser.themeColor}
                schedule={selectedSchedule}
                onSuccess={loadSchedules}
            />
        </div>
    )
}

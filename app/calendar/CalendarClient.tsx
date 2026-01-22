'use client'

import { useState, useEffect } from 'react'
import { Calendar, CalendarDayButton } from '@/components/ui/calendar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Clock, Calendar as CalendarIcon } from 'lucide-react'
import { format, isSameDay } from 'date-fns'
import { ko } from 'date-fns/locale'
import ScheduleModal from '@/components/ScheduleModal'
import { getAllSchedules, Schedule } from '@/lib/schedule-actions'
import { createClient } from '@/lib/supabase-client'
import type { DayButton } from 'react-day-picker'
import React from 'react'

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

    // Custom DayButton component to show schedule indicators
    const CustomDayButton = (props: React.ComponentProps<typeof DayButton>) => {
        const daySchedules = schedules.filter(schedule =>
            isSameDay(new Date(schedule.start_time), props.day.date)
        )

        // Apply today's style directly to the button
        const isToday = props.modifiers?.today
        const todayClassName = isToday ? "bg-gray-200 text-gray-900" : ""

        return (
            <CalendarDayButton {...props} className={todayClassName}>
                <span className="font-bold" style={{ fontSize: '20px', lineHeight: '1' }}>{props.day.date.getDate()}</span>
                {daySchedules.length > 0 && (
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                        {daySchedules.slice(0, 3).map((schedule, idx) => (
                            <div
                                key={schedule.id || idx}
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: schedule.color }}
                            />
                        ))}
                    </div>
                )}
            </CalendarDayButton>
        )
    }

    // Custom Weekday component with custom font size
    const CustomWeekday = ({ children, ...props }: any) => {
        // 요일 텍스트 확인 (일, 월, 화, 수, 목, 금, 토)
        const dayText = children?.toString() || ''

        let color = '#6b7280' // 기본 gray-500
        if (dayText.includes('일')) {
            color = '#dc2626' // 일요일 - 빨간색
        } else if (dayText.includes('토')) {
            color = '#2563eb' // 토요일 - 파란색
        }

        return (
            <th {...props} className="rounded-md w-full font-bold flex justify-center items-center flex-1 pb-4">
                <span style={{ fontSize: '20px', lineHeight: '1', color }}>{children}</span>
            </th>
        )
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

            {/* Top Section: Calendar (2/3) + Selected Date Schedule (1/3) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 1. Monthly Calendar (Left - 2/3) */}
                <Card className="lg:col-span-2 w-full">
                    <CardHeader>
                        <CardTitle>월간 캘린더</CardTitle>
                        <CardDescription>날짜를 선택하여 상세 일정을 확인하세요</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 overflow-auto max-w-full">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            locale={ko}
                            className="rounded-md border shadow-sm w-full block"
                            classNames={{
                                root: "w-full max-w-full p-3 block relative",
                                months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 w-full relative",
                                month: "space-y-4 w-full relative flex flex-col",
                                caption: "flex justify-center pt-1 relative items-center mb-4 z-10",
                                caption_label: "text-lg font-bold",
                                nav: "absolute top-0 left-1/2 -translate-x-1/2 flex items-center justify-between w-[280px] pt-1 z-20",
                                nav_button: "h-8 w-8 bg-transparent p-0 opacity-100 hover:opacity-75 text-foreground cursor-pointer block",
                                nav_button_previous: "static block",
                                nav_button_next: "static block",
                                table: "w-full border-collapse space-y-1 block",
                                head_row: "flex w-full mb-4 [&>*:first-child]:!text-red-600 [&>*:last-child]:!text-blue-600",
                                head_cell: "text-gray-500 rounded-md w-full font-bold text-xl flex justify-center items-center flex-1 pb-4",
                                row: "flex w-full mt-2",
                                cell: "text-center text-4xl p-0 relative focus-within:relative focus-within:z-20 h-24 md:h-32 w-full flex-1",
                                day: "h-[calc(100%-0.5rem)] w-[calc(100%-0.5rem)] m-1 p-0 font-normal aria-selected:opacity-100 rounded-md transition-colors flex flex-col items-center justify-start pt-4 relative",
                                day_selected: "",
                                day_today: "",
                                today: "", // Override default calendar.tsx today style
                            }}
                            modifiers={{
                                today: new Date(),
                                sunday: { dayOfWeek: [0] },
                                saturday: { dayOfWeek: [6] },
                                hasSchedule: schedules.map(s => new Date(s.start_time))
                            }}
                            modifiersClassNames={{
                                today: '',
                                sunday: 'text-red-600',
                                saturday: 'text-blue-600',
                                hasSchedule: 'font-bold'
                            }}
                            components={{
                                DayButton: CustomDayButton,
                                Weekday: CustomWeekday
                            }}
                        />
                    </CardContent>
                </Card>

                {/* 2. Selected Day Schedule (Right - 1/3) */}
                <Card className="h-full flex flex-col lg:col-span-1">
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

            {/* Bottom Section: All Upcoming Schedules (Full Width) */}
            <Card className="w-full">
                <CardHeader>
                    <CardTitle>전체 일정</CardTitle>
                    <CardDescription>모든 예정된 일정을 확인하세요</CardDescription>
                </CardHeader>
                <CardContent className="overflow-y-auto max-h-[600px]">
                    {schedules.length > 0 ? (
                        <div className="space-y-2">
                            {schedules.slice(0, 10).map((schedule) => (
                                <button
                                    key={schedule.id}
                                    onClick={() => handleEditSchedule(schedule)}
                                    className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${schedule.user_id === currentUser.id
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

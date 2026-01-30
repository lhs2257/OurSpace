'use client'

import { useState, useEffect } from 'react'
import { Calendar, CalendarDayButton } from '@/components/ui/calendar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Clock, Calendar as CalendarIcon } from 'lucide-react'
import { format, isSameDay } from 'date-fns'
import { ko } from 'date-fns/locale'
import ScheduleModal from '@/components/ScheduleModal'
import { getAllSchedules, Schedule, getAllProfiles } from '@/lib/schedule-actions'
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
    const [profiles, setProfiles] = useState<any[]>([])
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadSchedules()
        loadProfiles()

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
            // View Policy: All schedules are visible to everyone (Open to All)
            setSchedules(result.data as Schedule[])
        }
        setLoading(false)
    }

    async function loadProfiles() {
        const result = await getAllProfiles()
        if (result.success && result.data) {
            setProfiles(result.data)
        }
    }

    const getScheduleScope = (schedule: Schedule) => {
        if (!schedule.shared_with || schedule.shared_with.includes('ALL')) {
            return "모두"
        }

        // Filter profiles that are in the shared_with list
        const assignedProfiles = profiles.filter(p => schedule.shared_with?.includes(p.id))
        if (assignedProfiles.length === 0) return "비공개" // Should not happen if visible

        return assignedProfiles.map(p => p.full_name).join(", ")
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
        const isOwner = schedule.user_id === currentUser.id
        // Treat null (legacy) as 'ALL' to match UI default
        const isSharedWithAll = schedule.shared_with?.includes('ALL') || !schedule.shared_with
        const isSharedWithMe = schedule.shared_with?.includes(currentUser.id)

        // Edit permission: Owner OR Listed in shared_with (ALL or Me)
        const canEdit = isOwner || isSharedWithAll || isSharedWithMe

        setSelectedSchedule(schedule)
        setIsModalOpen(true)
    }

    // Custom DayButton component to show schedule indicators
    const CustomDayButton = (props: React.ComponentProps<typeof DayButton>) => {
        const date = props.day.date

        // Find all schedules active on this day
        const daySchedules = schedules.filter(schedule => {
            const start = new Date(schedule.start_time)
            const end = new Date(schedule.end_time)
            // Reset hours to compare dates only (inclusive)
            const dayStart = new Date(date)
            dayStart.setHours(0, 0, 0, 0)
            const dayEnd = new Date(date)
            dayEnd.setHours(23, 59, 59, 999)

            return new Date(start) <= dayEnd && new Date(end) >= dayStart
        }).sort((a, b) => {
            // Sort by start time, then by duration (longer first), then by id
            const startDiff = new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
            if (startDiff !== 0) return startDiff
            return new Date(b.end_time).getTime() - new Date(a.end_time).getTime()
        })

        // Apply today's style
        const isToday = props.modifiers?.today
        const isSelected = props.modifiers?.selected
        const todayClassName = isToday ? "bg-blue-50" : ""
        const selectedClassName = isSelected ? "!bg-blue-100" : ""

        return (
            <CalendarDayButton {...props} className={`${todayClassName} ${selectedClassName} text-left align-top hover:bg-gray-50`}>
                <div className="w-full h-full flex flex-col items-start pt-1">
                    <span className={`text-sm font-bold block mb-1 pl-1 ${isToday ? 'text-blue-600' : ''}`}>
                        {date.getDate()}
                    </span>
                    <div className="w-full flex flex-col gap-0.5 overflow-hidden">
                        {daySchedules.slice(0, 4).map((schedule, idx) => {
                            const startDate = new Date(schedule.start_time)
                            const endDate = new Date(schedule.end_time)
                            const isStart = isSameDay(startDate, date)
                            const isEnd = isSameDay(endDate, date)

                            // Show title only on start day, allow it to span across
                            const showTitle = isStart

                            return (
                                <div
                                    key={schedule.id || idx}
                                    className={`
                                        h-5 text-xs mb-0.5 cursor-pointer flex items-center
                                        ${isStart ? 'rounded-l-md ml-1 pl-1' : ''} 
                                        ${isEnd ? 'rounded-r-md mr-1' : ''}
                                        ${!isStart && !isEnd ? 'rounded-none w-full' : ''}
                                        ${!isStart ? 'pl-2' : ''} 
                                    `}
                                    style={{
                                        backgroundColor: schedule.color + '40', // 25% opacity for background
                                        borderLeft: isStart ? `3px solid ${schedule.color}` : undefined,
                                        color: '#1f2937', // dark text for readability
                                        width: (!isStart && !isEnd) ? '100%' : undefined
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handleEditSchedule(schedule)
                                    }}
                                >
                                    {showTitle && <span className="font-semibold text-gray-900 whitespace-nowrap block">
                                        {schedule.title}
                                    </span>}
                                </div>
                            )
                        })}
                        {daySchedules.length > 4 && (
                            <span className="text-[10px] text-gray-400 pl-1">
                                +{daySchedules.length - 4}개
                            </span>
                        )}
                    </div>
                </div>
            </CalendarDayButton>
        )
    }

    // Custom Weekday component with custom font size and English translation
    const CustomWeekday = ({ children, ...props }: any) => {
        // Map Korean day names to English
        const dayMap: { [key: string]: string } = {
            '일': 'SUN', '월': 'MON', '화': 'TUE', '수': 'WED',
            '목': 'THU', '금': 'FRI', '토': 'SAT'
        }

        const originalText = children?.toString() || ''
        // Extract the Korean char (assuming single char or starts with it)
        const koreanDay = originalText.charAt(0)
        const englishDay = dayMap[koreanDay] || originalText

        let colorClass = 'text-gray-500'
        if (englishDay === 'SUN') colorClass = 'text-red-600'
        else if (englishDay === 'SAT') colorClass = 'text-blue-600'

        return (
            <th {...props} className="rounded-md w-full font-bold flex justify-center items-center flex-1 pb-4">
                <span className={colorClass} style={{ fontSize: '20px', lineHeight: '1' }}>{englishDay}</span>
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
                                nav: "absolute top-0 left-0 flex items-center justify-between w-full px-4 pt-1 z-20",
                                nav_button: "h-8 w-8 bg-transparent p-0 opacity-100 hover:opacity-75 text-foreground cursor-pointer block hover:bg-gray-100 rounded",
                                nav_button_previous: "static block",
                                nav_button_next: "static block",
                                table: "!table w-full border-collapse table-fixed",
                                tbody: "!table-row-group w-full",
                                head: "!table-header-group w-full",
                                head_row: "!table-row [&>*:first-child]:!text-red-600 [&>*:last-child]:!text-blue-600",
                                head_cell: "!table-cell text-gray-500 font-bold text-xl pb-4 align-middle",
                                row: "!table-row w-full mt-2",
                                cell: "!table-cell p-0 align-top h-24 md:h-32 relative focus-within:z-20 min-w-0",
                                day: "h-full w-full aspect-auto m-0 p-0 font-normal aria-selected:opacity-100 transition-colors flex flex-col items-start justify-start relative hover:bg-gray-50",
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
                                        className="w-full text-left p-3 rounded-lg border transition-all hover:shadow-md cursor-pointer hover:bg-gray-50 border-gray-200"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div
                                                className="h-full min-h-[40px] w-1.5 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: schedule.color }}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start">
                                                    <p className="font-semibold text-gray-900 line-clamp-1">{schedule.title}</p>
                                                    <span className="text-xs text-gray-400 flex-shrink-0 ml-2 bg-white px-1.5 py-0.5 rounded border border-gray-200">
                                                        {getScheduleScope(schedule)}
                                                    </span>
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
                                    className="w-full text-left flex items-center justify-between p-3 rounded-lg border transition-all hover:shadow-md cursor-pointer hover:bg-gray-50 border-gray-200"
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="h-8 w-1 rounded-full"
                                            style={{ backgroundColor: schedule.color }}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium text-gray-900 line-clamp-1">{schedule.title}</p>
                                                <span className="text-xs text-gray-400 flex-shrink-0 bg-white px-1.5 py-0.5 rounded border border-gray-200">
                                                    {getScheduleScope(schedule)}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-500 mt-0.5">
                                                {format(new Date(schedule.start_time), 'M월 d일 (E) HH:mm', { locale: ko })}
                                                {' ~ '}
                                                {format(new Date(schedule.end_time), isSameDay(new Date(schedule.start_time), new Date(schedule.end_time)) ? 'HH:mm' : 'M월 d일 (E) HH:mm', { locale: ko })}
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
                readOnly={false}
            />
        </div>
    )
}

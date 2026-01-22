'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface AttendanceRecord {
    date: string;
    checkIn?: string;
    checkOut?: string;
    duration?: string;
}

interface AttendanceCalendarProps {
    records: AttendanceRecord[];
    currentMonth: Date;
    onMonthChange?: (newMonth: Date) => void;
}

export function AttendanceCalendar({ records, currentMonth, onMonthChange }: AttendanceCalendarProps) {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // 달력 시작을 위해 첫 날의 요일만큼 빈 칸 추가
    const startDayOfWeek = getDay(monthStart);
    const emptyDays = Array(startDayOfWeek).fill(null);

    const getRecordForDate = (date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        return records.find(r => r.date === dateStr);
    };

    // 출근 상태 판단 함수
    const getAttendanceStatus = (day: Date, record?: AttendanceRecord) => {
        const isWeekend = getDay(day) === 0 || getDay(day) === 6;
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        const isFuture = day > today;

        // 2026년 1월 8일 부터 적용
        const startDate = new Date('2026-01-08');
        startDate.setHours(0, 0, 0, 0);

        // 날짜 비교를 위해 day의 시간을 0으로 설정한 복사본 생성
        const currentDay = new Date(day);
        currentDay.setHours(0, 0, 0, 0);

        if (currentDay < startDate) {
            return 'default';
        }

        // 주말이거나 미래 날짜는 색상 표시 안함
        if (isWeekend || isFuture) {
            return 'default';
        }

        // 출근 기록이 없으면 결근
        if (!record || !record.checkIn) {
            return 'absent';
        }

        // 지각 여부 확인 (10:10 초과)
        const checkInTime = new Date(record.checkIn);
        const checkInHour = checkInTime.getHours();
        const checkInMinute = checkInTime.getMinutes();

        if (checkInHour > 10 || (checkInHour === 10 && checkInMinute > 10)) {
            return 'late';
        }

        return 'normal';
    };

    const handlePrevMonth = () => {
        if (onMonthChange) {
            onMonthChange(addMonths(currentMonth, -1));
        }
    };

    const handleNextMonth = () => {
        if (onMonthChange) {
            onMonthChange(addMonths(currentMonth, 1));
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <button
                        onClick={handlePrevMonth}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        aria-label="이전 월"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <CardTitle>{format(currentMonth, 'yyyy년 MM월', { locale: ko })}</CardTitle>
                    <button
                        onClick={handleNextMonth}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        aria-label="다음 월"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-7 gap-2">
                    {['일', '월', '화', '수', '목', '금', '토'].map(day => (
                        <div key={day} className="text-center font-bold text-sm p-2">
                            {day}
                        </div>
                    ))}
                    {emptyDays.map((_, index) => (
                        <div key={`empty-${index}`} className="p-2" />
                    ))}
                    {daysInMonth.map(day => {
                        const record = getRecordForDate(day);
                        const status = getAttendanceStatus(day, record);

                        // 상태별 CSS 클래스
                        let statusClass = 'bg-gray-50 border-gray-200'; // default
                        if (status === 'absent') {
                            statusClass = 'bg-red-50 border-red-200';
                        } else if (status === 'late') {
                            statusClass = 'bg-orange-50 border-orange-200';
                        } else if (status === 'normal') {
                            statusClass = 'bg-green-50 border-green-200';
                        }

                        return (
                            <div
                                key={day.toISOString()}
                                className={`p-2 border rounded-lg text-sm ${statusClass}`}
                            >
                                <div className="font-medium">{format(day, 'd')}</div>
                                {record && (
                                    <div className="text-xs mt-1">
                                        {record.checkIn && (
                                            <div>
                                                {format(new Date(record.checkIn), 'HH:mm')}
                                                {record.checkOut && (
                                                    <>
                                                        {' ~ '}
                                                        {format(new Date(record.checkOut), 'HH:mm')}
                                                    </>
                                                )}
                                                {record.duration && (
                                                    <div className="text-gray-600">({record.duration} 근무)</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}

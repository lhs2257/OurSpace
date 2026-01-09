'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns';
import { ko } from 'date-fns/locale';

interface AttendanceRecord {
    date: string;
    checkIn?: string;
    checkOut?: string;
    duration?: string;
}

interface AttendanceCalendarProps {
    records: AttendanceRecord[];
    currentMonth: Date;
}

export function AttendanceCalendar({ records, currentMonth }: AttendanceCalendarProps) {
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

    return (
        <Card>
            <CardHeader>
                <CardTitle>{format(currentMonth, 'yyyy년 MM월', { locale: ko })}</CardTitle>
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
                        return (
                            <div
                                key={day.toISOString()}
                                className={`p-2 border rounded-lg text-sm ${record ? 'bg-green-50 border-green-200' : 'bg-gray-50'
                                    }`}
                            >
                                <div className="font-medium">{format(day, 'd')}</div>
                                {record && (
                                    <div className="text-xs mt-1">
                                        {record.checkIn && <div>✓ {format(new Date(record.checkIn), 'HH:mm')}</div>}
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

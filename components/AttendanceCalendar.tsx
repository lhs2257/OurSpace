'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { LeaveApplicationModal } from './LeaveApplicationModal';
import { getMonthlyLeaveRecords, type LeaveRecord } from '@/lib/leave-actions';

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
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [leaveRecords, setLeaveRecords] = useState<LeaveRecord[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
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

    const getLeaveForDate = (date: Date): LeaveRecord | undefined => {
        const dateStr = format(date, 'yyyy-MM-dd');
        return leaveRecords.find(r => r.leave_date === dateStr);
    };

    // 연차/반차 기록 조회
    useEffect(() => {
        const fetchLeaveRecords = async () => {
            const monthYearStr = format(currentMonth, 'yyyy-MM');
            const result = await getMonthlyLeaveRecords(monthYearStr);
            if (result.success && result.data) {
                setLeaveRecords(result.data);
            }
        };
        fetchLeaveRecords();
    }, [currentMonth]);

    // 출근 상태 판단 함수
    const getAttendanceStatus = (day: Date, record?: AttendanceRecord, leave?: LeaveRecord) => {
        // 연차/반차가 있으면 우선 처리
        if (leave) {
            return leave.leave_type === 'annual' ? 'leave-annual' : 'leave-half';
        }

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

    const handleDayClick = (day: Date) => {
        setSelectedDate(day);
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setSelectedDate(null);
    };

    const handleLeaveSuccess = () => {
        // 연차/반차 기록 새로고침
        const fetchLeaveRecords = async () => {
            const monthYearStr = format(currentMonth, 'yyyy-MM');
            const result = await getMonthlyLeaveRecords(monthYearStr);
            if (result.success && result.data) {
                setLeaveRecords(result.data);
            }
        };
        fetchLeaveRecords();

        // 부모 컴포넌트에도 새로고침 알림 (출퇴근 기록 새로고침)
        if (onMonthChange) {
            onMonthChange(currentMonth);
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
                        const leave = getLeaveForDate(day);
                        const status = getAttendanceStatus(day, record, leave);

                        // 상태별 CSS 클래스
                        let statusClass = 'bg-gray-50 border-gray-200'; // default
                        if (status === 'absent') {
                            statusClass = 'bg-red-50 border-red-200';
                        } else if (status === 'late') {
                            statusClass = 'bg-orange-50 border-orange-200';
                        } else if (status === 'normal') {
                            statusClass = 'bg-green-50 border-green-200';
                        } else if (status === 'leave-annual') {
                            statusClass = 'bg-blue-50 border-blue-300 border-2';
                        } else if (status === 'leave-half') {
                            statusClass = 'bg-purple-50 border-purple-300 border-2';
                        }

                        return (
                            <div
                                key={day.toISOString()}
                                onClick={() => handleDayClick(day)}
                                className={`p-2 border rounded-lg text-sm cursor-pointer hover:shadow-md transition-shadow ${statusClass}`}
                            >
                                {/* 날짜와 연차/반차 배지를 같은 줄에 표시 */}
                                <div className="flex items-center gap-1">
                                    <div className="font-medium">{format(day, 'd')}</div>
                                    {leave && (
                                        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${leave.leave_type === 'annual'
                                            ? 'bg-blue-200 text-blue-900'
                                            : 'bg-purple-200 text-purple-900'
                                            }`}>
                                            {leave.leave_type === 'annual' ? '연차' : '반차'}
                                        </span>
                                    )}
                                </div>

                                {/* 출퇴근 기록 표시 - 연차/반차 상관없이 기록 있으면 표시 */}
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

            {selectedDate && (
                <LeaveApplicationModal
                    isOpen={isModalOpen}
                    onClose={handleModalClose}
                    date={selectedDate}
                    existingLeave={getLeaveForDate(selectedDate)}
                    onSuccess={handleLeaveSuccess}
                />
            )}
        </Card>
    );
}

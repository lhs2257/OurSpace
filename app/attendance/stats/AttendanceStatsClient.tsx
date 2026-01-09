'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-client';
import { AttendanceCalendar } from '@/components/AttendanceCalendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface AttendanceRecord {
    date: string;
    checkIn?: string;
    checkOut?: string;
    duration?: string;
}

export default function AttendanceStatsClient() {
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [stats, setStats] = useState({ totalDays: 0, totalHours: 0, avgHours: 0 });
    const supabase = createClient();

    useEffect(() => {
        fetchMonthlyRecords();
    }, [currentMonth]);

    const fetchMonthlyRecords = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);

        // 해당 월의 모든 출퇴근 기록 조회
        const { data: attendance } = await supabase
            .from('attendance')
            .select('*')
            .eq('user_id', user.id)
            .gte('created_at', monthStart.toISOString())
            .lte('created_at', monthEnd.toISOString())
            .order('created_at', { ascending: true });

        if (!attendance) return;

        // 날짜별로 그룹화
        const recordsMap: { [key: string]: AttendanceRecord } = {};

        attendance.forEach(record => {
            const date = format(new Date(record.created_at), 'yyyy-MM-dd');
            if (!recordsMap[date]) {
                recordsMap[date] = { date };
            }

            if (record.type === 'check_in') {
                if (!recordsMap[date].checkIn) {
                    recordsMap[date].checkIn = record.created_at;
                }
            } else if (record.type === 'check_out') {
                recordsMap[date].checkOut = record.created_at;
            }
        });

        // 근무시간 계산
        const recordsArray = Object.values(recordsMap).map(record => {
            if (record.checkIn && record.checkOut) {
                const diff = new Date(record.checkOut).getTime() - new Date(record.checkIn).getTime();
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                record.duration = `${hours}:${minutes}:00`;
            }
            return record;
        });

        setRecords(recordsArray);

        // 통계 계산
        const totalDays = recordsArray.filter(r => r.checkIn).length;
        const totalMinutes = recordsArray.reduce((sum, record) => {
            if (record.checkIn && record.checkOut) {
                const diff = new Date(record.checkOut).getTime() - new Date(record.checkIn).getTime();
                return sum + diff / (1000 * 60);
            }
            return sum;
        }, 0);

        const totalHours = Math.floor(totalMinutes / 60);
        const avgHours = totalDays > 0 ? Math.floor(totalMinutes / totalDays / 60) : 0;

        setStats({ totalDays, totalHours, avgHours });
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">근태 통계</h1>

            <div className="grid grid-cols-3 gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">출근 일수</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{stats.totalDays}일</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">총 근무시간</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{stats.totalHours}시간</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">평균 근무시간</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{stats.avgHours}시간</p>
                    </CardContent>
                </Card>
            </div>

            <AttendanceCalendar records={records} currentMonth={currentMonth} />
        </div>
    );
}

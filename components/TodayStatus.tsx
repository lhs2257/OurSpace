'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface TodayStatusProps {
    checkInTime?: string | null;
    checkOutTime?: string | null;
    workDuration?: string | null;
}

export function TodayStatus({ checkInTime, checkOutTime, workDuration }: TodayStatusProps) {
    const formatTime = (time?: string | null) => {
        if (!time) return '-';
        return format(new Date(time), 'HH:mm', { locale: ko });
    };

    const formatDuration = (duration?: string | null) => {
        if (!duration) return '-';
        const match = duration.match(/(\d+):(\d+):(\d+)/);
        if (!match) return duration;
        const [, hours, minutes] = match;
        return `${hours}시간 ${minutes}분`;
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>오늘의 근무 현황</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-4">
                <div>
                    <p className="text-sm text-muted-foreground">출근 시간</p>
                    <p className="text-2xl font-bold">{formatTime(checkInTime)}</p>
                </div>
                <div>
                    <p className="text-sm text-muted-foreground">퇴근 시간</p>
                    <p className="text-2xl font-bold">{formatTime(checkOutTime)}</p>
                </div>
                <div>
                    <p className="text-sm text-muted-foreground">근무 시간</p>
                    <p className="text-2xl font-bold">{formatDuration(workDuration)}</p>
                </div>
            </CardContent>
        </Card>
    );
}

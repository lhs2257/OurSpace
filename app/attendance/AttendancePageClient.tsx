'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-client';
import { AttendanceButton } from '@/components/AttendanceButton';
import { TodayStatus } from '@/components/TodayStatus';
import { TeamStatus } from '@/components/TeamStatus';

export default function AttendancePageClient() {
    const [isCheckedIn, setIsCheckedIn] = useState(false);
    const [todayStatus, setTodayStatus] = useState<any>(null);
    const supabase = createClient();

    useEffect(() => {
        fetchTodayStatus();
    }, []);

    const fetchTodayStatus = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const today = new Date().toISOString().split('T')[0];

        const { data: checkIn } = await supabase
            .from('attendance')
            .select('created_at')
            .eq('user_id', user.id)
            .eq('type', 'check_in')
            .gte('created_at', `${today}T00:00:00`)
            .order('created_at', { ascending: true })
            .limit(1)
            .single();

        const { data: checkOut } = await supabase
            .from('attendance')
            .select('created_at')
            .eq('user_id', user.id)
            .eq('type', 'check_out')
            .gte('created_at', `${today}T00:00:00`)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        setIsCheckedIn(!!checkIn && !checkOut);

        let workDuration = null;
        if (checkIn && checkOut) {
            const diff = new Date(checkOut.created_at).getTime() - new Date(checkIn.created_at).getTime();
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            workDuration = `${hours}:${minutes}:00`;
        }

        setTodayStatus({
            check_in_time: checkIn?.created_at || null,
            check_out_time: checkOut?.created_at || null,
            work_duration: workDuration,
        });
    };

    return (
        <div className="space-y-6">
            <div className="text-center space-y-4">
                <h1 className="text-3xl font-bold">근태 관리</h1>
                <AttendanceButton isCheckedIn={isCheckedIn} onSuccess={fetchTodayStatus} />
            </div>

            <TodayStatus
                checkInTime={todayStatus?.check_in_time}
                checkOutTime={todayStatus?.check_out_time}
                workDuration={todayStatus?.work_duration}
            />

            <TeamStatus />
        </div>
    );
}

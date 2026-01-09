'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase-client';

interface AttendanceButtonProps {
    isCheckedIn: boolean;
    onSuccess?: () => void;
}

export function AttendanceButton({ isCheckedIn, onSuccess }: AttendanceButtonProps) {
    const [loading, setLoading] = useState(false);
    const supabase = createClient();

    const handleAttendance = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const type = isCheckedIn ? 'check_out' : 'check_in';

            const { error } = await supabase
                .from('attendance')
                .insert({
                    user_id: user.id,
                    type
                });

            if (error) throw error;
            onSuccess?.();
        } catch (error) {
            console.error('Error recording attendance:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button
            onClick={handleAttendance}
            disabled={loading}
            size="lg"
            className={isCheckedIn ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-500 hover:bg-green-600'}
        >
            {loading ? '처리중...' : isCheckedIn ? '🌙 퇴근하기' : '☀️ 출근하기'}
        </Button>
    );
}

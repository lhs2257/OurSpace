'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Timer } from 'lucide-react';
import { createClient } from '@/lib/supabase-client';

interface WorkTimerProps {
    initialCheckInTime: string | null;
    initialCheckOutTime: string | null;
}

export default function WorkTimer({ initialCheckInTime, initialCheckOutTime }: WorkTimerProps) {
    const [elapsedTime, setElapsedTime] = useState('00:00:00');
    const [checkInTime, setCheckInTime] = useState<string | null>(initialCheckInTime);
    const [checkOutTime, setCheckOutTime] = useState<string | null>(initialCheckOutTime);

    // 실시간 구독을 통해 출퇴근 상태 변경 감지
    useEffect(() => {
        const supabase = createClient();

        // 현재 사용자의 오늘 출석 기록만 구독하는 것이 이상적이지만, 
        // 간단하게 attendance 테이블 전체 변경을 감지하고 페이지를 새로고침하거나 데이터를 다시 가져오는 방식 사용
        // 여기서는 부모 컴포넌트(서버 컴포넌트)에서 초기값을 받으므로, 
        // 클라이언트에서 별도로 최신 상태를 조회하는 로직이 필요할 수 있음.
        // 하지만 사용자가 '출근' 버튼을 다른 컴포넌트(AttendanceCard)에서 누르면
        // 페이지가 refresh 되도록 AttendanceCard가 구현되어 있다면 이 컴포넌트도 갱신될 것임.
        // AttendanceCard 구현을 확인해보니 router.refresh()를 호출함.
        // 따라서 props가 업데이트될 것이므로 별도 구독은 필요 없을 수 있음.
        // 다만 즉각적인 반응을 위해 props 변경을 감지해야 함.

        setCheckInTime(initialCheckInTime);
        setCheckOutTime(initialCheckOutTime);
    }, [initialCheckInTime, initialCheckOutTime]);

    useEffect(() => {
        // 출근하지 않았거나, 이미 퇴근한 경우
        if (!checkInTime) {
            setElapsedTime('00:00:00');
            return;
        }

        const calculateTime = () => {
            const start = new Date(checkInTime).getTime();
            const end = checkOutTime ? new Date(checkOutTime).getTime() : new Date().getTime();
            const diff = end - start;

            if (diff < 0) {
                setElapsedTime('00:00:00');
                return;
            }

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            const fmt = (n: number) => n.toString().padStart(2, '0');
            setElapsedTime(`${fmt(hours)}:${fmt(minutes)}:${fmt(seconds)}`);
        };

        // 초기 실행
        calculateTime();

        // 퇴근했으면 타이머 멈춤
        if (checkOutTime) {
            return;
        }

        // 1초마다 갱신
        const timer = setInterval(calculateTime, 1000);

        return () => clearInterval(timer);
    }, [checkInTime, checkOutTime]);

    return (
        <Card className="flex items-center gap-3 px-4 py-2 bg-white shadow-sm border border-gray-200">
            <div className={`p-2 rounded-full ${checkInTime && !checkOutTime ? 'bg-green-100 text-green-600 animate-pulse' : 'bg-gray-100 text-gray-500'}`}>
                <Timer className="w-5 h-5" />
            </div>
            <div>
                <p className="text-xs text-gray-500 font-medium">오늘 근무 시간</p>
                <p className="text-xl font-bold font-mono text-gray-900 tracking-wider">
                    {elapsedTime}
                </p>
            </div>
        </Card>
    );
}

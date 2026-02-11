'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase-client';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface TeamMember {
    id: string;
    full_name: string;
    avatar_url: string;
    check_in_time: string | null;
    check_out_time: string | null;
    is_checked_in: boolean;
    late_count: number;
    is_late_today: boolean;
}

// 4개 원 표시 컴포넌트
function LateIndicator({ lateCount }: { lateCount: number }) {
    return (
        <div className="flex gap-1 ml-2 items-center">
            {[0, 1, 2, 3].map((index) => (
                <div
                    key={index}
                    className={`w-3 h-3 rounded-full border border-gray-200 ${index < lateCount ? 'bg-red-500' : 'bg-green-500'
                        }`}
                    title={`${lateCount}/4 지각`}
                />
            ))}
        </div>
    );
}

// 현재 분기 계산 (클라이언트)
function getCurrentQuarter(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const quarter = Math.ceil(month / 3);
    return `${year}-Q${quarter}`;
}

// 지각 판정 (10:10 기준, 주말 제외)
function isLate(checkInTime: string): boolean {
    const time = new Date(checkInTime);
    const day = time.getDay(); // 0: 일요일, 6: 토요일

    // 주말이면 지각 아님
    if (day === 0 || day === 6) return false;

    const hours = time.getHours();
    const minutes = time.getMinutes();

    if (hours > 10) return true;
    if (hours === 10 && minutes >= 16) return true; // 10:16분부터 지각

    return false;
}

export function TeamStatus() {
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const supabase = createClient();

    useEffect(() => {
        fetchTeamStatus();

        // Realtime 구독
        const channel = supabase
            .channel('attendance_changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'attendance' },
                () => {
                    fetchTeamStatus();
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'late_records' },
                () => {
                    fetchTeamStatus();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchTeamStatus = async () => {
        try {
            // 오늘의 모든 사용자 출퇴근 현황 조회
            const { data: profiles, error: profileError } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url');

            if (profileError) {
                console.error('Error fetching profiles:', profileError);
                return;
            }

            if (!profiles) return;

            const today = new Date().toISOString().split('T')[0];
            const currentQuarter = getCurrentQuarter();
            console.log('Current Quarter:', currentQuarter);

            const membersWithStatus = await Promise.all(
                profiles.map(async (profile) => {
                    const { data: checkIn } = await supabase
                        .from('attendance')
                        .select('created_at')
                        .eq('user_id', profile.id)
                        .eq('type', 'check_in')
                        .gte('created_at', `${today}T00:00:00`)
                        .order('created_at', { ascending: true })
                        .limit(1)
                        .single();

                    const { data: checkOut } = await supabase
                        .from('attendance')
                        .select('created_at')
                        .eq('user_id', profile.id)
                        .eq('type', 'check_out')
                        .gte('created_at', `${today}T00:00:00`)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .single();

                    // 현재 분기 지각 횟수 조회
                    const { data: lateRecords, error: lateError } = await supabase
                        .from('late_records')
                        .select('id, late_date, check_in_time') // check_in_time 추가
                        .eq('user_id', profile.id)
                        .eq('quarter', currentQuarter);

                    if (lateError) {
                        console.error('Error fetching late records:', lateError);
                    }

                    // 지각 카운트 계산 (클라이언트 필터링: 1/8 이후 10:16 기준 적용)
                    const validLateRecords = lateRecords?.filter(r => {
                        // 1. 주말 체크 (late_date 기준 - 가장 확실한 방법)
                        // 'YYYY-MM-DD' 형식이므로 new Date() 사용 시 브라우저 로컬 타임존 영향 줄이기 위해 요일 계산
                        const datePart = new Date(r.late_date);
                        const dayOfWeek = datePart.getDay();
                        // 0: 일요일, 6: 토요일
                        if (dayOfWeek === 0 || dayOfWeek === 6) return false;

                        if (r.check_in_time) {
                            const recordDate = new Date(r.late_date);
                            const policyDate = new Date('2026-01-08');

                            // 1월 8일 이후 기록은 10:16 기준(isLate 함수)으로 재검증
                            if (recordDate >= policyDate) {
                                // isLate 함수는 이미 10:16 기준으로 업데이트됨
                                return isLate(r.check_in_time);
                            }
                        }
                        return true;
                    }) || [];

                    const lateCount = validLateRecords.length;

                    // 오늘 지각 여부 (실제 지각 기록이 있는지 확인)
                    const isLateToday = lateRecords?.some(r =>
                        r.late_date === today
                    ) || false;

                    return {
                        ...profile,
                        check_in_time: checkIn?.created_at || null,
                        check_out_time: checkOut?.created_at || null,
                        is_checked_in: !!checkIn && !checkOut,
                        late_count: lateCount,
                        is_late_today: isLateToday,
                    };
                })
            );

            setTeamMembers(membersWithStatus);
        } catch (error) {
            console.error('Unexpected error in fetchTeamStatus:', error);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>팀원 현황</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {teamMembers.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">팀원이 없습니다</p>
                    ) : (
                        teamMembers.map((member) => (
                            <div key={member.id} className="flex items-center justify-between p-3 rounded-lg border">
                                <div className="flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-full ${member.is_checked_in ? 'bg-green-500' : 'bg-gray-300'}`} />
                                    <div className="flex items-center">
                                        <span className="font-medium">{member.full_name || '이름 없음'}</span>
                                        <LateIndicator lateCount={member.late_count} />
                                    </div>
                                </div>
                                <div className="text-sm text-muted-foreground flex items-center gap-2">
                                    {member.check_in_time ? (
                                        <>
                                            <span>
                                                출근: {format(new Date(member.check_in_time), 'HH:mm', { locale: ko })}
                                                {member.check_out_time && ` / 퇴근: ${format(new Date(member.check_out_time), 'HH:mm', { locale: ko })}`}
                                            </span>
                                            {member.is_late_today && (
                                                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                                                    지각
                                                </span>
                                            )}
                                        </>
                                    ) : (
                                        '미출근'
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}


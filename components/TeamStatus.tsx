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
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchTeamStatus = async () => {
        // 오늘의 모든 사용자 출퇴근 현황 조회
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url');

        if (!profiles) return;

        const today = new Date().toISOString().split('T')[0];

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

                return {
                    ...profile,
                    check_in_time: checkIn?.created_at || null,
                    check_out_time: checkOut?.created_at || null,
                    is_checked_in: !!checkIn && !checkOut,
                };
            })
        );

        setTeamMembers(membersWithStatus);
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
                                    <span className="font-medium">{member.full_name || '이름 없음'}</span>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    {member.check_in_time ? (
                                        <>
                                            출근: {format(new Date(member.check_in_time), 'HH:mm', { locale: ko })}
                                            {member.check_out_time && ` / 퇴근: ${format(new Date(member.check_out_time), 'HH:mm', { locale: ko })}`}
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

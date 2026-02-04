'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock } from 'lucide-react'
import { useState, useEffect } from 'react'
import { getAllTodayAttendance } from '@/lib/attendance-actions'
import { createClient } from '@/lib/supabase-client'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

import { THEME_COLORS } from './ProfileModal'

interface AttendanceRecord {
    id: number
    user_id: string
    type: 'check_in' | 'check_out'
    created_at: string
    profiles?: {
        id: string
        full_name: string
        avatar_url: string
        theme_color?: string
    }
}

interface TeamMember {
    userId: string
    name: string
    avatarUrl: string
    isWorking: boolean
    firstCheckIn?: string
    lastCheckOut?: string
    themeColor?: string
    lateCount: number
    isLateToday: boolean
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

    if (hours > 10) return true; // 11시 이후
    if (hours === 10 && minutes >= 16) return true; // 10:16분부터 지각

    return false;
}

export default function TeamStatusCard({ currentUserId }: { currentUserId: string }) {
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])

    useEffect(() => {
        loadTeamStatus()

        // Realtime 구독 설정
        const supabase = createClient()
        const channel = supabase
            .channel('attendance-changes')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'attendance' },
                () => {
                    loadTeamStatus()
                }
            )
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'late_records' },
                () => {
                    loadTeamStatus()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    async function loadTeamStatus() {
        // Attendance Data Fetching
        const result = await getAllTodayAttendance()

        // Late Records Fetching
        const supabase = createClient()
        const currentQuarter = getCurrentQuarter()

        // 모든 팀원의 지각 기록을 한 번에 가져오기 어렵다면, 개별적으로 가져오거나 
        // 여기서는 간단하게 각 멤버별로 조회하는 방식을 사용 (최적화 여지 있음)
        // 하지만 getAllTodayAttendance가 모든 출석을 가져오므로, 
        // late_records도 비슷하게 가져올 수 있으면 좋음.
        // 여기서는 클라이언트에서 Supabase 직접 호출
        const { data: lateRecords } = await supabase
            .from('late_records')
            .select('user_id, late_date, check_in_time') // check_in_time 추가
            .eq('quarter', currentQuarter)

        if (result.success && result.data) {
            const records = result.data as AttendanceRecord[]

            // 사용자별로 기록 그룹화
            const userMap = new Map<string, AttendanceRecord[]>()
            records.forEach(record => {
                if (!userMap.has(record.user_id)) {
                    userMap.set(record.user_id, [])
                }
                userMap.get(record.user_id)!.push(record)
            })

            // 각 사용자의 상태 계산
            const members: TeamMember[] = []
            userMap.forEach((userRecords, userId) => {
                // 현재 사용자는 제외 (제거됨 - 본인 포함 표시)
                // if (userId === currentUserId) return

                // 시간순 정렬
                userRecords.sort((a, b) =>
                    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                )

                const lastRecord = userRecords[userRecords.length - 1]
                const firstCheckIn = userRecords.find(r => r.type === 'check_in') // 첫 출근 기록
                const lastCheckOut = userRecords.reverse().find(r => r.type === 'check_out') // 가장 최근 퇴근 기록
                const profile = lastRecord.profiles

                // 지각 카운트 계산 (클라이언트 필터링 적용: 10:16 기준)
                // DB에 잘못된 기록이 남아있어도 UI에서는 정상으로 보이게 처리
                const validLateRecords = lateRecords?.filter(r => {
                    if (r.user_id !== userId) return false;

                    // 1월 8일 이전 기록은 기존대로 인정? 
                    // 하지만 사용자 요청은 "1월 8일부터 적용"이므로 그 이후 기록만 필터링하면 되지만
                    // 안전하게 모든 기록에 대해 현재 정책(10:16)을 적용하여 보여준다거나
                    // 날짜별 분기 처리를 할 수 있음. 
                    // 여기서는 isLate 함수(10:16 기준)를 사용하여 필터링.

                    if (r.check_in_time) {
                        // 1월 8일 이전 데이터 처리 로직이 필요하다면 추가. 
                        // 현재 요구: "1월 8일 부터 지각 시간을 10시 16분 이후 부터로 처리"
                        // data >= '2026-01-08' 인 경우만 isLate 체크?
                        // 하지만 단순하게 모든 기록을 재검증하는 것이 깔끔할 수 있음 (사용자 의도에 맞게)
                        // 다만 1월 초(1/1~1/7)는 10:10 기준이어야 한다면 날짜 체크 필요.

                        const recordDate = new Date(r.late_date);
                        const policyDate = new Date('2026-01-08');

                        if (recordDate >= policyDate) {
                            return isLate(r.check_in_time);
                        }
                    }
                    return true; // 1/8 이전이거나 check_in_time 없으면 DB 기록 신뢰
                }) || [];

                const userLateCount = validLateRecords.length;

                // 오늘 지각 여부 (실제 지각 기록이 있는지 확인)
                // firstCheckIn 시간상 지각이더라도, 연차/반차로 면제되었으면 lateRecords에 없음
                const todayStr = new Date().toISOString().split('T')[0];
                const isLateToday = lateRecords?.some(r =>
                    r.user_id === userId &&
                    r.late_date === todayStr
                ) || false;

                members.push({
                    userId,
                    name: profile?.full_name || '사용자',
                    avatarUrl: profile?.avatar_url || '',
                    isWorking: lastRecord.type === 'check_in',
                    firstCheckIn: firstCheckIn?.created_at,
                    lastCheckOut: lastCheckOut?.created_at,
                    themeColor: profile?.theme_color || 'blue',
                    lateCount: userLateCount,
                    isLateToday: isLateToday
                })
            })

            setTeamMembers(members)
        }
    }

    // 아바타 색상 가져오기
    const getAvatarGradient = (themeColor?: string) => {
        return THEME_COLORS.find(c => c.id === themeColor)?.value || 'from-blue-500 to-cyan-500'
    }

    // 근무 시간 계산 (분 단위)
    const calculateWorkDuration = (start: string, end: string) => {
        const startTime = new Date(start).getTime()
        const endTime = new Date(end).getTime()
        const durationHours = (endTime - startTime) / (1000 * 60 * 60)
        return durationHours.toFixed(1)
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    팀원 상태
                </CardTitle>
                <CardDescription>현재 근무 현황</CardDescription>
            </CardHeader>
            <CardContent>
                {teamMembers.length > 0 ? (
                    <div className="space-y-3">
                        {teamMembers.map((member) => (
                            <div
                                key={member.userId}
                                className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white bg-gradient-to-br ${getAvatarGradient(member.themeColor)}`}>
                                        {member.name[0]}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-1">
                                            <p className="font-medium text-gray-900">{member.name}</p>
                                            <LateIndicator lateCount={member.lateCount} />
                                        </div>
                                        <div className="text-sm text-gray-500 flex flex-col">
                                            {member.firstCheckIn ? (
                                                <div className="flex items-center gap-1">
                                                    <span>출근: {format(new Date(member.firstCheckIn), 'a h:mm', { locale: ko })}</span>
                                                    {member.isLateToday && (
                                                        <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] rounded-full font-bold">
                                                            지각
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span>미출근</span>
                                            )}

                                            {/* 퇴근한 경우 퇴근 시간 및 근무 시간 표시 */}
                                            {!member.isWorking && member.lastCheckOut && member.firstCheckIn && (
                                                <span className="text-gray-400 text-xs mt-0.5">
                                                    퇴근: {format(new Date(member.lastCheckOut), 'a h:mm', { locale: ko })}
                                                    ({calculateWorkDuration(member.firstCheckIn, member.lastCheckOut)}시간)
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${member.isWorking
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-700'
                                    }`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${member.isWorking ? 'bg-green-600' : 'bg-gray-400'
                                        }`} />
                                    {member.isWorking ? '근무 중' : '오프라인'}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-500">
                        <p>다른 팀원이 없습니다</p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar } from 'lucide-react'
import AttendanceCard from '@/components/AttendanceCard'
import TeamStatusCard from '@/components/TeamStatusCard'
import WorkTimer from '@/components/WorkTimer'
import { getCurrentUser } from '@/lib/get-user'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'

export default async function DashboardPage() {
    const user = await getCurrentUser()

    if (!user) {
        redirect('/login')
    }

    // 오늘의 출근 기록 조회
    const supabase = await createClient()
    const today = new Date().toISOString().split('T')[0]

    // 첫 출근 기록
    const { data: firstCheckIn } = await supabase
        .from('attendance')
        .select('created_at')
        .eq('user_id', user.id)
        .eq('type', 'check_in')
        .gte('created_at', `${today}T00:00:00`)
        .order('created_at', { ascending: true })
        .limit(1)
        .single()

    // 마지막 퇴근 기록 (퇴근했는지 확인용)
    const { data: lastCheckOut } = await supabase
        .from('attendance')
        .select('created_at')
        .eq('user_id', user.id)
        .eq('type', 'check_out')
        .gte('created_at', `${today}T00:00:00`)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

    // 마지막 기록이 'check_in'인지 확인 (근무 중 여부)
    const { data: lastRecord } = await supabase
        .from('attendance')
        .select('type')
        .eq('user_id', user.id)
        .gte('created_at', `${today}T00:00:00`)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

    const isWorking = lastRecord?.type === 'check_in'

    // 퇴근 시간은 현재 근무 중이면 null, 아니면 마지막 퇴근 시간
    const checkOutTime = isWorking ? null : lastCheckOut?.created_at

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">대시보드</h1>
                    <p className="mt-2 text-gray-600">환영합니다, {user.fullName || user.email}님!</p>
                </div>
                <WorkTimer
                    initialCheckInTime={firstCheckIn?.created_at || null}
                    initialCheckOutTime={checkOutTime || null}
                />
            </div>

            {/* Attendance Cards */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* My Status Card */}
                <AttendanceCard userId={user.id} />

                {/* Team Status Card */}
                <TeamStatusCard currentUserId={user.id} />
            </div>

            {/* Today's Schedule Preview */}
            <Card>
                <CardHeader>
                    <CardTitle>오늘의 일정</CardTitle>
                    <CardDescription>예정된 일정이 없습니다</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-gray-500">
                        <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p>캘린더에서 일정을 추가해보세요</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}


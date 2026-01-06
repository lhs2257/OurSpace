import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar } from 'lucide-react'
import AttendanceCard from '@/components/AttendanceCard'
import TeamStatusCard from '@/components/TeamStatusCard'
import { getCurrentUser } from '@/lib/get-user'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
    const user = await getCurrentUser()

    if (!user) {
        redirect('/login')
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">대시보드</h1>
                <p className="mt-2 text-gray-600">환영합니다, {user.fullName || user.email}님!</p>
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


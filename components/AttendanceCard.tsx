'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LogIn, LogOut as LogOutIcon, User } from 'lucide-react'
import { useState, useEffect } from 'react'
import { checkIn, checkOut, getTodayAttendance } from '@/lib/attendance-actions'
import { createClient } from '@/lib/supabase-client'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

interface AttendanceRecord {
    id: number
    user_id: string
    type: 'check_in' | 'check_out'
    created_at: string
}

export default function AttendanceCard({ userId }: { userId: string }) {
    const [records, setRecords] = useState<AttendanceRecord[]>([])
    const [loading, setLoading] = useState(false)
    const [isWorking, setIsWorking] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        // 모바일 기기 감지
        const checkMobile = () => {
            const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera
            if (/android/i.test(userAgent) || /iPad|iPhone|iPod/.test(userAgent)) {
                setIsMobile(true)
            }
        }
        checkMobile()
    }, [])

    useEffect(() => {
        loadAttendance()

        // Realtime 구독 설정
        const supabase = createClient()
        console.log('🔌 [AttendanceCard] Setting up Realtime subscription for user:', userId)

        const channel = supabase
            .channel('attendance-user-changes')
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'attendance' },
                (payload) => {
                    console.log('🔔 [AttendanceCard] Realtime event:', payload)
                    // 현재 사용자의 기록이면 자동 업데이트
                    if (payload.new.user_id === userId) {
                        console.log('✅ [AttendanceCard] Updating for current user')
                        loadAttendance()
                    }
                }
            )
            .subscribe((status) => {
                console.log('📡 [AttendanceCard] Subscription status:', status)
            })

        return () => {
            console.log('🔌 [AttendanceCard] Cleaning up subscription')
            supabase.removeChannel(channel)
        }
    }, [userId])

    async function loadAttendance() {
        const result = await getTodayAttendance(userId)
        if (result.success && result.data) {
            setRecords(result.data as AttendanceRecord[])

            // Determine if currently working
            const lastRecord = result.data[result.data.length - 1] as AttendanceRecord | undefined
            setIsWorking(lastRecord?.type === 'check_in')
        }
    }

    async function handleCheckIn() {
        setLoading(true)
        setError(null)
        const result = await checkIn(userId)
        if (result.success) {
            await loadAttendance()
        } else {
            setError(result.error || '출근 처리에 실패했습니다.')
            console.error('Check-in failed:', result.error)
        }
        setLoading(false)
    }

    async function handleCheckOut() {
        setLoading(true)
        setError(null)
        const result = await checkOut(userId)
        if (result.success) {
            await loadAttendance()
        } else {
            setError(result.error || '퇴근 처리에 실패했습니다.')
            console.error('Check-out failed:', result.error)
        }
        setLoading(false)
    }

    const firstCheckIn = records.find(r => r.type === 'check_in')
    const lastCheckOut = [...records].reverse().find(r => r.type === 'check_out')

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    내 근태 상태
                </CardTitle>
                <CardDescription>오늘의 출퇴근 기록</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {isMobile && (
                    <div className="rounded-md bg-yellow-50 p-3 border border-yellow-200">
                        <p className="text-sm text-yellow-800">
                            모바일에서는 현황 조회만 가능합니다.<br />
                            출근 체크는 PC에서 진행해주세요.
                        </p>
                    </div>
                )}

                {/* Error Logic */}
                {error && (
                    <div className="rounded-md bg-red-50 p-3 border border-red-200">
                        <p className="text-sm text-red-800">{error}</p>
                        <p className="text-xs text-red-600 mt-1">
                            인증이 필요합니다. 로그인 후 다시 시도해주세요.
                        </p>
                    </div>
                )}
                <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">현재 상태</span>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${isWorking
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                        }`}>
                        <span className={`h-2 w-2 rounded-full ${isWorking ? 'bg-green-600' : 'bg-gray-400'
                            }`} />
                        {isWorking ? '근무 중' : '오프라인'}
                    </span>
                </div>
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">출근 시간</span>
                        <span className="font-medium text-gray-900">
                            {firstCheckIn
                                ? format(new Date(firstCheckIn.created_at), 'HH:mm', { locale: ko })
                                : '미기록'}
                        </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">퇴근 시간</span>
                        <span className={`font-medium ${lastCheckOut ? 'text-gray-900' : 'text-gray-400'}`}>
                            {lastCheckOut
                                ? format(new Date(lastCheckOut.created_at), 'HH:mm', { locale: ko })
                                : '미기록'}
                        </span>
                    </div>
                </div>
                <div className="flex gap-2 pt-2">
                    <Button
                        type="button"
                        className="flex-1"
                        variant="outline"
                        size="sm"
                        onClick={handleCheckIn}
                        disabled={loading || isWorking || isMobile}
                    >
                        <LogIn className="mr-2 h-4 w-4" />
                        출근
                    </Button>
                    <Button
                        type="button"
                        className="flex-1"
                        variant="outline"
                        size="sm"
                        onClick={handleCheckOut}
                        disabled={loading || !isWorking}
                    >
                        <LogOutIcon className="mr-2 h-4 w-4" />
                        퇴근
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}

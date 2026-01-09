'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Home, Calendar, MessageSquare, Clock, BarChart3, Gamepad2, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase-client'

const navigation = [
    { name: '대시보드', href: '/dashboard', icon: Home },
    { name: '캘린더', href: '/calendar', icon: Calendar },
    { name: '채팅', href: '/chat', icon: MessageSquare },
    { name: '근태 관리', href: '/attendance', icon: Clock },
    { name: '근태 통계', href: '/attendance/stats', icon: BarChart3 },
    { name: '미니게임', href: '/minigames', icon: Gamepad2 },
]

interface SidebarProps {
    user: {
        fullName: string
        email: string
        themeColor?: string
    }
}

import { useState } from 'react'
import ProfileModal, { THEME_COLORS } from './ProfileModal'

export default function Sidebar({ user }: SidebarProps) {
    const pathname = usePathname()
    const router = useRouter()
    const [isProfileOpen, setIsProfileOpen] = useState(false)

    const handleLogout = async (e: React.MouseEvent) => {
        e.stopPropagation() // 프로필 모달이 열리는 것을 방지
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    // 테마 색상에 해당하는 그라데이션 값 찾기
    const themeGradient = THEME_COLORS.find(c => c.id === user.themeColor)?.value || 'from-blue-500 to-cyan-500'

    return (
        <div className="flex h-screen w-64 flex-col bg-white border-r border-gray-200">
            {/* Logo */}
            <div className="flex h-16 items-center px-6 border-b border-gray-200">
                <h1 className="text-xl font-semibold text-gray-900">OurSpace</h1>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1 px-3 py-4">
                {navigation.map((item) => {
                    const isActive = pathname === item.href
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                                isActive
                                    ? 'bg-gray-100 text-gray-900'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            )}
                        >
                            <item.icon className="h-5 w-5" />
                            {item.name}
                        </Link>
                    )
                })}
            </nav>

            {/* User section */}
            <div className="border-t border-gray-200 p-4">
                <div
                    onClick={() => setIsProfileOpen(true)}
                    className="flex items-center gap-3 mb-3 cursor-pointer hover:bg-gray-50 p-2 -mx-2 rounded-lg transition-colors group"
                >
                    <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${themeGradient} flex items-center justify-center text-white font-semibold shadow-sm group-hover:shadow-md transition-shadow`}>
                        {user.fullName ? user.fullName[0].toUpperCase() : user.email[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                            {user.fullName || '사용자'}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                >
                    <LogOut className="h-4 w-4" />
                    로그아웃
                </button>
            </div>

            <ProfileModal
                isOpen={isProfileOpen}
                onClose={() => setIsProfileOpen(false)}
                currentUser={user}
            />
        </div>
    )
}

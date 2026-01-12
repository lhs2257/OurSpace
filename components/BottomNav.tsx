'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Calendar, MessageSquare, BarChart3, Gamepad2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
    { name: '홈', href: '/dashboard', icon: Home },
    { name: '캘린더', href: '/calendar', icon: Calendar },
    { name: '채팅', href: '/chat', icon: MessageSquare },
    { name: '통계', href: '/attendance/stats', icon: BarChart3 },
    { name: '게임', href: '/minigames', icon: Gamepad2 },
]

export default function BottomNav() {
    const pathname = usePathname()

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 md:hidden pb-[env(safe-area-inset-bottom)]">
            <nav className="flex justify-around items-center h-16">
                {navigation.map((item) => {
                    const isActive = pathname === item.href
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                'flex flex-col items-center justify-center w-full h-full space-y-1',
                                isActive
                                    ? 'text-blue-600'
                                    : 'text-gray-500 hover:text-gray-900'
                            )}
                        >
                            <item.icon className={cn("h-6 w-6", isActive && "fill-current")} />
                            <span className="text-[10px] font-medium">{item.name}</span>
                        </Link>
                    )
                })}
            </nav>
        </div>
    )
}

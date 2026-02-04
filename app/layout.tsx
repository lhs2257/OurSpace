import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/Sidebar'
import BottomNav from '@/components/BottomNav'
import { getCurrentUser } from '@/lib/get-user'

export const metadata: Metadata = {
    title: 'OurSpace - 사내 관리 도구',
    description: '2인 규모 사내 일정 공유, 실시간 채팅, 근태 관리 시스템',
    manifest: '/manifest.json',
    icons: {
        icon: '/logo.png',
        apple: '/logo.png',
    },
}

export const viewport = {
    themeColor: '#ffffff',
}

export default async function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const user = await getCurrentUser()

    // 로그인 페이지인지 확인 (user가 없으면 로그인 페이지로 간주)
    const showSidebar = user !== null

    return (
        <html lang="ko">
            <body className="bg-gray-50">
                {showSidebar ? (
                    <div className="flex h-screen overflow-hidden">
                        {/* Desktop Sidebar (hidden on mobile) */}
                        <div className="hidden md:flex">
                            <Sidebar user={{
                                fullName: user.fullName,
                                email: user.email || '',
                                themeColor: user.themeColor
                            }} />
                        </div>

                        <main className="flex-1 overflow-y-auto">
                            {/* Mobile Padding for Bottom Nav (pb-20), Desktop Padding (md:p-8) */}
                            <div className="container mx-auto p-4 pb-24 md:p-8">
                                {children}
                            </div>
                        </main>

                        {/* Mobile Bottom Nav */}
                        <BottomNav />
                    </div>
                ) : (
                    children
                )}
            </body>
        </html>
    )
}

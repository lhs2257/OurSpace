import { getCurrentUser } from '@/lib/get-user'
import { redirect } from 'next/navigation'
import CalendarClient from './CalendarClient'

export const metadata = {
    title: '캘린더 | OurSpace',
    description: '팀원 일정을 공유하고 확인하세요.',
}

export default async function CalendarPage() {
    const user = await getCurrentUser()

    if (!user) {
        redirect('/login')
    }

    return (
        <CalendarClient
            currentUser={{
                id: user.id,
                fullName: user.fullName,
                themeColor: user.themeColor || 'blue'
            }}
        />
    )
}

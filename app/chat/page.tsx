import ChatPageClient from './ChatPageClient'
import { getCurrentUser } from '@/lib/get-user'
import { redirect } from 'next/navigation'

export default async function ChatPage() {
    const user = await getCurrentUser()

    if (!user) {
        redirect('/login')
    }

    return <ChatPageClient userId={user.id} />
}

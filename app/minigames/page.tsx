import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import MinigamesClient from './MinigamesClient'

export default async function MinigamesPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    return <MinigamesClient />
}

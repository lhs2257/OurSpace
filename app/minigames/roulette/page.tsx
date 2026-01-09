import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import RouletteClient from './RouletteClient'

export default async function RoulettePage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    return <RouletteClient />
}

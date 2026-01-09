import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import AttendanceStatsClient from './AttendanceStatsClient';

export default async function AttendanceStatsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    return <AttendanceStatsClient />;
}

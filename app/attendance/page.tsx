import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import AttendancePageClient from './AttendancePageClient';

export default async function AttendancePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    return <AttendancePageClient />;
}

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import BottomNav from '@/components/BottomNav';
import styles from '../dashboard/layout.module.css';

export default async function ProfileLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');
    return (
        <div className={styles.shell}>
            <main className={styles.content}>{children}</main>
            <BottomNav />
        </div>
    );
}

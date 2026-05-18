import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SideMenu from '@/components/SideMenu';
import FAB from '@/components/FAB';
import styles from '../dashboard/layout.module.css';

export default async function WikiLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');
    return (
        <div className={styles.shell}>
            <SideMenu />
            <main className={styles.content}>{children}</main>
            <FAB />
        </div>
    );
}

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/server';
import HistoryClient from './HistoryClient';
import type { Transaction } from '@/lib/types';
import styles from './page.module.css';

function formatCurrency(amount: number) {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
}

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default async function HistoryPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: profile } = await supabase
        .from('profiles')
        .select('household_id')
        .eq('id', user.id)
        .single();

    if (!profile?.household_id) redirect('/setup');

    // Fetch all profiles in this household to determine names
    const { data: householdProfiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('household_id', profile.household_id);

    const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('household_id', profile.household_id)
        .order('date', { ascending: false });

    const byMonth: Record<string, Transaction[]> = {};
    (transactions ?? []).forEach((t: Transaction) => {
        const key = t.date.slice(0, 7); // YYYY-MM
        if (!byMonth[key]) byMonth[key] = [];
        byMonth[key].push(t);
    });

    const monthLabel = (key: string) => {
        const [y, m] = key.split('-');
        return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
    };

    const userName = user.user_metadata?.full_name?.split(' ')[0] ?? 'Tu';

    // Find partner's name from household profiles (the one that isn't the current user)
    const partnerProfile = householdProfiles?.find(p => p.id !== user.id);
    const partnerName = partnerProfile?.full_name?.split(' ')[0] ?? 'Partner';

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <h1 className={styles.title}>Storico 📋</h1>
            </header>

            {Object.keys(byMonth).length === 0 ? (
                <div className={styles.empty}>
                    <span>📋</span>
                    <p>Nessuna spesa ancora.<br />Aggiungi la prima!</p>
                </div>
            ) : (
                <HistoryClient
                    transactions={transactions ?? []}
                    userId={user.id}
                    userName={userName}
                    partnerName={partnerName}
                />
            )}
        </div>
    );
}

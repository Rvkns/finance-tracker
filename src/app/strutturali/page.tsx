import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { StructuralExpense } from '@/lib/types';
import StruttturaliClient from './StruttturaliClient';
import styles from './page.module.css';

export default async function StrutturaliPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: profile } = await supabase
        .from('profiles')
        .select('household_id, full_name')
        .eq('id', user.id)
        .single();

    if (!profile?.household_id) redirect('/setup');

    const { data: householdProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, salary')
        .eq('household_id', profile.household_id);

    const userName = profile.full_name?.split(' ')[0] ?? 'Tu';
    const partnerProfile = householdProfiles?.find(p => p.id !== user.id);
    const partnerName = partnerProfile?.full_name?.split(' ')[0] ?? 'Partner';

    // ── Fetch structural expenses ──────────────────────────────────────
    const { data: structuralExpenses } = await supabase
        .from('structural_expenses')
        .select('*')
        .eq('household_id', profile.household_id)
        .order('created_at', { ascending: true });

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <h1 className={styles.title}>Spese Strutturali 🏗️</h1>
                <p className={styles.subtitle}>Gestisci mutuo, rate, prestiti e spese fisse a lungo termine</p>
            </header>

            <StruttturaliClient
                initialExpenses={(structuralExpenses ?? []) as StructuralExpense[]}
                userId={user.id}
                userName={userName}
                partnerName={partnerName}
                partnerId={partnerProfile?.id ?? null}
                householdId={profile.household_id}
            />
        </div>
    );
}

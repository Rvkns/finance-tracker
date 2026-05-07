import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import RecurringClient from './RecurringClient';
import styles from './page.module.css';

function formatCurrency(amount: number) {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
}

export default async function RecurringPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: profile } = await supabase
        .from('profiles')
        .select('household_id')
        .eq('id', user.id)
        .single();

    if (!profile?.household_id) redirect('/setup');

    const { data: recurringExpenses } = await supabase
        .from('recurring_expenses')
        .select('*')
        .eq('household_id', profile.household_id)
        .order('amount', { ascending: false });

    const totalFixedCost = (recurringExpenses ?? []).reduce((sum, exp) => sum + Number(exp.amount), 0);

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <h1 className={styles.title}>Spese Fisse 🔄</h1>
                <p className={styles.subtitle}>Gestisci i tuoi abbonamenti e costi ricorrenti</p>
            </header>

            <div className={styles.totalCard}>
                <p className={styles.totalLabel}>Costo Fisso Mensile Totale</p>
                <p className={styles.totalAmount}>{formatCurrency(totalFixedCost)}</p>
            </div>

            <RecurringClient
                initialExpenses={recurringExpenses ?? []}
                householdId={profile.household_id}
            />
        </div>
    );
}

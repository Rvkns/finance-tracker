import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { Subscription } from '@/lib/types';
import SubscriptionsClient from './SubscriptionsClient';
import styles from './page.module.css';

export default async function AbbonamentiPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // Fetch user profile to get household_id and salary
    const { data: profile } = await supabase
        .from('profiles')
        .select('household_id, full_name, salary')
        .eq('id', user.id)
        .single();

    if (!profile?.household_id) redirect('/setup');

    // Fetch all profiles in this household to get partner's details
    const { data: householdProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, salary')
        .eq('household_id', profile.household_id);

    const userName = profile.full_name?.split(' ')[0] ?? 'Tu';
    const mySalary = Number(profile.salary) || 0;

    const partnerProfile = householdProfiles?.find(p => p.id !== user.id);
    const partnerName = partnerProfile?.full_name?.split(' ')[0] ?? 'Partner';
    const partnerSalary = Number(partnerProfile?.salary) || 0;

    // Fetch subscriptions
    // If the table doesn't exist yet (migration not run), this might throw an error.
    // We can handle the error gracefully to tell the user to run the migration.
    const { data: subscriptions, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('household_id', profile.household_id)
        .order('amount', { ascending: false });

    if (error) {
        return (
            <div className={styles.page}>
                <header className={styles.header}>
                    <h1 className={styles.title}>Abbonamenti Mensili</h1>
                </header>
                <div className={styles.empty} style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>
                    <p>⚠️ Errore nel caricamento degli abbonamenti.</p>
                    <p>Assicurati di aver eseguito lo script SQL di migrazione nel database (Supabase SQL Editor).</p>
                    <p style={{ fontSize: '0.8rem', marginTop: '1rem', opacity: 0.7 }}>Dettaglio errore: {error.message}</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <div className={styles.topNav}>
                <Link href="/dashboard" className={styles.navLink}>
                    <span>🏠</span> Home
                </Link>
                <Link href="/profile" className={styles.navLink}>
                    <span>👤</span> Profilo
                </Link>
            </div>

            <header className={styles.header}>
                <h1 className={styles.title}>Abbonamenti Mensili</h1>
                <p className={styles.subtitle}>Gestisci i tuoi servizi ricorrenti e monitora l&apos;impatto sul tuo stipendio.</p>
            </header>

            <SubscriptionsClient 
                subscriptions={subscriptions as Subscription[]}
                userId={user.id}
                userName={userName}
                mySalary={mySalary}
                partnerName={partnerName}
                partnerSalary={partnerSalary}
                householdId={profile.household_id}
            />
        </div>
    );
}

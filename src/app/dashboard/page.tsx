import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CATEGORIES, getCategoryById } from '@/lib/categories';
import type { Transaction } from '@/lib/types';
import DashboardClient from './DashboardClient';
import styles from './page.module.css';

function formatCurrency(amount: number) {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
}

function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Oggi';
    if (date.toDateString() === yesterday.toDateString()) return 'Ieri';
    return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
}

export default async function DashboardPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

    const { data: profile } = await supabase
        .from('profiles')
        .select('household_id, full_name')
        .eq('id', user.id)
        .single();

    if (!profile?.household_id) redirect('/setup');

    // Fetch all profiles in this household to determine names
    const { data: householdProfiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('household_id', profile.household_id);

    // Fetch transactions
    const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('household_id', profile.household_id)
        .gte('date', startOfMonth)
        .lte('date', endOfMonth)
        .order('date', { ascending: false });

    const recentTransactions = (transactions ?? []).slice(0, 20);

    const monthlyTotal = (transactions ?? []).reduce((sum: number, t: Transaction) => sum + Number(t.amount), 0);
    const myTotal = (transactions ?? [])
        .filter((t: Transaction) => t.user_id === user.id)
        .reduce((sum: number, t: Transaction) => sum + Number(t.amount), 0);
    const partnerTotal = monthlyTotal - myTotal;

    const userName = profile.full_name?.split(' ')[0] ?? 'Tu';

    // Find partner's name from household profiles (the one that isn't the current user)
    const partnerProfile = householdProfiles?.find(p => p.id !== user.id);
    const partnerName = partnerProfile?.full_name?.split(' ')[0] ?? 'Partner';

    // 💸 SPLIT EXPENSES LOGIC
    const fairShare = monthlyTotal / 2;
    // Positive balance = user paid more than their fair share -> partner owes them
    // Negative balance = user paid less than their fair share -> user owes partner
    const myBalance = myTotal - fairShare;
    let balanceMessage = 'Siete in pari!';
    let balanceColor = 'var(--text-secondary)';
    let balanceIcon = '🤝';

    if (myBalance > 0.01) {
        // Partner owes me
        balanceMessage = `${partnerName} ti deve ${formatCurrency(myBalance)}`;
        balanceColor = 'var(--success)';
        balanceIcon = '⬆️';
    } else if (myBalance < -0.01) {
        // I owe partner
        balanceMessage = `Devi ${formatCurrency(Math.abs(myBalance))} a ${partnerName}`;
        balanceColor = 'var(--danger)';
        balanceIcon = '⬇️';
    }

    const monthName = now.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });

    return (
        <div className={styles.page}>
            {/* Header */}
            <header className={styles.header}>
                <div>
                    <p className={styles.greeting}>Ciao, {userName} 👋</p>
                    <h1 className={styles.month}>{monthName}</h1>
                </div>
                <div className={styles.avatar}>
                    {userName.charAt(0).toUpperCase()}
                </div>
            </header>

            {/* Monthly Summary Card */}
            <div className={styles.summaryCard}>
                <p className={styles.summaryLabel}>Totale speso questo mese</p>
                <p className={styles.summaryTotal}>{formatCurrency(monthlyTotal)}</p>
                <div className={styles.summaryBreakdown}>
                    <div className={styles.summaryUser}>
                        <span className={styles.userDot} style={{ background: 'var(--accent)' }} />
                        <div>
                            <p className={styles.summaryName}>{userName}</p>
                            <p className={styles.summaryAmount}>{formatCurrency(myTotal)}</p>
                        </div>
                    </div>
                    <div className={styles.summaryUser}>
                        <span className={styles.userDot} style={{ background: 'var(--success)' }} />
                        <div>
                            <p className={styles.summaryName}>{partnerName}</p>
                            <p className={styles.summaryAmount}>{formatCurrency(partnerTotal)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Fair Share / Split Expenses Widget */}
            {monthlyTotal > 0 && (
                <div className={styles.splitWidget} style={{ borderColor: balanceColor }}>
                    <div className={styles.splitIcon} style={{ background: `${balanceColor}22`, color: balanceColor }}>
                        {balanceIcon}
                    </div>
                    <div className={styles.splitText}>
                        <p className={styles.splitLabel}>Bilancio 50/50</p>
                        <p className={styles.splitMessage} style={{ color: balanceColor }}>
                            {balanceMessage}
                        </p>
                    </div>
                </div>
            )}

            {/* Recent Transactions */}
            <DashboardClient
                initialTransactions={recentTransactions}
                userId={user.id}
                userName={userName}
                partnerName={partnerName}
            />
        </div>
    );
}

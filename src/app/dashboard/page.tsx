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
        .select('household_id, full_name, salary')
        .eq('id', user.id)
        .single();

    if (!profile?.household_id) redirect('/setup');

    // Fetch all profiles in this household to determine names and salaries
    const { data: householdProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, salary')
        .eq('household_id', profile.household_id);

    // Fetch household preferences
    const { data: household } = await supabase
        .from('households')
        .select('split_mode')
        .eq('id', profile.household_id)
        .single();

    const splitMode = household?.split_mode || 'equal';

    // Fetch transactions for the current month
    const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('household_id', profile.household_id)
        .gte('date', startOfMonth)
        .lte('date', endOfMonth)
        .order('date', { ascending: false });

    // Fetch the 20 most recent transactions overall (for the history section)
    const { data: recentAllTransactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('household_id', profile.household_id)
        .order('date', { ascending: false })
        .limit(20);

    // Fetch ALL historical transactions for cumulative balance
    const { data: allTransactions } = await supabase
        .from('transactions')
        .select('user_id, amount')
        .eq('household_id', profile.household_id);

    const recentTransactions = (recentAllTransactions ?? []);

    const monthlyTotal = (transactions ?? []).reduce((sum: number, t: Transaction) => sum + Number(t.amount), 0);
    const myTotal = (transactions ?? [])
        .filter((t: Transaction) => t.user_id === user.id)
        .reduce((sum: number, t: Transaction) => sum + Number(t.amount), 0);
    const partnerTotal = monthlyTotal - myTotal;

    const userName = profile.full_name?.split(' ')[0] ?? 'Tu';

    // Find partner's name from household profiles (the one that isn't the current user)
    const partnerProfile = householdProfiles?.find(p => p.id !== user.id);
    const partnerName = partnerProfile?.full_name?.split(' ')[0] ?? 'Partner';

    // 💸 SALARY LOGIC
    const mySalary = Number(profile.salary) || 0;
    const partnerSalary = Number(partnerProfile?.salary) || 0;
    const totalIncome = mySalary + partnerSalary;
    let myWeight = 0.5;

    if (splitMode === 'proportional' && totalIncome > 0) {
        myWeight = mySalary / totalIncome;
    }

    // 📊 CUMULATIVE ALL-TIME BALANCE
    const allMyTotal = (allTransactions ?? [])
        .filter(t => t.user_id === user.id)
        .reduce((sum, t) => sum + Number(t.amount), 0);
    const allPartnerTotal = (allTransactions ?? [])
        .filter(t => t.user_id !== user.id)
        .reduce((sum, t) => sum + Number(t.amount), 0);
    const allTotal = allMyTotal + allPartnerTotal;

    let allFairShare: number;
    if (splitMode === 'proportional' && totalIncome > 0) {
        allFairShare = allTotal * myWeight;
    } else {
        allFairShare = allTotal / 2;
    }
    const cumulativeBalance = allMyTotal - allFairShare; // + means partner owes me, - means I owe partner
    let cumulativeMessage = 'Siete in pari!';
    let cumulativeColor = 'var(--text-secondary)';
    let cumulativeIcon = '🤝';

    if (cumulativeBalance > 0.01) {
        cumulativeMessage = `${partnerName} ti deve ${formatCurrency(cumulativeBalance)}`;
        cumulativeColor = 'var(--success)';
        cumulativeIcon = '💚';
    } else if (cumulativeBalance < -0.01) {
        cumulativeMessage = `Devi ${formatCurrency(Math.abs(cumulativeBalance))} a ${partnerName}`;
        cumulativeColor = 'var(--danger)';
        cumulativeIcon = '🔴';
    }

    const monthName = now.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });

    return (
        <div className={styles.page}>
            {/* Header */}
            <header className={styles.header}>
                <div>
                    <p className={styles.greeting}>Ciao, {userName} 👋</p>
                    <h1 className={styles.month}>{monthName}</h1>
                    <div className={styles.splitModeBadge}>
                        ⚖️ Div: {splitMode === 'equal' ? '50/50' : 'Proporzionale'}
                    </div>
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

            {/* Cumulative All-Time Balance Widget */}
            <div className={styles.cumulativeWidget} style={{ borderColor: cumulativeColor }}>
                <div className={styles.cumulativeHeader}>
                    <span className={styles.cumulativeIcon}>{cumulativeIcon}</span>
                    <div>
                        <p className={styles.cumulativeLabel}>Saldo Cumulativo (storico completo)</p>
                        <p className={styles.cumulativeMessage} style={{ color: cumulativeColor }}>
                            {cumulativeMessage}
                        </p>
                    </div>
                </div>
                <div className={styles.cumulativeBreakdown}>
                    <div className={styles.cumulativeStat}>
                        <span className={styles.cumulativeStatLabel}>{userName} (tot.)</span>
                        <span className={styles.cumulativeStatValue} style={{ color: 'var(--accent-light)' }}>{formatCurrency(allMyTotal)}</span>
                    </div>
                    <div className={styles.cumulativeDivider} />
                    <div className={styles.cumulativeStat}>
                        <span className={styles.cumulativeStatLabel}>{partnerName} (tot.)</span>
                        <span className={styles.cumulativeStatValue} style={{ color: 'var(--success)' }}>{formatCurrency(allPartnerTotal)}</span>
                    </div>
                </div>
            </div>



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

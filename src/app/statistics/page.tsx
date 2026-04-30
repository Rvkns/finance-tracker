import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CATEGORIES, getCategoryById } from '@/lib/categories';
import CategoryBudgets from './CategoryBudgets';
import TimeRangeSelector from './TimeRangeSelector';
import Rule503020Widget from './Rule503020Widget';
import type { Transaction } from '@/lib/types';
import styles from './page.module.css';

function formatCurrency(amount: number) {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
}

export default async function StatisticsPage({ searchParams }: { searchParams: { range?: string } }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const range = searchParams.range || 'month';
    const now = new Date();
    let startDate: string;
    let endDate: string;
    let dateLabel: string;

    if (range === 'week') {
        const firstDay = new Date(now);
        firstDay.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)); // Start on Monday
        firstDay.setHours(0, 0, 0, 0);
        startDate = firstDay.toISOString();
        const lastDay = new Date(firstDay);
        lastDay.setDate(firstDay.getDate() + 6);
        lastDay.setHours(23, 59, 59, 999);
        endDate = lastDay.toISOString();
        dateLabel = "Questa settimana";
    } else if (range === 'year') {
        startDate = new Date(now.getFullYear(), 0, 1).toISOString();
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59).toISOString();
        dateLabel = `Anno ${now.getFullYear()}`;
    } else { // default 'month'
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
        dateLabel = now.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('household_id')
        .eq('id', user.id)
        .single();

    if (!profile?.household_id) redirect('/setup');

    const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('household_id', profile.household_id)
        .gte('date', startDate)
        .lte('date', endDate);

    const { data: structuralExpenses } = await supabase
        .from('structural_expenses')
        .select('*')
        .eq('household_id', profile.household_id);

    const { data: budgets } = await supabase
        .from('budgets')
        .select('*')
        .eq('household_id', profile.household_id);

    const { data: houseProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, salary')
        .eq('household_id', profile.household_id);

    const totalIncome = (houseProfiles ?? []).reduce((acc, p) => acc + (Number(p.salary) || 0), 0);

    const myProfile = (houseProfiles ?? []).find(p => p.id === user.id);
    const partnerProfile = (houseProfiles ?? []).find(p => p.id !== user.id);
    const myIncome = Number(myProfile?.salary) || 0;
    const partnerIncome = Number(partnerProfile?.salary) || 0;

    const total = (transactions ?? []).reduce((s: number, t: Transaction) => s + Number(t.amount), 0);
    const myTotal = (transactions ?? []).filter((t: Transaction) => t.user_id === user.id)
        .reduce((s: number, t: Transaction) => s + Number(t.amount), 0);
    const partnerTotal = total - myTotal;

    // By category & 50/30/20 calculation (total + per-user)
    const byCat: Record<string, number> = {};
    let needsActual = 0;
    let wantsActual = 0;
    let myNeedsActual = 0;
    let myWantsActual = 0;
    let partnerNeedsActual = 0;
    let partnerWantsActual = 0;

    (transactions ?? []).forEach((t: Transaction) => {
        const amount = Number(t.amount);
        byCat[t.category_id] = (byCat[t.category_id] ?? 0) + amount;

        const categoryMeta = getCategoryById(t.category_id);
        const isMe = t.user_id === user.id;

        if (categoryMeta.rule === 'needs') {
            needsActual += amount;
            if (isMe) myNeedsActual += amount; else partnerNeedsActual += amount;
        } else if (categoryMeta.rule === 'wants') {
            wantsActual += amount;
            if (isMe) myWantsActual += amount; else partnerWantsActual += amount;
        }
    });

    const catData = CATEGORIES.map(cat => ({
        ...cat,
        total: byCat[cat.id] ?? 0,
        pct: total > 0 ? ((byCat[cat.id] ?? 0) / total) * 100 : 0,
    })).filter(c => c.total > 0).sort((a, b) => b.total - a.total);

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <h1 className={styles.title}>Statistiche 📊</h1>
                <p className={styles.subtitle} style={{ textTransform: 'capitalize' }}>{dateLabel}</p>
            </header>

            <TimeRangeSelector />

            {/* Overview */}
            <div className={styles.overviewGrid}>
                <div className={styles.overviewCard}>
                    <p className={styles.overviewLabel}>Totale</p>
                    <p className={styles.overviewValue}>{formatCurrency(total)}</p>
                </div>
                <div className={styles.overviewCard}>
                    <p className={styles.overviewLabel}>Tu</p>
                    <p className={styles.overviewValue} style={{ color: 'var(--accent-light)' }}>{formatCurrency(myTotal)}</p>
                </div>
                <div className={styles.overviewCard}>
                    <p className={styles.overviewLabel}>Partner</p>
                    <p className={styles.overviewValue} style={{ color: 'var(--success)' }}>{formatCurrency(partnerTotal)}</p>
                </div>
            </div>

            <Rule503020Widget
                totalIncome={totalIncome}
                needsActual={needsActual}
                wantsActual={wantsActual}
                myIncome={myIncome}
                myNeedsActual={myNeedsActual}
                myWantsActual={myWantsActual}
                partnerIncome={partnerIncome}
                partnerNeedsActual={partnerNeedsActual}
                partnerWantsActual={partnerWantsActual}
            />

            {/* By Category */}
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Spese per categoria</h2>
                {catData.length === 0 ? (
                    <p className={styles.empty}>Nessuna spesa questo mese.</p>
                ) : (
                    <CategoryBudgets
                        catData={catData as any}
                        initialBudgets={budgets ?? []}
                        householdId={profile.household_id}
                    />
                )}
            </section>

            {/* Structural Expenses */}
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Spese Strutturali Mensili</h2>
                {(!structuralExpenses || structuralExpenses.length === 0) ? (
                    <p className={styles.empty}>Nessuna spesa strutturale.</p>
                ) : (
                    <div className={styles.structuralGrid}>
                        {structuralExpenses.map(expense => (
                            <div key={expense.id} className={styles.structuralCard}>
                                <p className={styles.structuralName}>{expense.name}</p>
                                <p className={styles.structuralAmount}>{formatCurrency(Number(expense.amount))}</p>
                            </div>
                        ))}
                        <div className={styles.structuralCard} style={{ background: 'var(--accent)', color: 'white' }}>
                            <p className={styles.structuralName} style={{ color: 'rgba(255, 255, 255, 0.8)' }}>Totale Strutturale Mensile</p>
                            <p className={styles.structuralAmount}>{formatCurrency(structuralExpenses.reduce((s, e) => s + Number(e.amount), 0))}</p>
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}

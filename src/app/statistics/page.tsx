import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CATEGORIES, getCategoryById } from '@/lib/categories';
import type { Transaction } from '@/lib/types';
import styles from './page.module.css';

function formatCurrency(amount: number) {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
}

export default async function StatisticsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

    const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .gte('date', startOfMonth)
        .lte('date', endOfMonth);

    const monthName = now.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
    const total = (transactions ?? []).reduce((s: number, t: Transaction) => s + Number(t.amount), 0);
    const myTotal = (transactions ?? []).filter((t: Transaction) => t.user_id === user.id)
        .reduce((s: number, t: Transaction) => s + Number(t.amount), 0);
    const partnerTotal = total - myTotal;

    // By category
    const byCat: Record<string, number> = {};
    (transactions ?? []).forEach((t: Transaction) => {
        byCat[t.category_id] = (byCat[t.category_id] ?? 0) + Number(t.amount);
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
                <p className={styles.subtitle} style={{ textTransform: 'capitalize' }}>{monthName}</p>
            </header>

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

            {/* By Category */}
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Spese per categoria</h2>
                {catData.length === 0 ? (
                    <p className={styles.empty}>Nessuna spesa questo mese.</p>
                ) : (
                    <ul className={styles.catList}>
                        {catData.map(cat => (
                            <li key={cat.id} className={styles.catItem}>
                                <div className={styles.catLeft}>
                                    <span className={styles.catIcon}>{cat.icon}</span>
                                    <span className={styles.catName}>{cat.name}</span>
                                </div>
                                <div className={styles.catRight}>
                                    <div className={styles.barBg}>
                                        <div
                                            className={styles.bar}
                                            style={{ width: `${cat.pct}%`, background: cat.color }}
                                        />
                                    </div>
                                    <span className={styles.catTotal}>{formatCurrency(cat.total)}</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
}

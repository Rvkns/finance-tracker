import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCategoryById } from '@/lib/categories';
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

    const { data: transactions } = await supabase
        .from('transactions')
        .select('*, profiles(full_name)')
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
                Object.entries(byMonth).map(([month, txs]) => {
                    const total = txs.reduce((s, t) => s + Number(t.amount), 0);
                    return (
                        <section key={month} className={styles.monthSection}>
                            <div className={styles.monthHeader}>
                                <h2 className={styles.monthLabel}>{monthLabel(month)}</h2>
                                <span className={styles.monthTotal}>{formatCurrency(total)}</span>
                            </div>
                            <ul className={styles.list}>
                                {txs.map((t: Transaction) => {
                                    const cat = getCategoryById(t.category_id);
                                    const isMe = t.user_id === user.id;
                                    return (
                                        <li key={t.id} className={styles.item}>
                                            <div className={styles.catIcon} style={{ background: cat.color + '22', color: cat.color }}>
                                                {cat.icon}
                                            </div>
                                            <div className={styles.info}>
                                                <p className={styles.catName}>{cat.name}</p>
                                                {t.description && <p className={styles.desc}>{t.description}</p>}
                                                <div className={styles.meta}>
                                                    <span className={styles.date}>{formatDate(t.date)}</span>
                                                    <span className={`${styles.user} ${isMe ? styles.me : styles.partner}`}>
                                                        {isMe ? userName : (t.profiles?.full_name?.split(' ')[0] ?? 'Partner')}
                                                    </span>
                                                </div>
                                            </div>
                                            <p className={styles.amount}>-{formatCurrency(Number(t.amount))}</p>
                                        </li>
                                    );
                                })}
                            </ul>
                        </section>
                    );
                })
            )}
        </div>
    );
}

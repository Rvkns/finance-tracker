import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCategoryById } from '@/lib/categories';
import type { Transaction } from '@/lib/types';
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

    // Fetch all transactions current user has access to (month + recent)
    const { data: transactions } = await supabase
        .from('transactions')
        .select('*, profiles(full_name)')
        .gte('date', startOfMonth)
        .lte('date', endOfMonth)
        .order('date', { ascending: false })
        .limit(100);

    const { data: recentTransactions } = await supabase
        .from('transactions')
        .select('*, profiles(full_name)')
        .order('date', { ascending: false })
        .limit(20);

    const monthlyTotal = (transactions ?? []).reduce((sum: number, t: Transaction) => sum + Number(t.amount), 0);
    const myTotal = (transactions ?? [])
        .filter((t: Transaction) => t.user_id === user.id)
        .reduce((sum: number, t: Transaction) => sum + Number(t.amount), 0);
    const partnerTotal = monthlyTotal - myTotal;

    const userName = user.user_metadata?.full_name?.split(' ')[0] ?? 'Tu';
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
                            <p className={styles.summaryName}>Partner</p>
                            <p className={styles.summaryAmount}>{formatCurrency(partnerTotal)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Transactions */}
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Ultime spese</h2>
                {!recentTransactions || recentTransactions.length === 0 ? (
                    <div className={styles.empty}>
                        <span>💸</span>
                        <p>Nessuna spesa registrata.<br />Premi <strong>+</strong> per aggiungerne una!</p>
                    </div>
                ) : (
                    <ul className={styles.transactionList}>
                        {recentTransactions.map((t: Transaction) => {
                            const cat = getCategoryById(t.category_id);
                            const isMe = t.user_id === user.id;
                            return (
                                <li key={t.id} className={styles.transactionItem + ' animate-fade'}>
                                    <div className={styles.catIcon} style={{ background: cat.color + '22', color: cat.color }}>
                                        {cat.icon}
                                    </div>
                                    <div className={styles.transactionInfo}>
                                        <p className={styles.transactionCat}>{cat.name}</p>
                                        {t.description && <p className={styles.transactionDesc}>{t.description}</p>}
                                        <div className={styles.transactionMeta}>
                                            <span className={styles.transactionDate}>{formatDate(t.date)}</span>
                                            <span className={`${styles.transactionUser} ${isMe ? styles.me : styles.partner}`}>
                                                {isMe ? userName : (t.profiles?.full_name?.split(' ')[0] ?? 'Partner')}
                                            </span>
                                        </div>
                                    </div>
                                    <p className={styles.transactionAmount}>-{formatCurrency(Number(t.amount))}</p>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>
        </div>
    );
}

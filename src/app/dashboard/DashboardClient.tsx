'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getCategoryById } from '@/lib/categories';
import type { Transaction, RecurringExpense } from '@/lib/types';
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

export default function DashboardClient({
    initialTransactions,
    pendingRecurring,
    userId,
    userName,
    partnerName
}: {
    initialTransactions: Transaction[];
    pendingRecurring: RecurringExpense[];
    userId: string;
    userName: string;
    partnerName: string;
}) {
    const router = useRouter();
    const [transactions, setTransactions] = useState(initialTransactions);
    const [pendingFixed, setPendingFixed] = useState(pendingRecurring);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [payingId, setPayingId] = useState<string | null>(null);

    const handleDelete = async (id: string) => {
        if (!confirm('Sei sicuro di voler eliminare questa spesa?')) return;

        setDeletingId(id);
        const supabase = createClient();

        const { error } = await supabase
            .from('transactions')
            .delete()
            .eq('id', id);

        if (!error) {
            setTransactions(prev => prev.filter(t => t.id !== id));
        } else {
            alert('Errore durante l\'eliminazione della spesa.');
        }

        setDeletingId(null);
    };

    const handlePayFixed = async (exp: RecurringExpense) => {
        setPayingId(exp.id);
        const supabase = createClient();

        // Calcola la data: usa il giorno di addebito configurato nel mese corrente, altrimenti oggi
        let txDate: string;
        if (exp.day_of_month) {
            const now = new Date();
            // Limita il giorno al massimo dei giorni del mese corrente (es. febbraio non ha il 31)
            const maxDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            const day = Math.min(exp.day_of_month, maxDay);
            txDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        } else {
            txDate = new Date().toISOString().split('T')[0]; // fallback: oggi
        }

        // 1. Create the new transaction
        const newTx = {
            user_id: userId,
            household_id: exp.household_id,
            amount: exp.amount,
            category_id: exp.category_id,
            description: exp.name,
            date: txDate,
        };

        const { data, error } = await supabase
            .from('transactions')
            .insert(newTx)
            .select()
            .single();

        if (!error && data) {
            // 2. Remove it from the pending list directly on the client
            setPendingFixed(prev => prev.filter(p => p.id !== exp.id));
            // 3. Add to the transaction list so the user sees it immediately
            setTransactions(prev => [data, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            // 4. Trigger router refresh to update server-side balances and total sums
            router.refresh();
        } else {
            alert('Errore durante la registrazione del pagamento.');
        }

        setPayingId(null);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* PENDING FIXED EXPENSES */}
            {pendingFixed.length > 0 && (
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle} style={{ color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>⚠️</span> Da Pagare
                    </h2>
                    <ul className={styles.transactionList}>
                        {pendingFixed.map(exp => {
                            const cat = getCategoryById(exp.category_id);
                            const isPaying = payingId === exp.id;
                            const dayLabel = exp.created_at
                                ? new Date(exp.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
                                : 'Spesa Fissa';
                            return (
                                <li key={exp.id} className={styles.transactionItem}>
                                    <div className={styles.itemContent} style={{ opacity: isPaying ? 0.5 : 1 }}>
                                        <div className={styles.catIcon} style={{ background: cat.color + '22', color: cat.color }}>
                                            {cat.icon}
                                        </div>
                                        <div className={styles.transactionInfo}>
                                            <p className={styles.transactionCat}>{exp.name}</p>
                                            <div className={styles.transactionMeta}>
                                                <span className={styles.transactionDate}>{dayLabel}</span>
                                            </div>
                                        </div>
                                        <p className={styles.transactionAmount} style={{ alignSelf: 'center', margin: '0 8px' }}>
                                            {formatCurrency(exp.amount)}
                                        </p>
                                        <button
                                            onClick={() => handlePayFixed(exp)}
                                            disabled={isPaying}
                                            style={{
                                                background: 'var(--success)', color: 'white', border: 'none',
                                                borderRadius: '20px', padding: '6px 12px', fontSize: '12px',
                                                fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap'
                                            }}
                                        >
                                            {isPaying ? '...' : 'Registra'}
                                        </button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </section>
            )}

            {/* RECENT TRANSACTIONS */}
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Ultime spese</h2>
                {!transactions || transactions.length === 0 ? (
                    <div className={styles.empty}>
                        <span>💸</span>
                        <p>Nessuna spesa registrata.<br />Premi <strong>+</strong> per aggiungerne una!</p>
                    </div>
                ) : (
                    <>
                        <ul className={styles.transactionList}>
                            {transactions.map((t: Transaction) => {
                                const cat = getCategoryById(t.category_id);
                                const isMe = t.user_id === userId;
                                const isDeleting = deletingId === t.id;

                                return (
                                    <li key={t.id} className={`${styles.transactionItem} ${isDeleting ? styles.itemDeleting : ''} animate-fade`}>
                                        <div className={styles.itemContent}>
                                            <div className={styles.catIcon} style={{ background: cat.color + '22', color: cat.color }}>
                                                {cat.icon}
                                            </div>
                                            <div className={styles.transactionInfo}>
                                                <p className={styles.transactionCat}>{cat.name}</p>
                                                {t.description && <p className={styles.transactionDesc}>{t.description}</p>}
                                                <div className={styles.transactionMeta}>
                                                    <span className={styles.transactionDate}>{formatDate(t.date)}</span>
                                                    <span className={`${styles.transactionUser} ${isMe ? styles.me : styles.partner}`}>
                                                        {isMe ? userName : partnerName}
                                                    </span>
                                                </div>
                                            </div>
                                            <p className={styles.transactionAmount}>-{formatCurrency(Number(t.amount))}</p>
                                        </div>

                                        {isMe && (
                                            <button
                                                className={styles.deleteBtn}
                                                onClick={() => handleDelete(t.id)}
                                                disabled={isDeleting}
                                                aria-label="Elimina spesa"
                                            >
                                                🗑️
                                            </button>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                        <div style={{ textAlign: 'center', marginTop: '16px' }}>
                            <Link href="/dashboard/history" style={{ fontSize: '13px', color: 'var(--accent-light)', textDecoration: 'none', fontWeight: 600 }}>
                                Vedi storico completo →
                            </Link>
                        </div>
                    </>
                )}
            </section>
        </div>
    );
}

'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
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

export default function DashboardClient({
    initialTransactions,
    userId,
    userName,
    partnerName
}: {
    initialTransactions: Transaction[];
    userId: string;
    userName: string;
    partnerName: string;
}) {
    const [transactions, setTransactions] = useState(initialTransactions);
    const [deletingId, setDeletingId] = useState<string | null>(null);

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

    return (
        <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Ultime spese</h2>
            {!transactions || transactions.length === 0 ? (
                <div className={styles.empty}>
                    <span>💸</span>
                    <p>Nessuna spesa registrata.<br />Premi <strong>+</strong> per aggiungerne una!</p>
                </div>
            ) : (
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
            )}
        </section>
    );
}

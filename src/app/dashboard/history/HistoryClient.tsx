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
    return new Date(dateStr).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function HistoryClient({
    transactions: initialTransactions,
    userId,
    userName,
    partnerName
}: {
    transactions: Transaction[];
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

    const byMonth: Record<string, Transaction[]> = {};
    transactions.forEach((t: Transaction) => {
        const key = t.date.slice(0, 7); // YYYY-MM
        if (!byMonth[key]) byMonth[key] = [];
        byMonth[key].push(t);
    });

    const monthLabel = (key: string) => {
        const [y, m] = key.split('-');
        return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
    };

    if (Object.keys(byMonth).length === 0) {
        return (
            <div className={styles.empty}>
                <span>📋</span>
                <p>Nessuna spesa ancora.<br />Aggiungi la prima!</p>
            </div>
        );
    }

    return (
        <>
            {Object.entries(byMonth).map(([month, txs]) => {
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
                                const isMe = t.user_id === userId;
                                const isDeleting = deletingId === t.id;

                                return (
                                    <li key={t.id} className={`${styles.item} ${isDeleting ? styles.itemDeleting : ''}`}>
                                        <div className={styles.itemContent}>
                                            <div className={styles.catIcon} style={{ background: cat.color + '22', color: cat.color }}>
                                                {cat.icon}
                                            </div>
                                            <div className={styles.info}>
                                                <p className={styles.catName}>{cat.name}</p>
                                                {t.description && <p className={styles.desc}>{t.description}</p>}
                                                <div className={styles.meta}>
                                                    <span className={styles.date}>{formatDate(t.date)}</span>
                                                    <span className={`${styles.user} ${isMe ? styles.me : styles.partner}`}>
                                                        {isMe ? userName : partnerName}
                                                    </span>
                                                </div>
                                            </div>
                                            <p className={styles.amount}>-{formatCurrency(Number(t.amount))}</p>
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
                    </section>
                );
            })}
        </>
    );
}

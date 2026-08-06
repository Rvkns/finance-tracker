'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getCategoryById, CATEGORIES } from '@/lib/categories';
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
    const router = useRouter();
    const [transactions, setTransactions] = useState(initialTransactions);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Filtri
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedUser, setSelectedUser] = useState<string>('all');

    const filteredTransactions = transactions.filter(t => {
        const matchesCategory = selectedCategory === 'all' || t.category_id === selectedCategory;
        const matchesUser = selectedUser === 'all' || 
            (selectedUser === 'me' && t.user_id === userId) ||
            (selectedUser === 'partner' && t.user_id !== userId);
        return matchesCategory && matchesUser;
    });

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* RECENT TRANSACTIONS */}
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Ultime spese</h2>

                {/* FILTRI DI SPESA */}
                {transactions && transactions.length > 0 && (
                    <div className={styles.filtersSection}>
                        {/* Filtro per Utente */}
                        <div className={styles.filterGroup}>
                            <span className={styles.filterLabel}>👤 Speso da</span>
                            <div className={styles.userFilter}>
                                <button
                                    onClick={() => setSelectedUser('all')}
                                    className={`${styles.userFilterBtn} ${selectedUser === 'all' ? styles.userFilterBtnActive : ''}`}
                                >
                                    👥 Tutti
                                </button>
                                <button
                                    onClick={() => setSelectedUser('me')}
                                    className={`${styles.userFilterBtn} ${selectedUser === 'me' ? styles.userFilterBtnActive : ''}`}
                                >
                                    👤 Tu
                                </button>
                                <button
                                    onClick={() => setSelectedUser('partner')}
                                    className={`${styles.userFilterBtn} ${selectedUser === 'partner' ? styles.userFilterBtnActive : ''}`}
                                >
                                    👤 {partnerName}
                                </button>
                            </div>
                        </div>

                        {/* Filtro per Categoria */}
                        <div className={styles.filterGroup}>
                            <span className={styles.filterLabel}>🏷️ Categoria</span>
                            <select
                                value={selectedCategory}
                                onChange={e => setSelectedCategory(e.target.value)}
                                className={styles.categorySelect}
                                style={
                                    selectedCategory !== 'all'
                                        ? { borderColor: CATEGORIES.find(c => c.id === selectedCategory)?.color }
                                        : {}
                                }
                            >
                                <option value="all">🏷️ Tutte le categorie</option>
                                {CATEGORIES.map(cat => (
                                    <option key={cat.id} value={cat.id}>
                                        {cat.icon} {cat.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                {!transactions || transactions.length === 0 ? (
                    <div className={styles.empty}>
                        <span>💸</span>
                        <p>Nessuna spesa registrata.<br />Premi <strong>+</strong> per aggiungerne una!</p>
                    </div>
                ) : filteredTransactions.length === 0 ? (
                    <div className={styles.emptyFiltered}>
                        <span className={styles.emptyFilteredIcon}>🔍</span>
                        <p className={styles.emptyFilteredText}>
                            Nessuna spesa corrisponde ai filtri selezionati.
                        </p>
                        <button
                            onClick={() => {
                                setSelectedCategory('all');
                                setSelectedUser('all');
                            }}
                            className={styles.resetBtn}
                        >
                            Resetta filtri
                        </button>
                    </div>
                ) : (
                    <>
                        <ul className={styles.transactionList}>
                            {filteredTransactions.map((t: Transaction) => {
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

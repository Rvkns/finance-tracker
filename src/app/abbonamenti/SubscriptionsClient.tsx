'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { CATEGORIES, getCategoryById } from '@/lib/categories';
import type { Subscription } from '@/lib/types';
import styles from './page.module.css';

interface Props {
    subscriptions: Subscription[];
    userId: string;
    userName: string;
    mySalary: number;
    partnerName: string;
    partnerSalary: number;
    householdId: string;
}

function formatCurrency(amount: number) {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
}

export default function SubscriptionsClient({ 
    subscriptions: initialSubscriptions, 
    userId, userName, mySalary, partnerName, partnerSalary, householdId 
}: Props) {
    const router = useRouter();
    const [subscriptions, setSubscriptions] = useState(initialSubscriptions);
    const [isAdding, setIsAdding] = useState(false);

    // Form state
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [categoryId, setCategoryId] = useState('subscriptions');
    const [loading, setLoading] = useState(false);

    const mySubs = subscriptions.filter(s => s.user_id === userId);
    const partnerSubs = subscriptions.filter(s => s.user_id !== userId);

    const myTotal = mySubs.reduce((sum, s) => sum + Number(s.amount), 0);
    const partnerTotal = partnerSubs.reduce((sum, s) => sum + Number(s.amount), 0);
    const householdTotal = myTotal + partnerTotal;
    const householdIncome = mySalary + partnerSalary;

    const myImpact = mySalary > 0 ? (myTotal / mySalary) * 100 : 0;
    const partnerImpact = partnerSalary > 0 ? (partnerTotal / partnerSalary) * 100 : 0;
    const householdImpact = householdIncome > 0 ? (householdTotal / householdIncome) * 100 : 0;

    // Detect duplicates
    const duplicates: string[] = [];
    const normalizedMySubs = mySubs.map(s => s.name.trim().toLowerCase());
    const normalizedPartnerSubs = partnerSubs.map(s => s.name.trim().toLowerCase());
    
    for (const mySub of normalizedMySubs) {
        if (normalizedPartnerSubs.includes(mySub)) {
            const originalName = mySubs.find(s => s.name.trim().toLowerCase() === mySub)?.name;
            if (originalName && !duplicates.includes(originalName)) {
                duplicates.push(originalName);
            }
        }
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const numAmount = parseFloat(amount.replace(',', '.'));
        if (!name || isNaN(numAmount) || numAmount <= 0) return;

        setLoading(true);
        const supabase = createClient();

        const newSub = {
            household_id: householdId,
            user_id: userId,
            name,
            amount: numAmount,
            category_id: categoryId,
        };

        const { data, error } = await supabase
            .from('subscriptions')
            .insert(newSub)
            .select()
            .single();

        if (!error && data) {
            setSubscriptions(prev => [data, ...prev].sort((a, b) => b.amount - a.amount));
            setIsAdding(false);
            setName('');
            setAmount('');
            setCategoryId('subscriptions');
            router.refresh();
        } else {
            console.error('Error saving subscription:', error);
            alert('Errore nel salvataggio. Hai eseguito lo script SQL?');
        }

        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Sei sicuro di voler eliminare questo abbonamento?')) return;

        const supabase = createClient();
        setSubscriptions(prev => prev.filter(s => s.id !== id));

        await supabase.from('subscriptions').delete().eq('id', id);
        router.refresh();
    };

    return (
        <div>
            {/* Impact Dashboard */}
            <div className={styles.impactDashboard}>
                {/* My Impact */}
                <div className={styles.impactCard}>
                    <p className={styles.impactLabel}>Il Tuo Impatto</p>
                    <p className={styles.impactValue}>
                        {formatCurrency(myTotal)} <span>/ mese</span>
                    </p>
                    <div className={styles.progressBarContainer}>
                        <div className={styles.progressBarLabel}>
                            <span>{myImpact.toFixed(1)}% del tuo stipendio</span>
                            <span>{mySalary > 0 ? formatCurrency(mySalary) : 'N/A'}</span>
                        </div>
                        <div className={styles.progressBarBg}>
                            <div 
                                className={`${styles.progressBarFill} ${myImpact > 10 ? styles.danger : myImpact > 5 ? styles.warning : styles.accent}`}
                                style={{ width: `${Math.min(myImpact, 100)}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Partner Impact */}
                <div className={`${styles.impactCard} ${styles.partner}`}>
                    <p className={styles.impactLabel}>Impatto {partnerName}</p>
                    <p className={styles.impactValue}>
                        {formatCurrency(partnerTotal)} <span>/ mese</span>
                    </p>
                    <div className={styles.progressBarContainer}>
                        <div className={styles.progressBarLabel}>
                            <span>{partnerImpact.toFixed(1)}% del suo stipendio</span>
                            <span>{partnerSalary > 0 ? formatCurrency(partnerSalary) : 'N/A'}</span>
                        </div>
                        <div className={styles.progressBarBg}>
                            <div 
                                className={`${styles.progressBarFill} ${partnerImpact > 10 ? styles.danger : partnerImpact > 5 ? styles.warning : styles.success}`}
                                style={{ width: `${Math.min(partnerImpact, 100)}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Warnings */}
            {duplicates.length > 0 && (
                <div className={styles.warningsList}>
                    {duplicates.map(dup => (
                        <div key={dup} className={styles.warningAlert}>
                            <span className={styles.warningIcon}>⚠️</span>
                            <div className={styles.warningContent}>
                                <h4 className={styles.warningTitle}>Abbonamento Duplicato: {dup}</h4>
                                <p className={styles.warningDesc}>
                                    Sia tu che {partnerName} pagate questo abbonamento. Forse potete condividerlo o disdirne uno?
                                    Risparmio potenziale: <strong>{formatCurrency(Math.min(...subscriptions.filter(s => s.name.trim().toLowerCase() === dup.toLowerCase()).map(s => Number(s.amount))))}/mese</strong>.
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Subscriptions List */}
            <div className={styles.listHeader}>
                <h2 className={styles.listTitle}>I tuoi Abbonamenti ({mySubs.length})</h2>
                <button onClick={() => setIsAdding(true)} className={styles.addBtn}>
                    + Aggiungi
                </button>
            </div>

            {mySubs.length === 0 ? (
                <div className={styles.empty}>
                    <p>Non hai ancora registrato abbonamenti a tuo nome.</p>
                </div>
            ) : (
                <ul className={styles.list}>
                    {mySubs.map(sub => {
                        const cat = getCategoryById(sub.category_id);
                        return (
                            <li key={sub.id} className={styles.item}>
                                <div className={styles.icon} style={{ background: `${cat.color}22`, color: cat.color }}>
                                    {cat.icon}
                                </div>
                                <div className={styles.info}>
                                    <p className={styles.name}>{sub.name}</p>
                                    <p className={styles.cat}>{cat.name}</p>
                                </div>
                                <p className={styles.amount}>{formatCurrency(Number(sub.amount))}</p>
                                <button className={styles.deleteBtn} onClick={() => handleDelete(sub.id)} title="Elimina">
                                    ✕
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}

            <div className={styles.listHeader} style={{ marginTop: '3rem' }}>
                <h2 className={styles.listTitle}>Abbonamenti di {partnerName} ({partnerSubs.length})</h2>
            </div>

            {partnerSubs.length === 0 ? (
                <div className={styles.empty}>
                    <p>{partnerName} non ha abbonamenti registrati.</p>
                </div>
            ) : (
                <ul className={styles.list} style={{ opacity: 0.8 }}>
                    {partnerSubs.map(sub => {
                        const cat = getCategoryById(sub.category_id);
                        return (
                            <li key={sub.id} className={styles.item}>
                                <div className={styles.icon} style={{ background: `${cat.color}22`, color: cat.color }}>
                                    {cat.icon}
                                </div>
                                <div className={styles.info}>
                                    <p className={styles.name}>
                                        {sub.name}
                                        <span className={styles.owner}>{partnerName}</span>
                                    </p>
                                    <p className={styles.cat}>{cat.name}</p>
                                </div>
                                <p className={styles.amount}>{formatCurrency(Number(sub.amount))}</p>
                            </li>
                        );
                    })}
                </ul>
            )}

            {/* Household Total */}
            <div style={{ marginTop: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <p>Totale Casa in abbonamenti: <strong>{formatCurrency(householdTotal)}</strong> al mese</p>
                <p style={{ fontSize: '0.85rem' }}>Pari al {householdImpact.toFixed(1)}% delle entrate complessive del gruppo.</p>
            </div>

            {/* Add Modal */}
            {isAdding && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <h2 className={styles.modalTitle}>Nuovo Abbonamento</h2>
                        <form onSubmit={handleSave}>
                            <div className={styles.field}>
                                <label className={styles.label}>Nome (es. Netflix, Spotify)</label>
                                <input
                                    className={styles.input}
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="Nome del servizio"
                                    required
                                    autoFocus
                                />
                            </div>

                            <div className={styles.field}>
                                <label className={styles.label}>Costo mensile (€)</label>
                                <input
                                    className={styles.input}
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    required
                                />
                            </div>

                            <div className={styles.field}>
                                <label className={styles.label}>Categoria</label>
                                <select
                                    className={styles.input}
                                    value={categoryId}
                                    onChange={e => setCategoryId(e.target.value as any)}
                                >
                                    {CATEGORIES.map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.icon} {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className={styles.modalActions}>
                                <button type="button" onClick={() => setIsAdding(false)} className={styles.cancelBtn}>
                                    Annulla
                                </button>
                                <button type="submit" className={styles.saveBtn} disabled={loading || !name || !amount}>
                                    {loading ? 'Salvataggio...' : 'Salva'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

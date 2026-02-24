'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { CATEGORIES, getCategoryById } from '@/lib/categories';
import type { RecurringExpense } from '@/lib/types';
import styles from './page.module.css';

interface Props {
    initialExpenses: RecurringExpense[];
    householdId: string;
}

function formatCurrency(amount: number) {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
}

export default function RecurringClient({ initialExpenses, householdId }: Props) {
    const router = useRouter();
    const [expenses, setExpenses] = useState(initialExpenses);
    const [isAdding, setIsAdding] = useState(false);

    // Form state
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [categoryId, setCategoryId] = useState(CATEGORIES[3].id); // default 'house'
    const [loading, setLoading] = useState(false);

    const handleHideModal = () => {
        setIsAdding(false);
        setName('');
        setAmount('');
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const numAmount = parseFloat(amount.replace(',', '.'));
        if (!name || isNaN(numAmount) || numAmount <= 0) return;

        setLoading(true);
        const supabase = createClient();

        const newExpense = {
            household_id: householdId,
            name,
            amount: numAmount,
            category_id: categoryId,
        };

        const { data, error } = await supabase
            .from('recurring_expenses')
            .insert(newExpense)
            .select()
            .single();

        if (!error && data) {
            setExpenses(prev => [data, ...prev].sort((a, b) => b.amount - a.amount));
            handleHideModal();
            router.refresh();
        }

        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Sei sicuro di voler eliminare questa spesa fissa?')) return;

        const supabase = createClient();
        setExpenses(prev => prev.filter(e => e.id !== id));

        await supabase.from('recurring_expenses').delete().eq('id', id);
        router.refresh();
    };

    return (
        <div>
            <div className={styles.listHeader}>
                <h2 className={styles.listTitle}>Le tue Spese</h2>
                <button onClick={() => setIsAdding(true)} className={styles.addBtn}>
                    + Aggiungi
                </button>
            </div>

            {expenses.length === 0 ? (
                <div className={styles.empty}>
                    <p>Non hai ancora inserito spese fisse.</p>
                </div>
            ) : (
                <ul className={styles.list}>
                    {expenses.map(exp => {
                        const cat = getCategoryById(exp.category_id);
                        return (
                            <li key={exp.id} className={styles.item}>
                                <div className={styles.icon} style={{ background: `${cat.color}22`, color: cat.color }}>
                                    {cat.icon}
                                </div>
                                <div className={styles.info}>
                                    <p className={styles.name}>{exp.name}</p>
                                    <p className={styles.cat}>{cat.name}</p>
                                </div>
                                <p className={styles.amount}>{formatCurrency(exp.amount)}</p>
                                <button className={styles.deleteBtn} onClick={() => handleDelete(exp.id)}>
                                    ✕
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}

            {isAdding && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <h2 className={styles.modalTitle}>Nuova Spesa Fissa</h2>
                        <form onSubmit={handleSave}>
                            <div className={styles.field}>
                                <label className={styles.label}>Nome (es. Mutuo, Netflix)</label>
                                <input
                                    className={styles.input}
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="Nome della spesa"
                                    required
                                    autoFocus
                                />
                            </div>

                            <div className={styles.field}>
                                <label className={styles.label}>Importo (€)</label>
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
                                <button type="button" onClick={handleHideModal} className={styles.cancelBtn}>
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

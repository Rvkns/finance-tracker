'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import styles from './page.module.css';

type CategoryData = {
    id: string;
    name: string;
    icon: string;
    color: string;
    total: number;
    pct: number;
};

type Budget = {
    id: string;
    category_id: string;
    amount: number;
};

export default function CategoryBudgets({
    catData,
    initialBudgets,
    householdId
}: {
    catData: CategoryData[];
    initialBudgets: Budget[];
    householdId: string;
}) {
    const router = useRouter();
    const [budgets, setBudgets] = useState<Budget[]>(initialBudgets);
    const [editingCat, setEditingCat] = useState<CategoryData | null>(null);
    const [editAmount, setEditAmount] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSaveBudget = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCat || !editAmount) return;
        setLoading(true);

        const supabase = createClient();
        const amountNum = parseFloat(editAmount.replace(',', '.'));

        if (amountNum > 0) {
            // Upsert budget
            const { data, error } = await supabase
                .from('budgets')
                .upsert(
                    { household_id: householdId, category_id: editingCat.id, amount: amountNum },
                    { onConflict: 'household_id, category_id' }
                )
                .select()
                .single();

            if (!error && data) {
                setBudgets(prev => {
                    const filtered = prev.filter(b => b.category_id !== editingCat.id);
                    return [...filtered, data as Budget];
                });
            }
        } else {
            // Delete budget if 0 or empty
            const { error } = await supabase
                .from('budgets')
                .delete()
                .eq('household_id', householdId)
                .eq('category_id', editingCat.id);

            if (!error) {
                setBudgets(prev => prev.filter(b => b.category_id !== editingCat.id));
            }
        }

        setLoading(false);
        setEditingCat(null);
        setEditAmount('');
        router.refresh();
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
    };

    return (
        <>
            <ul className={styles.catList}>
                {catData.map(cat => {
                    const budget = budgets.find(b => b.category_id === cat.id);
                    const hasBudget = !!budget;
                    const limit = budget?.amount || 0;

                    // Logic for progress bar
                    let progressPct = cat.pct; // default to total % if no budget
                    let barColor = cat.color;
                    let displayAmount = formatCurrency(cat.total);

                    if (hasBudget) {
                        progressPct = Math.min((cat.total / limit) * 100, 100);
                        displayAmount = `${formatCurrency(cat.total)} / ${formatCurrency(limit)}`;

                        // Color coding based on budget usage
                        if (progressPct >= 100) barColor = 'var(--danger)';
                        else if (progressPct >= 80) barColor = 'var(--warning)';
                        else barColor = 'var(--success)';
                    }

                    return (
                        <li
                            key={cat.id}
                            className={styles.catItem}
                            onClick={() => {
                                setEditingCat(cat);
                                setEditAmount(budget ? budget.amount.toString() : '');
                            }}
                            style={{ cursor: 'pointer' }}
                        >
                            <div className={styles.catLeft}>
                                <span className={styles.catIcon}>{cat.icon}</span>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span className={styles.catName}>{cat.name}</span>
                                    {!hasBudget && <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Tocca per budget</span>}
                                </div>
                            </div>
                            <div className={styles.catRight}>
                                <div className={styles.barBg}>
                                    <div
                                        className={styles.bar}
                                        style={{ width: `${progressPct}%`, background: barColor }}
                                    />
                                </div>
                                <span className={styles.catTotal} style={{ color: hasBudget && progressPct >= 100 ? 'var(--danger)' : undefined }}>
                                    {displayAmount}
                                </span>
                            </div>
                        </li>
                    );
                })}
            </ul>

            {/* Budget Modal */}
            {editingCat && (
                <div className={styles.modalOverlay} onClick={() => setEditingCat(null)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <h3 className={styles.modalTitle}>
                            Budget per {editingCat.icon} {editingCat.name}
                        </h3>
                        <p className={styles.modalSub}>Imposta un limite mensile di spesa per questa categoria. Inserisci 0 per rimuovere il budget.</p>

                        <form onSubmit={handleSaveBudget} className={styles.modalForm}>
                            <div className={styles.inputGroup}>
                                <span className={styles.currencySymbol}>€</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={editAmount}
                                    onChange={e => setEditAmount(e.target.value)}
                                    className={styles.budgetInput}
                                    placeholder="Es. 150.00"
                                    autoFocus
                                />
                            </div>
                            <div className={styles.modalActions}>
                                <button type="button" className={styles.cancelBtn} onClick={() => setEditingCat(null)}>
                                    Annulla
                                </button>
                                <button type="submit" className={styles.saveBtn} disabled={loading}>
                                    {loading ? 'Salvataggio...' : 'Salva Budget'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}

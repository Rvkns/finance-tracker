'use client';

import { useState, useTransition, useEffect } from 'react';
import type { StructuralExpense } from '@/lib/types';
import styles from './strutturali.module.css';

interface Props {
    initialExpenses: StructuralExpense[];
    initialPaidIds: string[];
    userId: string;
    userName: string;
    partnerName: string;
    partnerId: string | null;
    householdId: string;
}

function formatCurrency(amount: number) {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
}

export default function StruttturaliClient({
    initialExpenses,
    initialPaidIds,
    userId,
    userName,
    partnerName,
    partnerId,
    householdId,
}: Props) {
    const [expenses, setExpenses] = useState<StructuralExpense[]>(initialExpenses);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editAmount, setEditAmount] = useState('');
    const [isPending, startTransition] = useTransition();

    // ── Database / API Paid Status ───────────────────────────────────────────
    const [paidExpenseIds, setPaidExpenseIds] = useState<string[]>(initialPaidIds);
    const currentMonthLabel = new Date().toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
    const currentMonthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

    const togglePaid = async (id: string) => {
        const isPaid = paidExpenseIds.includes(id);
        
        // Aggiornamento ottimistico dell'UI
        setPaidExpenseIds(prev => isPaid ? prev.filter(x => x !== id) : [...prev, id]);

        try {
            if (isPaid) {
                // DELETE payment
                await apiCall(`/api/structural/payments?expense_id=${id}&month_key=${currentMonthKey}`, 'DELETE');
            } else {
                // POST payment
                await apiCall('/api/structural/payments', 'POST', {
                    expense_id: id,
                    month_key: currentMonthKey
                });
            }
        } catch (e) {
            console.error(e);
            // Ripristino dello stato precedente in caso di errore
            setPaidExpenseIds(prev => isPaid ? [...prev, id] : prev.filter(x => x !== id));
        }
    };

    const handleResetMonth = async () => {
        if (confirm("Vuoi ripristinare tutte le spese fisse come 'Da pagare' per questo mese?")) {
            const originalPaidIds = [...paidExpenseIds];
            setPaidExpenseIds([]);

            try {
                // Cancella tutti i record di pagamento per questo mese
                await Promise.all(
                    originalPaidIds.map(id =>
                        apiCall(`/api/structural/payments?expense_id=${id}&month_key=${currentMonthKey}`, 'DELETE')
                    )
                );
            } catch (e) {
                console.error(e);
                setPaidExpenseIds(originalPaidIds);
            }
        }
    };

    const allPaid = expenses.length > 0 && expenses.every(e => paidExpenseIds.includes(e.id));

    // Form state
    const [formName, setFormName] = useState('');
    const [formAmount, setFormAmount] = useState('');
    const [formPaidBy, setFormPaidBy] = useState<'joint' | 'me' | 'partner'>('joint');

    // ── Calcolo compensazione ────────────────────────────────────────────────
    const totalStructural = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const theoreticalShare = totalStructural / 2;

    // Somma delle spese pagate interamente da me
    const paidByMeTotal = expenses
        .filter(e => e.paid_by === userId)
        .reduce((s, e) => s + Number(e.amount), 0);
    // Somma delle spese pagate interamente dal partner
    const paidByPartnerTotal = expenses
        .filter(e => e.paid_by === partnerId && partnerId !== null)
        .reduce((s, e) => s + Number(e.amount), 0);

    // Quota già coperta da me con i miei pagamenti autonomi
    const myAlreadyCovered = paidByMeTotal; // ho pagato tutto
    const partnerAlreadyCovered = paidByPartnerTotal;

    // Quanto manca da versare al conto cointestato
    // Tutte le spese "joint" devono essere coperte 50/50
    const jointTotal = expenses
        .filter(e => e.paid_by === null)
        .reduce((s, e) => s + Number(e.amount), 0);

    // La mia quota finale = metà del joint + metà delle spese del partner (gliene devo la metà)
    //                       - metà delle spese che ho pagato io (il partner mi deve la metà)
    const myContributionToJoint = jointTotal / 2;
    const myShareOfPartnerExpenses = paidByPartnerTotal / 2; // devo rimborsare metà a partner
    const myDeductionFromMyExpenses = paidByMeTotal / 2;     // il partner mi deve la metà → scala dal mio versamento joint

    const myNetToJoint = myContributionToJoint + myShareOfPartnerExpenses - myDeductionFromMyExpenses;
    const partnerNetToJoint = jointTotal / 2 + paidByMeTotal / 2 - paidByPartnerTotal / 2;

    // ── Helpers API ─────────────────────────────────────────────────────────
    async function apiCall(path: string, method: string, body?: object) {
        const res = await fetch(path, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: body ? JSON.stringify(body) : undefined,
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    }

    function resetForm() {
        setFormName('');
        setFormAmount('');
        setFormPaidBy('joint');
        setShowForm(false);
    }

    async function handleAdd() {
        const amount = parseFloat(formAmount.replace(',', '.'));
        if (!formName.trim() || isNaN(amount) || amount <= 0) return;
        const paid_by = formPaidBy === 'me' ? userId : formPaidBy === 'partner' ? partnerId : null;

        startTransition(async () => {
            try {
                const data = await apiCall('/api/structural', 'POST', {
                    household_id: householdId,
                    name: formName.trim(),
                    amount,
                    paid_by,
                });
                setExpenses(prev => [...prev, data]);
                resetForm();
            } catch (e) {
                console.error(e);
            }
        });
    }

    async function handleDelete(id: string) {
        startTransition(async () => {
            try {
                await apiCall(`/api/structural/${id}`, 'DELETE');
                setExpenses(prev => prev.filter(e => e.id !== id));
            } catch (e) {
                console.error(e);
            }
        });
    }

    async function handleEditAmount(expense: StructuralExpense) {
        const amount = parseFloat(editAmount.replace(',', '.'));
        if (isNaN(amount) || amount <= 0) return;
        startTransition(async () => {
            try {
                const data = await apiCall(`/api/structural/${expense.id}`, 'PATCH', { amount });
                setExpenses(prev => prev.map(e => e.id === expense.id ? { ...e, amount: data.amount } : e));
                setEditingId(null);
            } catch (e) {
                console.error(e);
            }
        });
    }

    function paidByLabel(paid_by: string | null) {
        if (paid_by === null) return { label: 'Conto cointestato', color: 'var(--text-secondary)', icon: '🏦' };
        if (paid_by === userId) return { label: `Paga tutto ${userName}`, color: 'var(--accent-light)', icon: '👤' };
        return { label: `Paga tutto ${partnerName}`, color: 'var(--success)', icon: '👥' };
    }

    return (
        <div className={styles.container}>
            {/* ── Calcolatore compensazione ── */}
            <div className={styles.calcCard}>
                <p className={styles.calcTitle}>📊 Piano di Pagamento Mensile</p>
                <div className={styles.calcTotal}>
                    <span>Totale spese fisse</span>
                    <strong>{formatCurrency(totalStructural)}</strong>
                </div>
                <div className={styles.calcTotal}>
                    <span>Quota teorica ciascuno (50%)</span>
                    <strong>{formatCurrency(theoreticalShare)}</strong>
                </div>
                <div className={styles.calcDivider} />
                <div className={styles.calcRow}>
                    <div className={styles.calcPerson} style={{ borderColor: 'var(--accent)' }}>
                        <p className={styles.calcPersonName} style={{ color: 'var(--accent-light)' }}>👤 {userName}</p>
                        {paidByMeTotal > 0 && (
                            <p className={styles.calcNote}>
                                Paga autonomamente: <strong>{formatCurrency(paidByMeTotal)}</strong>
                            </p>
                        )}
                        <p className={styles.calcNote}>
                            Versa al cointestato: <strong style={{ color: 'var(--accent-light)' }}>{formatCurrency(Math.max(0, myNetToJoint))}</strong>
                        </p>
                        <p className={styles.calcTotal2}>
                            Totale contributo: <strong>{formatCurrency(paidByMeTotal + Math.max(0, myNetToJoint))}</strong>
                        </p>
                    </div>
                    <div className={styles.calcPerson} style={{ borderColor: 'var(--success)' }}>
                        <p className={styles.calcPersonName} style={{ color: 'var(--success)' }}>👥 {partnerName}</p>
                        {paidByPartnerTotal > 0 && (
                            <p className={styles.calcNote}>
                                Paga autonomamente: <strong>{formatCurrency(paidByPartnerTotal)}</strong>
                            </p>
                        )}
                        <p className={styles.calcNote}>
                            Versa al cointestato: <strong style={{ color: 'var(--success)' }}>{formatCurrency(Math.max(0, partnerNetToJoint))}</strong>
                        </p>
                        <p className={styles.calcTotal2}>
                            Totale contributo: <strong>{formatCurrency(paidByPartnerTotal + Math.max(0, partnerNetToJoint))}</strong>
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Lista spese ── */}
            <div className={styles.listHeader}>
                <h2 className={styles.listTitle}>Voci Fisse</h2>
                <button className={styles.addBtn} onClick={() => setShowForm(v => !v)}>
                    {showForm ? '✕ Annulla' : '+ Aggiungi'}
                </button>
            </div>

            {/* ── Form aggiunta ── */}
            {showForm && (
                <div className={styles.form}>
                    <input
                        className={styles.input}
                        placeholder="Nome (es. Mutuo, Cucina...)"
                        value={formName}
                        onChange={e => setFormName(e.target.value)}
                    />
                    <input
                        className={styles.input}
                        placeholder="Importo mensile (€)"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formAmount}
                        onChange={e => setFormAmount(e.target.value)}
                    />
                    <div className={styles.radioGroup}>
                        <label className={`${styles.radioLabel} ${formPaidBy === 'joint' ? styles.radioActive : ''}`}>
                            <input type="radio" value="joint" checked={formPaidBy === 'joint'} onChange={() => setFormPaidBy('joint')} />
                            🏦 Cointestato
                        </label>
                        <label className={`${styles.radioLabel} ${formPaidBy === 'me' ? styles.radioActive : ''}`}>
                            <input type="radio" value="me" checked={formPaidBy === 'me'} onChange={() => setFormPaidBy('me')} />
                            👤 Pago io
                        </label>
                        <label className={`${styles.radioLabel} ${formPaidBy === 'partner' ? styles.radioActive : ''}`}>
                            <input type="radio" value="partner" checked={formPaidBy === 'partner'} onChange={() => setFormPaidBy('partner')} />
                            👥 Paga {partnerName}
                        </label>
                    </div>
                    <button
                        className={styles.saveBtn}
                        onClick={handleAdd}
                        disabled={isPending || !formName.trim() || !formAmount}
                    >
                        {isPending ? 'Salvataggio...' : 'Salva'}
                    </button>
                </div>
            )}

            {/* ── Banner tutto pagato ── */}
            {allPaid && (
                <div className={styles.successBanner}>
                    <p className={styles.successText}>
                        🎉 Siete perfettamente in pari con le spese fisse di <span style={{ textTransform: 'capitalize' }}>{currentMonthLabel}</span>!
                    </p>
                    <button className={styles.resetBtn} onClick={handleResetMonth}>Ripristina</button>
                </div>
            )}

            {/* ── Expense cards ── */}
            <div className={styles.list}>
                {expenses.length === 0 ? (
                    <div className={styles.empty}>
                        <span>🏦</span>
                        <p>Nessuna spesa fissa ancora.<br />Aggiungi mutuo, rate o simili.</p>
                    </div>
                ) : (
                    expenses.map(expense => {
                        const meta = paidByLabel(expense.paid_by);
                        const isEditing = editingId === expense.id;
                        const isPaid = paidExpenseIds.includes(expense.id);
                        return (
                            <div key={expense.id} className={`${styles.expenseCard} ${isPaid ? styles.expenseCardPaid : ''}`}>
                                <div className={styles.expenseLeft}>
                                    <p className={styles.expenseName}>{expense.name}</p>
                                    <span className={styles.expenseBadge} style={{ color: meta.color }}>
                                        {meta.icon} {meta.label}
                                    </span>
                                </div>
                                <div className={styles.expenseRight}>
                                    {!isEditing && (
                                        <button
                                            className={`${styles.payBtn} ${isPaid ? styles.payBtnActive : ''}`}
                                            onClick={() => togglePaid(expense.id)}
                                            title={isPaid ? "Segna come da pagare" : "Segna come pagato"}
                                        >
                                            {isPaid ? '✅ Pagato' : '💳 Paga'}
                                        </button>
                                    )}

                                    {isEditing ? (
                                        <div className={styles.editRow}>
                                            <input
                                                className={styles.editInput}
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={editAmount}
                                                onChange={e => setEditAmount(e.target.value)}
                                                autoFocus
                                            />
                                            <button className={styles.editSave} onClick={() => handleEditAmount(expense)} disabled={isPending}>✓</button>
                                            <button className={styles.editCancel} onClick={() => setEditingId(null)}>✕</button>
                                        </div>
                                    ) : (
                                        <button
                                            className={styles.expenseAmount}
                                            onClick={() => { setEditingId(expense.id); setEditAmount(String(expense.amount)); }}
                                            title="Clicca per modificare"
                                        >
                                            {formatCurrency(Number(expense.amount))}
                                            <span className={styles.editHint}>✏️</span>
                                        </button>
                                    )}
                                    <button
                                        className={styles.deleteBtn}
                                        onClick={() => handleDelete(expense.id)}
                                        disabled={isPending}
                                        aria-label="Elimina"
                                    >
                                        🗑
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            <p className={styles.disclaimer}>
                ℹ️ Le spese fisse a lungo termine non influenzano il saldo cumulativo.
            </p>
        </div>
    );
}

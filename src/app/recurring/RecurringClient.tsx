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

// ── Grafico a torta SVG puro ──────────────────────────────────────────────────
interface PieSlice { label: string; value: number; color: string; icon: string; }

function PieChart({ slices }: { slices: PieSlice[] }) {
    const [hovered, setHovered] = useState<number | null>(null);
    const total = slices.reduce((s, x) => s + x.value, 0);
    if (total === 0) return null;

    const SIZE = 200;
    const CX = SIZE / 2;
    const CY = SIZE / 2;
    const R = 80;
    const R_INNER = 46; // donut hole

    let cumAngle = -Math.PI / 2;
    const paths = slices.map((slice, i) => {
        const angle = (slice.value / total) * 2 * Math.PI;
        const startAngle = cumAngle;
        const endAngle = cumAngle + angle;
        cumAngle = endAngle;

        const isHovered = hovered === i;
        const r = isHovered ? R + 8 : R;

        const x1 = CX + r * Math.cos(startAngle);
        const y1 = CY + r * Math.sin(startAngle);
        const x2 = CX + r * Math.cos(endAngle);
        const y2 = CY + r * Math.sin(endAngle);
        const xi1 = CX + R_INNER * Math.cos(startAngle);
        const yi1 = CY + R_INNER * Math.sin(startAngle);
        const xi2 = CX + R_INNER * Math.cos(endAngle);
        const yi2 = CY + R_INNER * Math.sin(endAngle);
        const largeArc = angle > Math.PI ? 1 : 0;

        const d = [
            `M ${xi1} ${yi1}`,
            `L ${x1} ${y1}`,
            `A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`,
            `L ${xi2} ${yi2}`,
            `A ${R_INNER} ${R_INNER} 0 ${largeArc} 0 ${xi1} ${yi1}`,
            'Z',
        ].join(' ');

        return { d, color: slice.color, i, angle };
    });

    const hoveredSlice = hovered !== null ? slices[hovered] : null;

    return (
        <div className={styles.chartWrapper}>
            <svg
                viewBox={`0 0 ${SIZE} ${SIZE}`}
                className={styles.pieChart}
                aria-label="Distribuzione bollette"
            >
                {paths.map(({ d, color, i }) => (
                    <path
                        key={i}
                        d={d}
                        fill={color}
                        style={{ transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)', cursor: 'pointer', filter: hovered === i ? `drop-shadow(0 0 6px ${color}88)` : 'none' }}
                        onMouseEnter={() => setHovered(i)}
                        onMouseLeave={() => setHovered(null)}
                        onTouchStart={() => setHovered(i)}
                        onTouchEnd={() => setHovered(null)}
                    />
                ))}
                {/* Centro donut */}
                {hoveredSlice ? (
                    <>
                        <text x={CX} y={CY - 10} textAnchor="middle" fontSize="18" fill="white">{hoveredSlice.icon}</text>
                        <text x={CX} y={CY + 8} textAnchor="middle" fontSize="9" fill="#e2e8f0" fontWeight="600">
                            {hoveredSlice.label}
                        </text>
                        <text x={CX} y={CY + 21} textAnchor="middle" fontSize="10" fill={hoveredSlice.color} fontWeight="800">
                            {formatCurrency(hoveredSlice.value)}
                        </text>
                    </>
                ) : (
                    <>
                        <text x={CX} y={CY - 4} textAnchor="middle" fontSize="9" fill="#94a3b8" fontWeight="600">TOTALE</text>
                        <text x={CX} y={CY + 12} textAnchor="middle" fontSize="11" fill="#f1f5f9" fontWeight="800">
                            {formatCurrency(total)}
                        </text>
                    </>
                )}
            </svg>

            {/* Legenda */}
            <ul className={styles.legend}>
                {slices.map((s, i) => (
                    <li
                        key={i}
                        className={`${styles.legendItem} ${hovered === i ? styles.legendItemActive : ''}`}
                        onMouseEnter={() => setHovered(i)}
                        onMouseLeave={() => setHovered(null)}
                    >
                        <span className={styles.legendDot} style={{ background: s.color }} />
                        <span className={styles.legendIcon}>{s.icon}</span>
                        <span className={styles.legendLabel}>{s.label}</span>
                        <span className={styles.legendValue}>{formatCurrency(s.value)}</span>
                        <span className={styles.legendPct}>
                            {Math.round((s.value / total) * 100)}%
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

// ── Categorie bollette (filtro rapido) ────────────────────────────────────────
const BILL_CATEGORY_IDS = ['water', 'electricity', 'gas', 'internet', 'trash', 'bills'] as const;
type BillCatId = typeof BILL_CATEGORY_IDS[number] | 'all';


export default function RecurringClient({ initialExpenses, householdId }: Props) {
    const router = useRouter();
    const [expenses, setExpenses] = useState(initialExpenses);
    const [isAdding, setIsAdding] = useState(false);
    const [activeFilter, setActiveFilter] = useState<BillCatId>('all');

    // Form state
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [categoryId, setCategoryId] = useState(CATEGORIES[3].id); // default 'house'
    const [dayOfMonth, setDayOfMonth] = useState('');
    const [loading, setLoading] = useState(false);

    const handleHideModal = () => {
        setIsAdding(false);
        setName('');
        setAmount('');
        setDayOfMonth('');
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
            day_of_month: dayOfMonth ? parseInt(dayOfMonth, 10) : null,
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
        if (!confirm('Sei sicuro di voler eliminare questa bolletta?')) return;

        const supabase = createClient();
        setExpenses(prev => prev.filter(e => e.id !== id));

        await supabase.from('recurring_expenses').delete().eq('id', id);
        router.refresh();
    };

    // ── Calcolo dati grafico ──────────────────────────────────────────────────
    const pieSlices: PieSlice[] = BILL_CATEGORY_IDS
        .map(catId => {
            const cat = getCategoryById(catId);
            const total = expenses
                .filter(e => e.category_id === catId)
                .reduce((sum, e) => sum + Number(e.amount), 0);
            return { label: cat.name, value: total, color: cat.color, icon: cat.icon };
        })
        .filter(s => s.value > 0)
        .sort((a, b) => b.value - a.value);

    const filteredExpenses = activeFilter === 'all'
        ? expenses
        : expenses.filter(e => e.category_id === activeFilter);

    // ── Chip filtro ───────────────────────────────────────────────────────────
    const filterChips: { id: BillCatId; label: string; icon: string; color: string }[] = [
        { id: 'all', label: 'Tutte', icon: '📋', color: '#6366f1' },
        ...BILL_CATEGORY_IDS.map(id => {
            const cat = getCategoryById(id);
            return { id, label: cat.name, icon: cat.icon, color: cat.color };
        }),
    ];

    return (
        <div>
            {/* ── Grafico distribuzione ── */}
            {pieSlices.length > 0 && (
                <div className={styles.chartSection}>
                    <h2 className={styles.listTitle}>📊 Distribuzione Costi</h2>
                    <PieChart slices={pieSlices} />
                </div>
            )}

            {/* ── Filtri per categoria ── */}
            <div className={styles.filterBar}>
                {filterChips.map(chip => (
                    <button
                        key={chip.id}
                        className={`${styles.filterChip} ${activeFilter === chip.id ? styles.filterChipActive : ''}`}
                        style={activeFilter === chip.id ? { borderColor: chip.color, color: chip.color, background: `${chip.color}18` } : {}}
                        onClick={() => setActiveFilter(chip.id)}
                    >
                        <span>{chip.icon}</span>
                        <span className={styles.filterChipLabel}>{chip.label}</span>
                    </button>
                ))}
            </div>

            {/* ── Lista spese ── */}
            <div className={styles.listHeader}>
                <h2 className={styles.listTitle}>
                    Le tue Bollette
                    {activeFilter !== 'all' && (
                        <span className={styles.filterBadge}>
                            {filterChips.find(c => c.id === activeFilter)?.icon}{' '}
                            {filterChips.find(c => c.id === activeFilter)?.label}
                        </span>
                    )}
                </h2>
                <button onClick={() => setIsAdding(true)} className={styles.addBtn}>
                    + Aggiungi
                </button>
            </div>

            {filteredExpenses.length === 0 ? (
                <div className={styles.empty}>
                    <p>{activeFilter === 'all' ? 'Non hai ancora inserito bollette.' : 'Nessuna bolletta in questa categoria.'}</p>
                </div>
            ) : (
                <ul className={styles.list}>
                    {filteredExpenses.map(exp => {
                        const cat = getCategoryById(exp.category_id);
                        return (
                            <li key={exp.id} className={styles.item}>
                                <div className={styles.icon} style={{ background: `${cat.color}22`, color: cat.color }}>
                                    {cat.icon}
                                </div>
                                <div className={styles.info}>
                                    <p className={styles.name}>{exp.name}</p>
                                    <p className={styles.cat}>
                                        {cat.name}
                                        {exp.created_at && (
                                            <span style={{ marginLeft: '6px', opacity: 0.75, fontSize: '11px' }}>
                                                · 📅 {new Date(exp.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
                                            </span>
                                        )}
                                    </p>
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
                        <h2 className={styles.modalTitle}>Nuova Bolletta</h2>
                        <form onSubmit={handleSave}>
                            <div className={styles.field}>
                                <label className={styles.label}>Nome (es. Bolletta Luce, Internet)</label>
                                <input
                                    className={styles.input}
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="Nome della bolletta"
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

                            <div className={styles.field}>
                                <label className={styles.label}>Giorno di addebito (es. 5 = il 5 del mese)</label>
                                <input
                                    className={styles.input}
                                    type="number"
                                    min="1"
                                    max="31"
                                    value={dayOfMonth}
                                    onChange={e => setDayOfMonth(e.target.value)}
                                    placeholder="Lascia vuoto se variabile"
                                />
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

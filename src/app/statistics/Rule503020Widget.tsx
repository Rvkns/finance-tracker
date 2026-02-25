'use client';

import { useState } from 'react';
import styles from './page.module.css';

interface Rule503020WidgetProps {
    totalIncome: number;
    needsActual: number;
    wantsActual: number;
    myIncome: number;
    myNeedsActual: number;
    myWantsActual: number;
    partnerIncome: number;
    partnerNeedsActual: number;
    partnerWantsActual: number;
}

function formatCurrency(amount: number) {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);
}

type Tab = 'total' | 'me' | 'partner';

function BudgetBars({ income, needsActual, wantsActual, label }: {
    income: number;
    needsActual: number;
    wantsActual: number;
    label: string;
}) {
    if (income <= 0) {
        return (
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center', padding: '12px 0' }}>
                ⚠️ Imposta lo stipendio di {label} nel Profilo per attivare l&apos;analisi.
            </p>
        );
    }

    const needsTarget = income * 0.50;
    const wantsTarget = income * 0.30;
    const savingsTarget = income * 0.20;
    const savingsActual = Math.max(0, income - needsActual - wantsActual);

    const needsPct = Math.min(100, (needsActual / needsTarget) * 100);
    const wantsPct = Math.min(100, (wantsActual / wantsTarget) * 100);
    const savingsPct = Math.min(100, (savingsActual / savingsTarget) * 100);

    return (
        <div className={styles.ruleBars}>
            {/* 50% Needs */}
            <div className={styles.ruleItem}>
                <div className={styles.ruleItemHeader}>
                    <span className={styles.ruleItemLabel}>Necessità (50%)</span>
                    <span className={styles.ruleItemAmounts}>
                        {formatCurrency(needsActual)} / {formatCurrency(needsTarget)}
                    </span>
                </div>
                <div className={styles.ruleBarBg}>
                    <div
                        className={styles.ruleBarFill}
                        style={{
                            width: `${needsPct}%`,
                            background: needsPct > 100 ? 'var(--danger)' : 'var(--accent)'
                        }}
                    />
                </div>
            </div>

            {/* 30% Wants */}
            <div className={styles.ruleItem}>
                <div className={styles.ruleItemHeader}>
                    <span className={styles.ruleItemLabel}>Svago (30%)</span>
                    <span className={styles.ruleItemAmounts}>
                        {formatCurrency(wantsActual)} / {formatCurrency(wantsTarget)}
                    </span>
                </div>
                <div className={styles.ruleBarBg}>
                    <div
                        className={styles.ruleBarFill}
                        style={{
                            width: `${wantsPct}%`,
                            background: wantsPct > 100 ? 'var(--danger)' : '#8b5cf6'
                        }}
                    />
                </div>
            </div>

            {/* 20% Savings */}
            <div className={styles.ruleItem}>
                <div className={styles.ruleItemHeader}>
                    <span className={styles.ruleItemLabel}>Risparmio (20%)</span>
                    <span className={styles.ruleItemAmounts}>
                        {formatCurrency(savingsActual)} / Obiettivo {formatCurrency(savingsTarget)}
                    </span>
                </div>
                <div className={styles.ruleBarBg}>
                    <div
                        className={styles.ruleBarFill}
                        style={{
                            width: `${savingsPct}%`,
                            background: savingsPct >= 100 ? 'var(--success)' : '#f59e0b'
                        }}
                    />
                </div>
            </div>
        </div>
    );
}

export default function Rule503020Widget({
    totalIncome, needsActual, wantsActual,
    myIncome, myNeedsActual, myWantsActual,
    partnerIncome, partnerNeedsActual, partnerWantsActual,
}: Rule503020WidgetProps) {
    const [tab, setTab] = useState<Tab>('total');

    const hasAnyIncome = totalIncome > 0;

    if (!hasAnyIncome) {
        return (
            <div className={styles.ruleWidgetEmpty}>
                <p>⚠️ Imposta gli stipendi nel Profilo per attivare l&apos;analisi 50/30/20.</p>
            </div>
        );
    }

    const activeIncome = tab === 'total' ? totalIncome : tab === 'me' ? myIncome : partnerIncome;
    const activeNeeds = tab === 'total' ? needsActual : tab === 'me' ? myNeedsActual : partnerNeedsActual;
    const activeWants = tab === 'total' ? wantsActual : tab === 'me' ? myWantsActual : partnerWantsActual;
    const activeLabel = tab === 'partner' ? 'Partner' : 'Tu';

    return (
        <div className={styles.ruleWidget}>
            <div className={styles.ruleHeader}>
                <h3 className={styles.ruleTitle}>Analisi 50/30/20</h3>
                <p className={styles.ruleSubtitle}>
                    Budget basato sulle entrate: {formatCurrency(activeIncome)}
                </p>
            </div>

            {/* Tab switcher */}
            <div className={styles.ruleTabs}>
                <button
                    className={`${styles.ruleTab} ${tab === 'total' ? styles.ruleTabActive : ''}`}
                    onClick={() => setTab('total')}
                >
                    Totale
                </button>
                <button
                    className={`${styles.ruleTab} ${tab === 'me' ? styles.ruleTabActive : ''}`}
                    onClick={() => setTab('me')}
                >
                    Tu
                </button>
                <button
                    className={`${styles.ruleTab} ${tab === 'partner' ? styles.ruleTabActive : ''}`}
                    onClick={() => setTab('partner')}
                >
                    Partner
                </button>
            </div>

            <BudgetBars
                income={activeIncome}
                needsActual={activeNeeds}
                wantsActual={activeWants}
                label={activeLabel}
            />
        </div>
    );
}

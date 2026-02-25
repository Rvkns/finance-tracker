'use client';

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

function BudgetBars({ income, needsActual, wantsActual, title, color }: {
    income: number;
    needsActual: number;
    wantsActual: number;
    title: string;
    color: string;
}) {
    if (income <= 0) {
        return (
            <div className={styles.ruleSection}>
                <div className={styles.ruleSectionHeader}>
                    <span className={styles.ruleSectionTitle} style={{ color }}>{title}</span>
                    <span className={styles.ruleSectionIncome}>Stipendio non impostato</span>
                </div>
                <p className={styles.ruleSectionEmpty}>⚠️ Vai nel Profilo per attivare l&apos;analisi.</p>
            </div>
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
        <div className={styles.ruleSection}>
            <div className={styles.ruleSectionHeader}>
                <span className={styles.ruleSectionTitle} style={{ color }}>{title}</span>
                <span className={styles.ruleSectionIncome}>{formatCurrency(income)}</span>
            </div>
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
                            style={{ width: `${needsPct}%`, background: needsPct > 100 ? 'var(--danger)' : 'var(--accent)' }}
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
                            style={{ width: `${wantsPct}%`, background: wantsPct > 100 ? 'var(--danger)' : '#8b5cf6' }}
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
                            style={{ width: `${savingsPct}%`, background: savingsPct >= 100 ? 'var(--success)' : '#f59e0b' }}
                        />
                    </div>
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
    if (totalIncome <= 0) {
        return (
            <div className={styles.ruleWidgetEmpty}>
                <p>⚠️ Imposta gli stipendi nel Profilo per attivare l&apos;analisi 50/30/20.</p>
            </div>
        );
    }

    return (
        <div className={styles.ruleWidget}>
            <div className={styles.ruleHeader}>
                <h3 className={styles.ruleTitle}>Analisi 50/30/20</h3>
            </div>

            <BudgetBars
                income={totalIncome}
                needsActual={needsActual}
                wantsActual={wantsActual}
                title="Totale"
                color="var(--text-primary)"
            />

            <div className={styles.ruleDivider} />

            <BudgetBars
                income={myIncome}
                needsActual={myNeedsActual}
                wantsActual={myWantsActual}
                title="Tu"
                color="var(--accent-light)"
            />

            <div className={styles.ruleDivider} />

            <BudgetBars
                income={partnerIncome}
                needsActual={partnerNeedsActual}
                wantsActual={partnerWantsActual}
                title="Partner"
                color="var(--success)"
            />
        </div>
    );
}

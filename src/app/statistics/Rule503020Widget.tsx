'use client';

import styles from './page.module.css';

interface Rule503020WidgetProps {
    totalIncome: number;
    needsActual: number;
    wantsActual: number;
}

function formatCurrency(amount: number) {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);
}

export default function Rule503020Widget({ totalIncome, needsActual, wantsActual }: Rule503020WidgetProps) {
    if (totalIncome <= 0) {
        return (
            <div className={styles.ruleWidgetEmpty}>
                <p>⚠️ Imposta gli stipendi nel Profilo per attivare l'analisi 50/30/20.</p>
            </div>
        );
    }

    // Targets
    const needsTarget = totalIncome * 0.50;
    const wantsTarget = totalIncome * 0.30;
    const savingsTarget = totalIncome * 0.20;

    // Actuals (Savings is whatever is left over from income after actual needs/wants, capped at minimum 0 for display)
    const savingsActual = Math.max(0, totalIncome - needsActual - wantsActual);

    // Percentages for Progress Bars
    const needsPct = Math.min(100, (needsActual / needsTarget) * 100);
    const wantsPct = Math.min(100, (wantsActual / wantsTarget) * 100);

    // For savings, if we meet or exceed the target, it's 100% "good". If we save less, the bar is lower.
    const savingsPct = Math.min(100, (savingsActual / savingsTarget) * 100);

    return (
        <div className={styles.ruleWidget}>
            <div className={styles.ruleHeader}>
                <h3 className={styles.ruleTitle}>Analisi 50/30/20</h3>
                <p className={styles.ruleSubtitle}>Budget basato sulle entrate totali: {formatCurrency(totalIncome)}</p>
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
        </div>
    );
}

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Transaction } from '@/lib/types';
import styles from './page.module.css';
import { getCategoryById } from '@/lib/categories';

function formatCurrency(amount: number) {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
}

function monthKey(dateStr: string) {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string) {
    const [year, month] = key.split('-');
    const d = new Date(Number(year), Number(month) - 1, 1);
    return d.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
}

export default async function BilancioPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: profile } = await supabase
        .from('profiles')
        .select('household_id, full_name, salary')
        .eq('id', user.id)
        .single();

    if (!profile?.household_id) redirect('/setup');

    const { data: householdProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, salary')
        .eq('household_id', profile.household_id);

    const { data: household } = await supabase
        .from('households')
        .select('split_mode')
        .eq('id', profile.household_id)
        .single();

    const splitMode = household?.split_mode || 'equal';

    const userName = profile.full_name?.split(' ')[0] ?? 'Tu';
    const partnerProfile = householdProfiles?.find(p => p.id !== user.id);
    const partnerName = partnerProfile?.full_name?.split(' ')[0] ?? 'Partner';

    // ── Fetch all transactions (storico) ──────────────────────────────
    const { data: allTransactions } = await supabase
        .from('transactions')
        .select('id, user_id, amount, date, description, category_id')
        .eq('household_id', profile.household_id)
        .order('date', { ascending: true });

    const mySalary = Number(profile.salary) || 0;
    const partnerSalary = Number(partnerProfile?.salary) || 0;
    const totalIncome = mySalary + partnerSalary;
    const myWeight = splitMode === 'proportional' && totalIncome > 0
        ? mySalary / totalIncome
        : 0.5;

    // Group transactions by month
    const monthMap: Record<string, { myPaid: number; partnerPaid: number; transactions: typeof allTransactions }> = {};
    for (const t of allTransactions ?? []) {
        const key = monthKey(t.date);
        if (!monthMap[key]) monthMap[key] = { myPaid: 0, partnerPaid: 0, transactions: [] };
        if (t.user_id === user.id) {
            monthMap[key].myPaid += Number(t.amount);
        } else {
            monthMap[key].partnerPaid += Number(t.amount);
        }
        monthMap[key].transactions?.push(t);
    }

    const sortedKeys = Object.keys(monthMap).sort();
    let runningBalance = 0;
    const months = sortedKeys.map(key => {
        const { myPaid, partnerPaid, transactions } = monthMap[key];
        const total = myPaid + partnerPaid;
        const myFairShare = total * myWeight;
        const monthDelta = myPaid - myFairShare;
        runningBalance += monthDelta;
        return { key, myPaid, partnerPaid, total, monthDelta, runningBalance, transactions };
    });

    const allMyTotal = (allTransactions ?? [])
        .filter(t => t.user_id === user.id)
        .reduce((s, t) => s + Number(t.amount), 0);
    const allPartnerTotal = (allTransactions ?? [])
        .filter(t => t.user_id !== user.id)
        .reduce((s, t) => s + Number(t.amount), 0);
    const grandTotal = allMyTotal + allPartnerTotal;
    const cumulativeBalance = allMyTotal - grandTotal * myWeight;

    const byYear: Record<string, typeof months> = {};
    for (const m of months) {
        const year = m.key.split('-')[0];
        if (!byYear[year]) byYear[year] = [];
        byYear[year].push(m);
    }
    const years = Object.keys(byYear).sort((a, b) => Number(b) - Number(a));

    const isCredit = cumulativeBalance > 0.01;
    const isDebt = cumulativeBalance < -0.01;
    const cumulativeColor = isCredit ? 'var(--success)' : isDebt ? 'var(--danger)' : 'var(--text-secondary)';
    const cumulativeMessage = isCredit
        ? `${partnerName} ti deve ${formatCurrency(cumulativeBalance)}`
        : isDebt
            ? `Devi ${formatCurrency(Math.abs(cumulativeBalance))} a ${partnerName}`
            : 'Siete perfettamente in pari!';

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <h1 className={styles.title}>⚖️ Bilancio</h1>
                <p className={styles.subtitle}>Storico debiti e crediti</p>
            </header>

            {/* Hero: Cumulative Balance */}
            <div className={styles.heroCard} style={{ borderColor: cumulativeColor }}>
                <p className={styles.heroLabel}>Saldo Totale Accumulato</p>
                <p className={styles.heroAmount} style={{ color: cumulativeColor }}>
                    {formatCurrency(Math.abs(cumulativeBalance))}
                </p>
                <p className={styles.heroMessage}>{cumulativeMessage}</p>
                <div className={styles.heroDivider} />
                <div className={styles.heroGrid}>
                    <div className={styles.heroStat}>
                        <span className={styles.heroStatLabel}>{userName} ha pagato</span>
                        <span className={styles.heroStatValue} style={{ color: 'var(--accent-light)' }}>
                            {formatCurrency(allMyTotal)}
                        </span>
                    </div>
                    <div className={styles.heroStat}>
                        <span className={styles.heroStatLabel}>{partnerName} ha pagato</span>
                        <span className={styles.heroStatValue} style={{ color: 'var(--success)' }}>
                            {formatCurrency(allPartnerTotal)}
                        </span>
                    </div>
                    <div className={styles.heroStat}>
                        <span className={styles.heroStatLabel}>Totale speso</span>
                        <span className={styles.heroStatValue}>{formatCurrency(grandTotal)}</span>
                    </div>
                    <div className={styles.heroStat}>
                        <span className={styles.heroStatLabel}>Divisione</span>
                        <span className={styles.heroStatValue}>
                            {splitMode === 'proportional'
                                ? totalIncome > 0 
                                    ? `Proporzionale (${Math.round(myWeight * 100)}/${Math.round((1 - myWeight) * 100)})` 
                                    : 'Proporzionale (Salari: 0€)'
                                : '50/50'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Monthly Timeline */}
            {months.length === 0 ? (
                <div className={styles.empty}>
                    <span>📭</span>
                    <p>Nessuna transazione registrata ancora.</p>
                </div>
            ) : (
                years.map(year => (
                    <section key={year} className={styles.yearSection}>
                        <h2 className={styles.yearLabel}>{year}</h2>
                        <div className={styles.timeline}>
                            {byYear[year].slice().reverse().map((m) => {
                                const isNow = m.key === monthKey(new Date().toISOString());
                                const deltaPositive = m.monthDelta > 0.01;
                                const deltaNegative = m.monthDelta < -0.01;
                                const deltaColor = deltaPositive ? 'var(--success)' : deltaNegative ? 'var(--danger)' : 'var(--text-secondary)';
                                const runPositive = m.runningBalance > 0.01;
                                const runNegative = m.runningBalance < -0.01;
                                const runColor = runPositive ? 'var(--success)' : runNegative ? 'var(--danger)' : 'var(--text-secondary)';
                                return (
                                    <details key={m.key} className={`${styles.monthCard} ${isNow ? styles.monthCardCurrent : ''}`}>
                                        <summary className={styles.monthSummary}>
                                            <div className={styles.monthCardHeader}>
                                                <div>
                                                    <p className={styles.monthName} style={{ textTransform: 'capitalize' }}>
                                                        {monthLabel(m.key)}
                                                        {isNow && <span className={styles.nowBadge}>In corso</span>}
                                                    </p>
                                                    <p className={styles.monthTotal}>Totale: {formatCurrency(m.total)}</p>
                                                </div>
                                                <div className={styles.runningBadge} style={{ background: `${runColor}18`, borderColor: `${runColor}44`, color: runColor }}>
                                                    {runPositive ? `▲ ${formatCurrency(m.runningBalance)}` : runNegative ? `▼ ${formatCurrency(Math.abs(m.runningBalance))}` : '⚖ Pari'}
                                                </div>
                                            </div>

                                            <div className={styles.paidRow}>
                                                <div className={styles.paidItem}>
                                                    <span className={styles.paidDot} style={{ background: 'var(--accent)' }} />
                                                    <span className={styles.paidName}>{userName}</span>
                                                    <span className={styles.paidAmount} style={{ color: 'var(--accent-light)' }}>{formatCurrency(m.myPaid)}</span>
                                                </div>
                                                <div className={styles.paidItem}>
                                                    <span className={styles.paidDot} style={{ background: 'var(--success)' }} />
                                                    <span className={styles.paidName}>{partnerName}</span>
                                                    <span className={styles.paidAmount} style={{ color: 'var(--success)' }}>{formatCurrency(m.partnerPaid)}</span>
                                                </div>
                                            </div>

                                            <div className={styles.deltaRow} style={{ color: deltaColor }}>
                                                <span className={styles.deltaLabel}>Δ questo mese:</span>
                                                <span className={styles.deltaValue}>
                                                    {deltaPositive
                                                        ? `${partnerName} deve ${formatCurrency(m.monthDelta)}`
                                                        : deltaNegative
                                                            ? `${userName} deve ${formatCurrency(Math.abs(m.monthDelta))}`
                                                            : 'Pari'}
                                                </span>
                                            </div>
                                        </summary>

                                        <div className={styles.monthDetails}>
                                            {m.transactions?.slice().reverse().map(t => {
                                                const cat = getCategoryById(t.category_id);
                                                const isMe = t.user_id === user.id;
                                                const txColor = isMe ? 'var(--accent)' : 'var(--success)';
                                                const txName = isMe ? userName : partnerName;
                                                const tDate = new Date(t.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });

                                                return (
                                                    <div key={t.id} className={styles.txRow}>
                                                        <div className={styles.txIcon} style={{ background: cat.color + '22', color: cat.color }}>
                                                            {cat.icon}
                                                        </div>
                                                        <div className={styles.txInfo}>
                                                            <span className={styles.txName}>{cat.name} {t.description ? `- ${t.description}` : ''}</span>
                                                            <span className={styles.txDateUser}>{tDate} • Pagato da <span style={{ color: txColor, fontWeight: 600 }}>{txName}</span></span>
                                                        </div>
                                                        <span className={styles.txAmount}>-{formatCurrency(Number(t.amount))}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </details>
                                );
                            })}
                        </div>
                    </section>
                ))
            )}
        </div>
    );
}

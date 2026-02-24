'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { CATEGORIES } from '@/lib/categories';
import styles from './page.module.css';

export default function AddTransactionPage() {
    const router = useRouter();
    const [amount, setAmount] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const parsedAmount = parseFloat(amount.replace(',', '.'));
        if (!categoryId) { setError('Seleziona una categoria.'); return; }
        if (isNaN(parsedAmount) || parsedAmount <= 0) { setError('Inserisci un importo valido.'); return; }

        setLoading(true);
        setError('');

        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }

        const { data: profile } = await supabase
            .from('profiles')
            .select('household_id')
            .eq('id', user.id)
            .single();

        if (!profile?.household_id) {
            setError('Nessun gruppo associato. Torna alla home.');
            setLoading(false);
            return;
        }

        const { error: dbError } = await supabase.from('transactions').insert({
            user_id: user.id,
            household_id: profile.household_id,
            amount: parsedAmount,
            category_id: categoryId,
            description: description.trim() || null,
            date,
        });

        if (dbError) {
            setError('Errore nel salvataggio. Riprova.');
            setLoading(false);
        } else {
            router.push('/dashboard');
            router.refresh();
        }
    };

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <button className={styles.back} onClick={() => router.back()} aria-label="Indietro">‹</button>
                <h1 className={styles.title}>Nuova Spesa</h1>
                <div style={{ width: 40 }} />
            </header>

            <form onSubmit={handleSubmit} className={styles.form}>
                {/* Amount */}
                <div className={styles.amountSection}>
                    <label className={styles.amountLabel}>Importo</label>
                    <div className={styles.amountInput}>
                        <span className={styles.currency}>€</span>
                        <input
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            min="0.01"
                            placeholder="0,00"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            className={styles.amount}
                            required
                        />
                    </div>
                </div>

                {/* Category */}
                <div className={styles.section}>
                    <p className={styles.sectionLabel}>Categoria</p>
                    <div className={styles.categoryGrid}>
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat.id}
                                type="button"
                                onClick={() => setCategoryId(cat.id)}
                                className={`${styles.catBtn} ${categoryId === cat.id ? styles.catActive : ''}`}
                                style={categoryId === cat.id ? { borderColor: cat.color, background: cat.color + '22' } : {}}
                            >
                                <span className={styles.catEmoji}>{cat.icon}</span>
                                <span className={styles.catName}>{cat.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Description */}
                <div className={styles.section}>
                    <label htmlFor="desc" className={styles.sectionLabel}>Descrizione (opzionale)</label>
                    <input
                        id="desc"
                        type="text"
                        placeholder="es. Cena da Mario..."
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        className={styles.input}
                        maxLength={100}
                    />
                </div>

                {/* Date */}
                <div className={styles.section}>
                    <label htmlFor="date" className={styles.sectionLabel}>Data</label>
                    <input
                        id="date"
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className={styles.input}
                        required
                    />
                </div>

                {error && <p className={styles.error}>{error}</p>}

                <button type="submit" className={styles.submit} disabled={loading}>
                    {loading ? <span className={styles.spinner} /> : '💾 Salva Spesa'}
                </button>
            </form>
        </div>
    );
}

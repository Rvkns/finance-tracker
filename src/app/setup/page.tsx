'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import styles from './page.module.css';

export default function SetupPage() {
    const router = useRouter();
    const [mode, setMode] = useState<'create' | 'join' | null>(null);
    const [householdName, setHouseholdName] = useState('');
    const [inviteCode, setInviteCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Create household
        const { data: household, error: hError } = await supabase
            .from('households')
            .insert({ name: householdName || 'Casa' })
            .select('id')
            .single();

        if (hError || !household) {
            setError('Errore nella creazione del gruppo.');
            setLoading(false);
            return;
        }

        // 2. Assign user to household
        const { error: pError } = await supabase
            .from('profiles')
            .update({ household_id: household.id })
            .eq('id', user.id);

        if (pError) {
            setError('Errore durante il collegamento al gruppo.');
            setLoading(false);
            return;
        }

        router.push('/dashboard');
        router.refresh();
    };

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteCode) return;
        setLoading(true);
        setError('');

        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Find household by code
        const { data: household } = await supabase
            .from('households')
            .select('id')
            .eq('invite_code', inviteCode.toUpperCase())
            .single();

        if (!household) {
            setError('Codice non valido o gruppo inesistente.');
            setLoading(false);
            return;
        }

        // 2. Assign user
        const { error: pError } = await supabase
            .from('profiles')
            .update({ household_id: household.id })
            .eq('id', user.id);

        if (pError) {
            setError('Errore durante l\'unione al gruppo.');
            setLoading(false);
            return;
        }

        router.push('/dashboard');
        router.refresh();
    };

    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push('/login');
        router.refresh();
    };

    if (mode === 'create') {
        return (
            <div className={styles.container}>
                <div className={styles.card + ' animate-scale'}>
                    <button className={styles.backBtn} onClick={() => setMode(null)}>‹ Indietro</button>
                    <h1 className={styles.title}>Crea un nuovo gruppo</h1>
                    <p className={styles.subtitle}>Inizia a tracciare le spese per la tua famiglia.</p>

                    <form onSubmit={handleCreate} className={styles.form}>
                        <div className={styles.field}>
                            <label htmlFor="hName" className={styles.label}>Nome Famiglia/Gruppo</label>
                            <input
                                id="hName"
                                type="text"
                                placeholder="es. Casa Rossi"
                                value={householdName}
                                onChange={e => setHouseholdName(e.target.value)}
                                className={styles.input}
                                required
                            />
                        </div>
                        {error && <p className={styles.error}>{error}</p>}
                        <button type="submit" className={styles.submitBtn} disabled={loading}>
                            {loading ? 'Creazione...' : 'Crea e Continua'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    if (mode === 'join') {
        return (
            <div className={styles.container}>
                <div className={styles.card + ' animate-scale'}>
                    <button className={styles.backBtn} onClick={() => setMode(null)}>‹ Indietro</button>
                    <h1 className={styles.title}>Unisciti a un gruppo</h1>
                    <p className={styles.subtitle}>Inserisci il codice di invito del tuo partner.</p>

                    <form onSubmit={handleJoin} className={styles.form}>
                        <div className={styles.field}>
                            <label htmlFor="code" className={styles.label}>Codice (6 caratteri)</label>
                            <input
                                id="code"
                                type="text"
                                placeholder="XR7L9Q"
                                value={inviteCode}
                                onChange={e => setInviteCode(e.target.value)}
                                className={styles.input}
                                style={{ textTransform: 'uppercase', letterSpacing: '2px', textAlign: 'center', fontSize: '20px' }}
                                maxLength={6}
                                required
                            />
                        </div>
                        {error && <p className={styles.error}>{error}</p>}
                        <button type="submit" className={styles.submitBtn} disabled={loading}>
                            {loading ? 'Verifica...' : 'Unisciti'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.glow} />
            <div className={styles.card + ' animate-scale'}>
                <div className={styles.logoWrapper}>
                    <span className={styles.emoji}>🏠</span>
                </div>
                <h1 className={styles.titleCenter}>Benvenuto!</h1>
                <p className={styles.subtitleCenter}>Per iniziare, devi unirti a un gruppo familiare o crearne uno nuovo.</p>

                <div className={styles.options}>
                    <button className={styles.optionBtn} onClick={() => setMode('create')}>
                        <span className={styles.opIcon}>✨</span>
                        <div className={styles.opText}>
                            <strong>Crea un nuovo gruppo</strong>
                            <span>Sarai il primo membro</span>
                        </div>
                    </button>

                    <button className={styles.optionBtn} onClick={() => setMode('join')}>
                        <span className={styles.opIcon}>🤝</span>
                        <div className={styles.opText}>
                            <strong>Unisciti tramite codice</strong>
                            <span>Il tuo partner ha già un account</span>
                        </div>
                    </button>
                </div>

                <button onClick={handleLogout} className={styles.logoutBtn}>Disconnetti</button>
            </div>
        </div>
    );
}

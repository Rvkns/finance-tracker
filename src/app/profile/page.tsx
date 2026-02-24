'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import styles from './page.module.css';

export default function ProfilePage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const [householdCode, setHouseholdCode] = useState('');
    const [householdName, setHouseholdName] = useState('');

    useEffect(() => {
        const supabase = createClient();

        const fetchProfileData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push('/login'); return; }

            setEmail(user.email ?? '');
            setName(user.user_metadata?.full_name ?? '');

            // Fetch household info
            const { data: profile } = await supabase
                .from('profiles')
                .select('household_id')
                .eq('id', user.id)
                .single();

            if (profile?.household_id) {
                const { data: hk } = await supabase
                    .from('households')
                    .select('name, invite_code')
                    .eq('id', profile.household_id)
                    .single();

                if (hk) {
                    setHouseholdName(hk.name);
                    setHouseholdCode(hk.invite_code);
                }
            }
        };

        fetchProfileData();
    }, [router]);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const supabase = createClient();
        await supabase.auth.updateUser({ data: { full_name: name } });
        setLoading(false);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
    };

    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push('/login');
        router.refresh();
    };

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <h1 className={styles.title}>Profilo 👤</h1>
            </header>

            <div className={styles.avatarSection}>
                <div className={styles.avatar}>{name.charAt(0).toUpperCase() || '?'}</div>
                <p className={styles.email}>{email}</p>
            </div>

            <form onSubmit={handleUpdate} className={styles.form}>
                <div className={styles.field}>
                    <label htmlFor="name" className={styles.label}>Nome</label>
                    <input
                        id="name"
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className={styles.input}
                        placeholder="Il tuo nome"
                    />
                </div>
                {success && <p className={styles.success}>✅ Aggiornato con successo!</p>}
                <button type="submit" className={styles.btn} disabled={loading}>
                    {loading ? 'Salvataggio...' : 'Salva modifiche'}
                </button>
            </form>

            <div className={styles.householdSection}>
                <h2 className={styles.householdTitle}>Il tuo Gruppo</h2>
                <div className={styles.householdCard}>
                    <p className={styles.householdName}>{householdName || 'Caricamento...'}</p>
                    <div className={styles.inviteBox}>
                        <span className={styles.inviteLabel}>Codice Invito:</span>
                        <span className={styles.inviteCode}>{householdCode || '...'}</span>
                    </div>
                    <p className={styles.inviteHint}>Condividi questo codice con il tuo partner per unire i vostri account.</p>
                </div>
            </div>

            <button onClick={handleLogout} className={styles.logoutBtn}>
                🚪 Disconnetti
            </button>
        </div>
    );
}

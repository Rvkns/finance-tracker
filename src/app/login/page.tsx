'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import styles from './auth.module.css';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const supabase = createClient();
        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            setError('Email o password non corretti.');
            setLoading(false);
        } else {
            router.push('/dashboard');
            router.refresh();
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.glow} />
            <div className={styles.card + ' animate-scale'}>
                <div className={styles.logo}>
                    <span className={styles.logoIcon}>💰</span>
                    <h1 className={styles.logoText}>FinanceHome</h1>
                </div>
                <p className={styles.subtitle}>Accedi al tuo account</p>

                <form onSubmit={handleLogin} className={styles.form}>
                    <div className={styles.field}>
                        <label htmlFor="email" className={styles.label}>Email</label>
                        <input
                            id="email"
                            type="email"
                            autoComplete="email"
                            placeholder="la-tua@email.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className={styles.input}
                            required
                        />
                    </div>

                    <div className={styles.field}>
                        <label htmlFor="password" className={styles.label}>Password</label>
                        <input
                            id="password"
                            type="password"
                            autoComplete="current-password"
                            placeholder="••••••••"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className={styles.input}
                            required
                        />
                    </div>

                    {error && <p className={styles.error}>{error}</p>}

                    <button type="submit" className={styles.btn} disabled={loading}>
                        {loading ? <span className={styles.spinner} /> : 'Accedi'}
                    </button>
                </form>

                <p className={styles.switchText}>
                    Non hai un account?{' '}
                    <Link href="/signup" className={styles.link}>Registrati</Link>
                </p>
            </div>
        </div>
    );
}

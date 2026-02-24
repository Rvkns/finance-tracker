'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import styles from '../login/auth.module.css';

export default function SignupPage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password.length < 6) {
            setError('La password deve essere di almeno 6 caratteri.');
            return;
        }
        setLoading(true);
        setError('');

        const supabase = createClient();
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: name } },
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        } else if (data.user && !data.session) {
            setSuccess(true);
            setLoading(false);
        } else {
            router.push('/dashboard');
            router.refresh();
        }
    };

    if (success) {
        return (
            <div className={styles.container}>
                <div className={styles.glow} />
                <div className={styles.card + ' animate-scale'} style={{ textAlign: 'center' }}>
                    <div className={styles.logo}>
                        <span className={styles.logoIcon}>✅</span>
                        <h1 className={styles.logoText}>Quasi fatto!</h1>
                    </div>
                    <p className={styles.subtitle}>
                        Abbiamo inviato un&apos;email di conferma a <strong>{email}</strong>.<br />
                        Clicca sul link per attivare il tuo account.
                    </p>
                    <Link href="/login" className={styles.btn} style={{ display: 'block', marginTop: '24px', textAlign: 'center' }}>
                        Vai al Login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.glow} />
            <div className={styles.card + ' animate-scale'}>
                <div className={styles.logo}>
                    <span className={styles.logoIcon}>💰</span>
                    <h1 className={styles.logoText}>FinanceHome</h1>
                </div>
                <p className={styles.subtitle}>Crea il tuo account</p>

                <form onSubmit={handleSignup} className={styles.form}>
                    <div className={styles.field}>
                        <label htmlFor="name" className={styles.label}>Nome</label>
                        <input
                            id="name"
                            type="text"
                            autoComplete="name"
                            placeholder="Il tuo nome"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className={styles.input}
                            required
                        />
                    </div>

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
                            autoComplete="new-password"
                            placeholder="Minimo 6 caratteri"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className={styles.input}
                            required
                        />
                    </div>

                    {error && <p className={styles.error}>{error}</p>}

                    <button type="submit" className={styles.btn} disabled={loading}>
                        {loading ? <span className={styles.spinner} /> : 'Registrati'}
                    </button>
                </form>

                <p className={styles.switchText}>
                    Hai già un account?{' '}
                    <Link href="/login" className={styles.link}>Accedi</Link>
                </p>
            </div>
        </div>
    );
}

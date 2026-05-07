'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './BottomNav.module.css';

const navItems = [
    { href: '/dashboard', label: 'Home', icon: '🏠' },
    { href: '/statistics', label: 'Statistiche', icon: '📊' },
    { href: '/dashboard/add', label: '', icon: '+', isAdd: true },
    { href: '/abbonamenti', label: 'Abbonamenti', icon: '📱' },
    { href: '/bilancio', label: 'Bilancio', icon: '⚖️' },
    { href: '/profile', label: 'Profilo', icon: '👤' },
];

export default function BottomNav() {
    const pathname = usePathname();

    return (
        <nav className={styles.nav} aria-label="Navigazione principale">
            {navItems.map((item) => {
                if (item.isAdd) {
                    return (
                        <Link key={item.href} href={item.href} className={styles.addBtn} aria-label="Aggiungi spesa">
                            <span className={styles.addIcon}>+</span>
                        </Link>
                    );
                }
                const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                        aria-current={isActive ? 'page' : undefined}
                    >
                        <span className={styles.icon} aria-hidden="true">{item.icon}</span>
                        <span className={styles.label}>{item.label}</span>
                    </Link>
                );
            })}
        </nav>
    );
}

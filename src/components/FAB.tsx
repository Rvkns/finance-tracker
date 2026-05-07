'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './FAB.module.css';

export default function FAB() {
    const pathname = usePathname();

    // Hide FAB if we are already on the 'add' page to avoid redundancy
    if (pathname === '/dashboard/add') {
        return null;
    }

    return (
        <Link href="/dashboard/add" className={styles.fab} aria-label="Aggiungi spesa">
            <span className={styles.icon}>+</span>
        </Link>
    );
}

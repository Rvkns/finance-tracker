'use client';

import Link from 'next/link';
import styles from './page.module.css';

interface Props {
    activeTab: 'storico' | 'strutturali';
}

export default function BilancioTabs({ activeTab }: Props) {
    return (
        <div className={styles.tabs}>
            <Link
                href="/bilancio?tab=storico"
                className={`${styles.tab} ${activeTab === 'storico' ? styles.tabActive : ''}`}
            >
                📅 Storico
            </Link>
            <Link
                href="/bilancio?tab=strutturali"
                className={`${styles.tab} ${activeTab === 'strutturali' ? styles.tabActive : ''}`}
            >
                🏗️ Strutturali
            </Link>
        </div>
    );
}

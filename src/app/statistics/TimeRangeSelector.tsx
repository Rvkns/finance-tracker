'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import styles from './page.module.css';

export default function TimeRangeSelector() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentRange = searchParams.get('range') || 'month';

    const handleRangeChange = (range: string) => {
        router.push(`/statistics?range=${range}`);
        router.refresh();
    };

    return (
        <div className={styles.rangeSelector}>
            <button
                className={`${styles.rangeBtn} ${currentRange === 'week' ? styles.rangeBtnActive : ''}`}
                onClick={() => handleRangeChange('week')}
            >
                Settimana
            </button>
            <button
                className={`${styles.rangeBtn} ${currentRange === 'month' ? styles.rangeBtnActive : ''}`}
                onClick={() => handleRangeChange('month')}
            >
                Mese
            </button>
            <button
                className={`${styles.rangeBtn} ${currentRange === 'year' ? styles.rangeBtnActive : ''}`}
                onClick={() => handleRangeChange('year')}
            >
                Anno
            </button>
        </div>
    );
}

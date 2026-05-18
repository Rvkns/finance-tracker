'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './SideMenu.module.css';

const menuItems = [
    { href: '/dashboard', label: 'Dashboard', icon: '🏠' },
    { href: '/statistics', label: 'Statistiche', icon: '📊' },
    { href: '/bilancio', label: 'Bilancio', icon: '⚖️' },
    { href: '/recurring', label: 'Bollette', icon: '⚡' },
    { href: '/strutturali', label: 'Spese Fisse', icon: '🏦' },
    { href: '/abbonamenti', label: 'Abbonamenti', icon: '📱' },
    { href: '/wiki', label: 'Wiki & Guida', icon: '📖' },
    { href: '/profile', label: 'Profilo', icon: '👤' },
];

export default function SideMenu() {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();

    // Close menu when route changes
    useEffect(() => {
        setIsOpen(false);
    }, [pathname]);

    // Prevent body scroll when menu is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    return (
        <>
            {/* Hamburger Button */}
            <button 
                className={`${styles.menuToggle} ${isOpen ? styles.open : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Menu navigazione"
            >
                <div className={styles.arrowIcon}>
                    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                </div>
            </button>

            {/* Overlay */}
            <div 
                className={`${styles.overlay} ${isOpen ? styles.overlayVisible : ''}`} 
                onClick={() => setIsOpen(false)}
                aria-hidden="true"
            />

            {/* Drawer */}
            <nav className={`${styles.drawer} ${isOpen ? styles.drawerOpen : ''}`}>
                <div className={styles.drawerHeader}>
                    <h2>Menu</h2>
                </div>
                
                <ul className={styles.menuList}>
                    {menuItems.map(item => {
                        const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                        return (
                            <li key={item.href}>
                                <Link 
                                    href={item.href} 
                                    className={`${styles.menuLink} ${isActive ? styles.active : ''}`}
                                >
                                    <span className={styles.menuIcon}>{item.icon}</span>
                                    <span className={styles.menuLabel}>{item.label}</span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>
        </>
    );
}

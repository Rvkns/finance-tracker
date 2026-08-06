'use client';

import { useState } from 'react';
import styles from './page.module.css';

interface WikiSection {
    id: string;
    title: string;
    subtitle: string;
    icon: string;
    color: string;
    content: React.ReactNode;
}

export default function WikiPage() {
    const [openSectionId, setOpenSectionId] = useState<string | null>('dashboard');

    const toggleSection = (id: string) => {
        setOpenSectionId(prev => prev === id ? null : id);
    };

    const sections: WikiSection[] = [
        {
            id: 'dashboard',
            title: '🏠 Dashboard & Spese Quotidiane',
            subtitle: 'La tua panoramica mensile sulle spese correnti',
            icon: '🏠',
            color: 'rgba(99, 102, 241, 0.1)',
            content: (
                <>
                    <p className={styles.wikiText}>
                        La <strong>Dashboard</strong> è il centro di controllo dell\'applicazione. Qui monitori lo stato economico del mese in corso e registri le spese variabili del giorno.
                    </p>
                    <h3 className={styles.wikiTitle}>📌 Elementi Chiave</h3>
                    <ul className={styles.wikiList}>
                        <li className={styles.wikiListItem}>
                            <strong>Totale speso questo mese:</strong> Somma di tutte le spese ordinarie registrate nel mese corrente dai due partner.
                        </li>
                        <li className={styles.wikiListItem}>
                            <strong>Divisione (50/50 o Proporzionale):</strong> Potete scegliere se dividere le spese in parti uguali (50/50) o in proporzione ai vostri salari inseriti nel Profilo. L\'app adeguerà i calcoli all\'istante.
                        </li>
                        <li className={styles.wikiListItem}>
                            <strong>Tasto Azione Rapida (+):</strong> Il pulsante fluttuante in basso a destra (FAB) vi permette di inserire rapidamente una spesa ordinaria impostando importo, categoria, data e chi ha pagato.
                        </li>
                    </ul>
                    <div className={styles.tipBox}>
                        <p className={styles.tipTitle}>💡 Consiglio per il cambio mese</p>
                        <p className={styles.tipText}>
                            A fine mese, una volta liquidato il debito/credito residuo, potete premere il tasto <strong>"Reset Mensile"</strong> nel profilo o nella dashboard per archiviare il mese e ripartire puliti con un contatore a zero!
                        </p>
                    </div>
                </>
            ),
        },
        {
            id: 'bilancio',
            title: '⚖️ Bilancio (Storico Debiti e Crediti)',
            subtitle: 'Chi deve quanto all\'altro nel corso del tempo',
            icon: '⚖️',
            color: 'rgba(236, 72, 153, 0.1)',
            content: (
                <>
                    <p className={styles.wikiText}>
                        Il <strong>Bilancio</strong> tiene traccia dell\'equilibrio finanziario tra partner nel corso del tempo. È uno storico cumulativo cumulato che non si azzera a fine mese finché non vi rimettete in pari.
                    </p>
                    <h3 className={styles.wikiTitle}>📌 Come funziona il Saldo Cumulativo</h3>
                    <ul className={styles.wikiList}>
                        <li className={styles.wikiListItem}>
                            Se Ninja spende 30€ per la spesa alimentare e Sabrina spende 10€, in un sistema 50/50 l\'app calcolerà che Sabrina deve a Ninja la metà della differenza (10€).
                        </li>
                        <li className={styles.wikiListItem}>
                            Il widget verde o rosso in Home mostra a colpo d\'occhio **chi deve rimborsare chi** e di quanto.
                        </li>
                    </ul>
                    <div className={styles.tipBox}>
                        <p className={styles.tipTitle}>💎 La filosofia del "Bilancio Pulito"</p>
                        <p className={styles.tipText}>
                            I grandi finanziamenti e spese a lungo termine (Mutuo, prestiti) **sono volutamente escluse da questa sezione**. In questo modo, la cifra che vi dovete a fine mese rispecchia unicamente le spese reali e variabili della vita quotidiana (cibo, cene, svago, piccoli acquisti), senza essere distorta da rate giganti!
                        </p>
                    </div>
                </>
            ),
        },
        {
            id: 'fisse',
            title: '⚡ Bollette & Utenze',
            subtitle: 'Registrazione e categorizzazione delle bollette di casa',
            icon: '⚡',
            color: 'rgba(234, 179, 8, 0.1)',
            content: (
                <>
                    <p className={styles.wikiText}>
                        Le <strong>Bollette con addebito automatico</strong> (Luce, Gas, Acqua, Internet, TARI) vengono gestite direttamente inserendole come spese standard nel bilancio della casa.
                    </p>
                    <h3 className={styles.wikiTitle}>📌 Come registrarle</h3>
                    <ul className={styles.wikiList}>
                        <li className={styles.wikiListItem}>
                            <strong>Categorizzazione dedicata:</strong> Quando viene addebitata una bolletta, premere il tasto <strong>+</strong> e selezionare la relativa categoria (💧 Acqua, ⚡ Luce, 🔥 Gas, 🗑️ Mondezza/TARI, 🌐 Internet, ⚡ Bollette Generiche).
                        </li>
                        <li className={styles.wikiListItem}>
                            <strong>Analisi nelle Statistiche:</strong> Grazie alle categorie dedicate, potrai monitorare e confrontare in ogni momento l'andamento dei costi energetici e delle utenze nella sezione Statistiche.
                        </li>
                    </ul>
                </>
            ),
        },
        {
            id: 'strutturali',
            title: '🏦 Spese Fisse (Mutuo e Prestiti)',
            subtitle: 'Compensazione automatica dei grandi finanziamenti',
            icon: '🏦',
            color: 'rgba(168, 85, 247, 0.1)',
            content: (
                <>
                    <p className={styles.wikiText}>
                        Le <strong>Spese Fisse</strong> sono i grandi pilastri economici (Mutuo, prestiti personali, rate della cucina) che gestite mensilmente in modo separato, solitamente tramite bonifici su un conto cointestato.
                    </p>
                    <h3 className={styles.wikiTitle}>📌 L\'algoritmo di Compensazione</h3>
                    <p className={styles.wikiText}>
                        Spesso queste rate non vengono pagate 50/50 in modo diretto, ma vengono "compensate". Ad esempio:
                    </p>
                    <ul className={styles.wikiList}>
                        <li className={styles.wikiListItem}>
                            Il <strong>Mutuo</strong> e la <strong>Cucina</strong> sono impostati come <strong>Cointestati 🏦</strong> (pagati dal conto comune).
                        </li>
                        <li className={styles.wikiListItem}>
                            Il <strong>Prestito Ristrutturazione</strong> è impostato come <strong>Pago io 👤</strong> (pagato interamente da te).
                        </li>
                        <li className={styles.wikiListItem}>
                            L\'app calcola in automatico le quote e vi dice esattamente quanti euro dovete bonificare sul conto cointestato questo mese. La quota di mutuo di chi paga il prestito viene ridotta del credito spettante, mentre la quota del partner aumenta di conseguenza. Il conto cointestato viene così rimpinguato della cifra esatta.
                        </li>
                    </ul>
                    <h3 className={styles.wikiTitle}>📌 Tasto "Paga" e Sincronizzazione Database</h3>
                    <ul className={styles.wikiList}>
                        <li className={styles.wikiListItem}>
                            Cliccando su <strong>"Paga"</strong> sulla card di una spesa fissa, la spesa viene segnata come saldata per il mese corrente.
                        </li>
                        <li className={styles.wikiListItem}>
                            Questa informazione viene salvata in modo sicuro nel **Database Supabase**. Se tu segni "Pagato" sul tuo telefono, la modifica sarà visibile in tempo reale anche sul dispositivo di Sabrina!
                        </li>
                        <li className={styles.wikiListItem}>
                            Quando tutte le spese fisse sono saldate, compare un banner verde di conferma. Lo stato si resetta in automatico all\'inizio del mese successivo!
                        </li>
                    </ul>
                </>
            ),
        },
        {
            id: 'abbonamenti',
            title: '📱 Abbonamenti Mensili',
            subtitle: 'Servizi ricreativi e intrattenimento digitale',
            icon: '📱',
            color: 'rgba(20, 184, 166, 0.1)',
            content: (
                <>
                    <p className={styles.wikiText}>
                        La sezione <strong>Abbonamenti</strong> vi permette di tracciare tutti i piccoli costi fissi di intrattenimento digitale o servizi personali (es. Netflix, Spotify, Amazon Prime, iCloud, Palestra).
                    </p>
                    <h3 className={styles.wikiTitle}>📌 Gestione e Impatto</h3>
                    <ul className={styles.wikiList}>
                        <li className={styles.wikiListItem}>
                            Queste spese sono a rinnovo mensile automatico e **incidono direttamente sul Bilancio ordinario**.
                        </li>
                        <li className={styles.wikiListItem}>
                            Mantenerli catalogati in questa sezione specifica vi permette di tenere sotto controllo quanto spendete in servizi digitali e di non confonderli con le bollette energetiche della casa.
                        </li>
                    </ul>
                </>
            ),
        }
    ];

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>📖 Wiki & Guida</h1>
                <p className={styles.subtitle}>Scopri come far quadrare i conti in modo perfetto</p>
            </header>

            <div className={styles.introCard}>
                <h2 className={styles.introTitle}>✨ Benvenuti nella Guida Finanziaria di Coppia</h2>
                <p className={styles.introText}>
                    Questa applicazione è stata strutturata per separare logicamente le spese di tutti i giorni (comprese le utenze domestiche), gli abbonamenti e i grandi investimenti a lungo termine (Spese Fisse). Di seguito trovi una spiegazione dettagliata di ciascun modulo per utilizzarlo al massimo del suo potenziale!
                </p>
            </div>

            <div className={styles.sectionsList}>
                {sections.map(sec => {
                    const isOpen = openSectionId === sec.id;
                    return (
                        <div 
                            key={sec.id} 
                            className={`${styles.sectionCard} ${isOpen ? styles.sectionCardOpen : ''}`}
                        >
                            <button 
                                className={styles.sectionHeader}
                                onClick={() => toggleSection(sec.id)}
                            >
                                <div className={styles.headerLeft}>
                                    <div 
                                        className={styles.iconWrapper}
                                        style={{ background: sec.color }}
                                    >
                                        {sec.icon}
                                    </div>
                                    <div>
                                        <h2 className={styles.sectionTitle}>{sec.title}</h2>
                                        <p className={styles.sectionSubtitle}>{sec.subtitle}</p>
                                    </div>
                                </div>
                                <span className={`${styles.arrow} ${isOpen ? styles.arrowOpen : ''}`}>▼</span>
                            </button>

                            {isOpen && (
                                <div className={styles.sectionContent}>
                                    {sec.content}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

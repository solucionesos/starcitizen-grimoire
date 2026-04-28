import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Calendar, ArrowUpDown, Scroll, Download, Loader2, Radio, RefreshCw, ExternalLink, Tag } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import DragonIcon from '../components/DragonIcon';
import { getChronicles } from '../api/client';

// ─── Types ───────────────────────────────────────────────────────────────────
interface NewsItem {
    id: string;
    title: string;
    summary: string;
    url: string;
    tags: string[];
    date_published: string | null;
}

interface ContentBlock {
    type: 'p' | 'quote' | 'header' | 'grid';
    text?: string;
    muted?: boolean;
    icon?: string;
    title?: string;
    items?: Array<{ icon: string; title: string; text: string }>;
}

interface Chronicle {
    id: number;
    title: string;
    subtitle: string;
    date: string;
    dateSort: number;
    classification: string;
    icon: string;
    color: string;
    blocks: ContentBlock[];
}

// ─── Helper Components ────────────────────────────────────────────────────────
const FragmentBlock: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
        {children}
    </div>
);

const Quote: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div style={{
        margin: '1.5rem 0',
        padding: '1.2rem 1.8rem',
        background: 'rgba(196,30,58,0.06)',
        border: '1px solid rgba(212,175,55,0.25)',
        borderLeft: '3px solid var(--secondary)',
        borderRadius: '2px',
        fontFamily: 'var(--cinzel-font)',
        fontSize: '0.95rem',
        fontStyle: 'italic',
        color: 'var(--secondary)',
        letterSpacing: '1.5px',
        lineHeight: 1.9,
        textAlign: 'center',
    }}>
        <div dangerouslySetInnerHTML={{ __html: children as string }} />
    </div>
);

const FragmentHeader: React.FC<{ icon: string; title: string }> = ({ icon, title }) => (
    <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.7rem',
        margin: '2rem 0 1rem',
        paddingBottom: '0.5rem',
        borderBottom: '1px solid rgba(212,175,55,0.15)',
    }}>
        <span style={{ fontSize: '1.1rem' }}>{icon}</span>
        <h3 style={{
            margin: 0,
            fontFamily: 'var(--cinzel-font)',
            fontSize: '0.8rem',
            letterSpacing: '3px',
            color: 'var(--secondary)',
        }}>{title}</h3>
    </div>
);

const P: React.FC<{ children: React.ReactNode; muted?: boolean }> = ({ children, muted }) => (
    <p style={{
        color: muted ? 'var(--text-muted)' : 'var(--text-main)',
        fontSize: '1rem',
        lineHeight: 1.95,
        margin: '0.8rem 0',
    }}>
        <span dangerouslySetInnerHTML={{ __html: children as string }} />
    </p>
);

const IconWrapper: React.FC<{ icon: string; size?: number }> = ({ icon, size = 24 }) => {
    if (icon === 'dragon') return <DragonIcon size={size} />;
    return <span style={{ fontSize: `${size}px` }}>{icon}</span>;
};

// ─── Block Renderer ───────────────────────────────────────────────────────────
const RenderBlock: React.FC<{ block: ContentBlock }> = ({ block }) => {
    switch (block.type) {
        case 'p':
            return <P muted={block.muted}>{block.text}</P>;
        case 'quote':
            return <Quote>{block.text}</Quote>;
        case 'header':
            return <FragmentHeader icon={block.icon || ''} title={block.title || ''} />;
        case 'grid':
            return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', margin: '1.5rem 0' }}>
                    {block.items?.map((d, i) => (
                        <div key={i} className="glass-card" style={{ textAlign: 'center', borderTop: '2px solid rgba(212,175,55,0.3)', padding: '1.2rem' }}>
                            <div style={{ fontSize: '2rem', marginBottom: '0.7rem' }}>{d.icon}</div>
                            <h3 style={{ color: 'var(--secondary)', fontSize: '0.75rem', letterSpacing: '3px', marginBottom: '0.7rem' }}>{d.title}</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.7, margin: 0 }}>{d.text}</p>
                        </div>
                    ))}
                </div>
            );
        default:
            return null;
    }
};

// ─── Accordion Item ───────────────────────────────────────────────────────────
const ChronicleCard: React.FC<{ chronicle: Chronicle; index: number }> = ({ chronicle, index }) => {
    const [open, setOpen] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    const downloadPDF = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const element = document.getElementById(`chronicle-export-${chronicle.id}`);
        if (!element) return;

        setIsGeneratingPdf(true);
        try {
            const opt = {
                margin: [10, 0, 10, 0],
                filename: `Ancalagon_Cronica_${chronicle.id}.pdf`,
                image: { type: 'jpeg', quality: 1 },
                html2canvas: { 
                    backgroundColor: '#0a0505',
                    scale: 2,
                    useCORS: true,
                    logging: false,
                },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                pagebreak: { mode: ['css', 'legacy'] }
            };
            // @ts-ignore
            await html2pdf().set(opt).from(element).save();
        } catch (error) {
            console.error('Error generando PDF:', error);
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.07, duration: 0.5, ease: 'easeOut' }}
            style={{
                borderRadius: '4px',
                overflow: 'hidden',
                border: `1px solid rgba(255,255,255,0.06)`,
                borderLeft: `4px solid ${chronicle.color}`,
                background: open ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.015)',
                transition: 'background 0.3s ease',
            }}
        >
            <button
                onClick={() => setOpen(v => !v)}
                style={{
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '1.4rem 1.6rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    textAlign: 'left',
                }}
            >
                <div style={{ minWidth: '2rem', textAlign: 'center', filter: open ? 'drop-shadow(0 0 8px rgba(212,175,55,0.5))' : 'none', transition: 'filter 0.3s' }}>
                    <IconWrapper icon={chronicle.icon} size={22} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
                        <span style={{
                            fontFamily: 'var(--cinzel-font)',
                            fontSize: '0.65rem',
                            letterSpacing: '3px',
                            color: chronicle.color,
                            fontWeight: 700,
                        }}>{chronicle.title}</span>
                        <span style={{
                            background: 'rgba(212,175,55,0.08)',
                            border: '1px solid rgba(212,175,55,0.2)',
                            color: 'var(--secondary)',
                            fontSize: '0.6rem',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '2px',
                            fontFamily: 'var(--cinzel-font)',
                            letterSpacing: '1px',
                        }}>{chronicle.classification}</span>
                    </div>
                    <div style={{
                        fontFamily: 'var(--cinzel-font)',
                        fontSize: '1rem',
                        fontWeight: 700,
                        color: 'var(--text-main)',
                        letterSpacing: '2px',
                        marginBottom: '0.4rem',
                    }}>{chronicle.subtitle}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        <Calendar size={12} />
                        <span style={{ fontFamily: 'var(--cinzel-font)', letterSpacing: '1px' }}>{chronicle.date}</span>
                    </div>
                </div>

                <motion.div
                    animate={{ rotate: open ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                    style={{ color: 'var(--secondary)', flexShrink: 0 }}
                >
                    <ChevronDown size={20} />
                </motion.div>
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        key="content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.4, ease: 'easeInOut' }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div id={`chronicle-export-${chronicle.id}`} style={{
                            padding: '2rem 2.5rem',
                            borderTop: '1px solid rgba(255,255,255,0.05)',
                            background: '#0a0505',
                        }}>
                            <div style={{ textAlign: 'center', marginBottom: '2.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(212,175,55,0.1)' }}>
                                <div style={{ filter: 'drop-shadow(0 0 10px rgba(212,175,55,0.3))' }}>
                                    <IconWrapper icon={chronicle.icon} size={40} />
                                </div>
                                <h3 style={{ fontFamily: 'var(--cinzel-font)', fontSize: '1.2rem', color: chronicle.color, letterSpacing: '5px', marginTop: '1rem', marginBottom: '0.5rem' }}>{chronicle.title}</h3>
                                <p style={{ fontFamily: 'var(--cinzel-font)', fontSize: '1.4rem', color: 'var(--text-main)', letterSpacing: '3px', margin: 0, fontWeight: 700 }}>{chronicle.subtitle}</p>
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.6rem', color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '1rem' }}>
                                    <Calendar size={14} style={{ color: 'var(--secondary)' }}/>
                                    <span style={{ fontFamily: 'var(--cinzel-font)', letterSpacing: '2px' }}>{chronicle.date} | RESTRICCIÓN: NULA</span>
                                </div>
                            </div>

                            <div style={{ padding: '0 0.5rem' }}>
                                {chronicle.blocks.map((block, idx) => (
                                    <FragmentBlock key={idx}>
                                        <RenderBlock block={block} />
                                    </FragmentBlock>
                                ))}
                            </div>
                        </div>

                        <div style={{ padding: '1.5rem', textAlign: 'center', background: 'rgba(255,255,255,0.015)' }}>
                            <button
                                onClick={downloadPDF}
                                disabled={isGeneratingPdf}
                                className="filter-btn"
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.7rem',
                                    padding: '0.7rem 1.8rem',
                                    borderColor: 'rgba(212,175,55,0.3)',
                                    background: isGeneratingPdf ? 'rgba(212,175,55,0.05)' : 'rgba(10,5,5,0.6)',
                                    color: 'var(--secondary)',
                                    cursor: isGeneratingPdf ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.3s'
                                }}
                            >
                                {isGeneratingPdf ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                                <span style={{ fontFamily: 'var(--cinzel-font)', letterSpacing: '3px', fontSize: '0.75rem', fontWeight: 600 }}>
                                    {isGeneratingPdf ? 'EXTRAYENDO DATOS...' : 'DESCARGAR ARCHIVO PDF'}
                                </span>
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

// ─── News Logic ───────────────────────────────────────────────────────────
const NEWS_API_URL = '/api/news';

function formatDate(iso: string | null): string {
    if (!iso) return '';
    try {
        return new Date(iso).toLocaleDateString('es-CO', {
            year: 'numeric', month: 'long', day: 'numeric',
        });
    } catch {
        return iso;
    }
}

const tagColor: Record<string, string> = {
    Post: 'rgba(212,175,55,0.15)',
    Video: 'rgba(196,30,58,0.15)',
    default: 'rgba(148,163,184,0.1)',
};

// ─── Main page ────────────────────────────────────────────────────────────────
const Lore: React.FC = () => {
    const [chronicles, setChronicles] = useState<Chronicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [sortDesc, setSortDesc] = useState(false);
    const [activeTab, setActiveTab] = useState<'cronicas' | 'transmisiones'>('cronicas');
    
    const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
    const [newsLoading, setNewsLoading] = useState(false);
    const [newsError, setNewsError] = useState<string | null>(null);

    const fetchNews = async () => {
        setNewsLoading(true);
        setNewsError(null);
        try {
            const res = await fetch(NEWS_API_URL);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data: NewsItem[] | { error: string } = await res.json();
            if ('error' in data) throw new Error(data.error);
            setNewsItems(data as NewsItem[]);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Error desconocido';
            setNewsError(`No fue posible contactar el nexo de transmisiones. ${msg}`);
        } finally {
            setNewsLoading(false);
        }
    };

    useEffect(() => {
        document.title = 'Star Grimoire | Crónicas de Ancalagon Oblivion Fleet';
        getChronicles().then(data => {
            setChronicles(data);
            setLoading(false);
        });
        if (activeTab === 'transmisiones') {
            fetchNews();
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'transmisiones' && newsItems.length === 0 && !newsLoading) {
            fetchNews();
        }
    }, [activeTab]);

    const sorted = useMemo(() =>
        [...chronicles].sort((a, b) =>
            sortDesc ? b.dateSort - a.dateSort : a.dateSort - b.dateSort
        ),
        [chronicles, sortDesc]
    );

    if (loading) {
        return (
            <div style={{ height: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 size={40} className="animate-spin" style={{ color: 'var(--secondary)' }} />
            </div>
        );
    }

    return (
        <div style={{ padding: '0 2rem 4rem', maxWidth: '900px', margin: '0 auto' }}>

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                style={{
                    textAlign: 'center',
                    padding: '4rem 2rem',
                    marginBottom: '3rem',
                    background: 'linear-gradient(180deg, rgba(196,30,58,0.08) 0%, transparent 100%)',
                    border: '1px solid rgba(212,175,55,0.15)',
                    borderRadius: '4px',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                <div style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(196,30,58,0.15) 0%, transparent 70%)',
                    pointerEvents: 'none'
                }} />
                <div style={{ marginBottom: '1rem', filter: 'drop-shadow(0 0 20px rgba(196,30,58,0.6))' }}>
                    <DragonIcon size={80} />
                </div>
                <h1 style={{
                    fontFamily: 'var(--cinzel-font)',
                    fontSize: 'clamp(1.8rem, 5vw, 3rem)',
                    fontWeight: 900,
                    letterSpacing: '8px',
                    color: 'var(--secondary)',
                    textShadow: '0 0 30px rgba(212,175,55,0.4), 2px 2px 10px rgba(0,0,0,0.9)',
                    marginBottom: '1.5rem',
                    lineHeight: 1.2,
                }}>
                    ANCALAGON<br />
                    <span style={{ fontSize: '60%', letterSpacing: '12px', color: 'var(--text-main)', opacity: 0.8 }}>OBLIVION FLEET</span>
                </h1>
                <p style={{
                    fontFamily: 'var(--cinzel-font)',
                    fontSize: '1rem',
                    fontStyle: 'italic',
                    color: 'var(--text-muted)',
                    letterSpacing: '2px',
                    borderTop: '1px solid rgba(212,175,55,0.2)',
                    borderBottom: '1px solid rgba(212,175,55,0.2)',
                    padding: '1rem 2rem',
                    display: 'inline-block',
                    marginTop: '0.5rem',
                }}>
                    "Donde termina el orden… comenzamos nosotros."
                </p>
            </motion.div>

            {/* ── TABS ── */}
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                gap: '0.5rem', 
                marginBottom: '2rem',
                position: 'sticky',
                top: '5rem',
                zIndex: 50,
                padding: '0.5rem',
                background: 'rgba(10,5,5,0.9)',
                backdropFilter: 'blur(10px)',
                borderBottom: '1px solid rgba(255,255,255,0.05)'
            }}>
                <button
                    onClick={() => setActiveTab('cronicas')}
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '0.8rem 2rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.8rem',
                        transition: 'all 0.3s ease',
                        borderBottom: activeTab === 'cronicas' ? '2px solid var(--secondary)' : '2px solid transparent',
                    }}
                >
                    <Scroll size={18} style={{ color: activeTab === 'cronicas' ? 'var(--secondary)' : 'var(--text-muted)' }} />
                    <span style={{ 
                        fontFamily: 'var(--cinzel-font)', 
                        fontSize: '0.75rem', 
                        letterSpacing: '3px', 
                        color: activeTab === 'cronicas' ? 'var(--text-main)' : 'var(--text-muted)',
                        fontWeight: activeTab === 'cronicas' ? 'bold' : 'normal'
                    }}>
                        CRÓNICAS
                    </span>
                </button>
                <button
                    onClick={() => setActiveTab('transmisiones')}
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '0.8rem 2rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.8rem',
                        transition: 'all 0.3s ease',
                        borderBottom: activeTab === 'transmisiones' ? '2px solid var(--primary)' : '2px solid transparent',
                    }}
                >
                    <Radio size={18} style={{ color: activeTab === 'transmisiones' ? 'var(--primary)' : 'var(--text-muted)' }} />
                    <span style={{ 
                        fontFamily: 'var(--cinzel-font)', 
                        fontSize: '0.75rem', 
                        letterSpacing: '3px', 
                        color: activeTab === 'transmisiones' ? 'var(--text-main)' : 'var(--text-muted)',
                        fontWeight: activeTab === 'transmisiones' ? 'bold' : 'normal'
                    }}>
                        TRANSMISIONES
                    </span>
                </button>
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'cronicas' ? (
                    <motion.div
                        key="cronicas"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '1.5rem',
                            flexWrap: 'wrap',
                            gap: '1rem',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <Scroll size={14} style={{ color: 'var(--secondary)' }} />
                                <span style={{ fontFamily: 'var(--cinzel-font)', fontSize: '0.7rem', letterSpacing: '3px', color: 'var(--secondary)' }}>
                                    {chronicles.length} CRÓNICAS EN EL GRIMOIRE
                                </span>
                            </div>
                            <button
                                onClick={() => setSortDesc(v => !v)}
                                className="filter-btn active"
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.7rem' }}
                            >
                                <ArrowUpDown size={13} />
                                {sortDesc ? 'MÁS RECIENTES PRIMERO' : 'MÁS ANTIGUAS PRIMERO'}
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            {sorted.map((chronicle, idx) => (
                                <ChronicleCard key={chronicle.id} chronicle={chronicle} index={idx} />
                            ))}
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="transmisiones"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        {/* Stats bar */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '0.8rem',
                                padding: '0.7rem 1.2rem',
                                margin: '0 0 1.5rem',
                                background: 'rgba(212,175,55,0.04)',
                                border: '1px solid rgba(212,175,55,0.1)',
                                borderRadius: '2px',
                            }}
                        >
                            <span style={{ color: 'var(--secondary)' }}>☩</span>
                            <span style={{ fontFamily: 'var(--cinzel-font)', fontSize: '0.62rem', letterSpacing: '2px', color: 'var(--text-muted)' }}>
                                {newsItems.length} TRANSMISIONES · FUENTE: RSI COMM-LINK · AÑO {new Date().getFullYear() + 930}
                            </span>
                            <button
                                id="btn-resync-news"
                                onClick={fetchNews}
                                disabled={newsLoading}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    background: 'rgba(196,30,58,0.08)',
                                    border: '1px solid rgba(196,30,58,0.35)',
                                    color: 'var(--primary)',
                                    fontFamily: 'var(--cinzel-font)',
                                    fontSize: '0.62rem',
                                    letterSpacing: '3px',
                                    padding: '0.55rem 1rem',
                                    cursor: newsLoading ? 'not-allowed' : 'pointer',
                                    opacity: newsLoading ? 0.5 : 1,
                                    borderRadius: '2px',
                                }}
                            >
                                <motion.span
                                    animate={newsLoading ? { rotate: 360 } : { rotate: 0 }}
                                    transition={newsLoading ? { duration: 1, repeat: Infinity, ease: 'linear' } : {}}
                                    style={{ display: 'inline-flex' }}
                                >
                                    <RefreshCw size={13} />
                                </motion.span>
                                {newsLoading ? 'SINCRONIZANDO SEÑAL…' : 'RESINCRONIZAR'}
                            </button>
                        </motion.div>

                        {newsLoading && (
                            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                                <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity }}>
                                    <Radio size={36} style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
                                    <p style={{ fontFamily: 'var(--cinzel-font)', fontSize: '0.72rem', letterSpacing: '4px', color: 'var(--text-muted)' }}>
                                        INTERCEPTANDO FRECUENCIAS RSI…
                                    </p>
                                </motion.div>
                            </div>
                        )}

                        {newsError && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="glass-card"
                                style={{ borderLeft: '3px solid var(--primary)', padding: '2rem', textAlign: 'center' }}
                            >
                                <p style={{ fontFamily: 'var(--cinzel-font)', fontSize: '0.72rem', letterSpacing: '3px', color: 'var(--primary)', marginBottom: '0.5rem' }}>
                                    SEÑAL CORROMPIDA
                                </p>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.87rem', margin: 0 }}>{newsError}</p>
                            </motion.div>
                        )}

                        {!newsLoading && !newsError && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                                {newsItems.map((item, i) => (
                                    <motion.div
                                        key={item.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.04 * i, duration: 0.45, ease: 'easeOut' }}
                                        className="glass-card"
                                        style={{
                                            borderLeft: '3px solid var(--primary)',
                                            padding: '1.2rem 1.5rem',
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                                            <span style={{
                                                fontFamily: 'var(--cinzel-font)',
                                                fontSize: '0.65rem',
                                                color: 'rgba(196,30,58,0.5)',
                                                letterSpacing: '1px',
                                                minWidth: '28px',
                                            }}>
                                                {String(i + 1).padStart(2, '0')}
                                            </span>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.45rem', flexWrap: 'wrap' }}>
                                                    {item.tags.map(tag => (
                                                        <span key={tag} style={{
                                                            fontFamily: 'var(--cinzel-font)',
                                                            fontSize: '0.55rem',
                                                            letterSpacing: '2px',
                                                            color: tag === 'Post' ? 'var(--secondary)' : tag === 'Video' ? 'var(--primary)' : 'var(--text-muted)',
                                                            background: tagColor[tag] ?? tagColor.default,
                                                            border: `1px solid ${tag === 'Post' ? 'rgba(212,175,55,0.25)' : tag === 'Video' ? 'rgba(196,30,58,0.25)' : 'rgba(148,163,184,0.15)'}`,
                                                            padding: '2px 7px',
                                                            borderRadius: '2px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '3px',
                                                        }}>
                                                            <Tag size={8} />
                                                            {tag.toUpperCase()}
                                                        </span>
                                                    ))}
                                                    {item.date_published && (
                                                        <span style={{
                                                            fontSize: '0.62rem',
                                                            color: 'var(--text-muted)',
                                                            letterSpacing: '1px',
                                                            fontFamily: 'var(--cinzel-font)',
                                                            opacity: 0.65,
                                                        }}>
                                                            {formatDate(item.date_published)}
                                                        </span>
                                                    )}
                                                </div>
                                                <h3 style={{
                                                    margin: '0 0 0.8rem',
                                                    fontFamily: 'var(--cinzel-font)',
                                                    fontSize: 'clamp(0.82rem, 2vw, 0.98rem)',
                                                    color: 'var(--text-main)',
                                                    letterSpacing: '2px',
                                                    lineHeight: 1.4,
                                                }}>
                                                    {item.title}
                                                </h3>
                                                <p style={{
                                                    margin: '0 0 1rem',
                                                    color: 'var(--text-muted)',
                                                    fontSize: '0.9rem',
                                                    lineHeight: 1.85,
                                                }}>
                                                    {item.summary || 'Sin resumen disponible para esta transmisión.'}
                                                </p>
                                                <a
                                                    href={item.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '0.4rem',
                                                        fontFamily: 'var(--cinzel-font)',
                                                        fontSize: '0.6rem',
                                                        letterSpacing: '2px',
                                                        color: 'var(--primary)',
                                                        textDecoration: 'none',
                                                        border: '1px solid rgba(196,30,58,0.35)',
                                                        padding: '0.4rem 1rem',
                                                        borderRadius: '2px',
                                                        transition: 'background 0.2s',
                                                    }}
                                                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(196,30,58,0.1)')}
                                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                                >
                                                    <ExternalLink size={11} />
                                                    LEER TRANSMISIÓN COMPLETA EN RSI
                                                </a>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                style={{ textAlign: 'center', marginTop: '3rem', opacity: 0.4 }}
            >
                <div style={{ height: '1px', background: 'linear-gradient(to right, transparent, var(--secondary), transparent)', marginBottom: '1.5rem' }} />
                <span style={{ fontFamily: 'var(--cinzel-font)', fontSize: '0.75rem', letterSpacing: '5px', color: 'var(--secondary)' }}>
                    ☩ IN NOMINI OBLIVIONIS <DragonIcon size={20} /> IN NOMINI OBLIVIONIS ☩
                </span>
            </motion.div>

        </div>
    );
};

export default Lore;

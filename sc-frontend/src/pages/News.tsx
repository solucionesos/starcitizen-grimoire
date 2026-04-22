import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, RefreshCw, AlertTriangle, ExternalLink, Tag } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface NewsItem {
    id: string;
    title: string;
    summary: string;
    url: string;
    tags: string[];
    date_published: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Sub-components ───────────────────────────────────────────────────────────

const SectionDivider: React.FC = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '1rem 0' }}>
        <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, transparent, rgba(212,175,55,0.25))' }} />
        <span style={{ color: 'var(--secondary)', fontSize: '0.6rem', letterSpacing: '4px', fontFamily: 'var(--cinzel-font)', opacity: 0.5 }}>✦</span>
        <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to left, transparent, rgba(212,175,55,0.25))' }} />
    </div>
);

const NewsCard: React.FC<{ item: NewsItem; index: number }> = ({ item, index }) => {
    const [open, setOpen] = useState(false);

    const tagColor: Record<string, string> = {
        Post: 'rgba(212,175,55,0.15)',
        Video: 'rgba(196,30,58,0.15)',
        default: 'rgba(148,163,184,0.1)',
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 * index, duration: 0.45, ease: 'easeOut' }}
            className="glass-card"
            style={{
                borderLeft: '3px solid var(--primary)',
                padding: 0,
                overflow: 'hidden',
            }}
        >
            {/* ── Header (clickable toggle) ── */}
            <button
                onClick={() => setOpen(o => !o)}
                style={{
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    padding: '1.2rem 1.5rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '1rem',
                }}
            >
                {/* Index number */}
                <span style={{
                    fontFamily: 'var(--cinzel-font)',
                    fontSize: '0.65rem',
                    color: 'rgba(196,30,58,0.5)',
                    letterSpacing: '1px',
                    minWidth: '28px',
                    marginTop: '2px',
                    flexShrink: 0,
                }}>
                    {String(index + 1).padStart(2, '0')}
                </span>

                <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Tags + Date row */}
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

                    {/* Title */}
                    <h3 style={{
                        margin: 0,
                        fontFamily: 'var(--cinzel-font)',
                        fontSize: 'clamp(0.82rem, 2vw, 0.98rem)',
                        color: 'var(--text-main)',
                        letterSpacing: '2px',
                        lineHeight: 1.4,
                    }}>
                        {item.title}
                    </h3>
                </div>

                {/* Expand indicator */}
                <span style={{
                    color: 'var(--secondary)',
                    fontSize: '0.9rem',
                    flexShrink: 0,
                    marginTop: '2px',
                    transition: 'transform 0.3s',
                    transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                    display: 'inline-block',
                }}>
                    ▾
                </span>
            </button>

            {/* ── Expanded body ── */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        key="body"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div style={{
                            padding: '0 1.5rem 1.5rem 4rem',
                            borderTop: '1px solid rgba(212,175,55,0.1)',
                            paddingTop: '1rem',
                        }}>
                            <p style={{
                                margin: '0 0 1.2rem',
                                color: 'var(--text-muted)',
                                fontSize: '0.9rem',
                                lineHeight: 1.85,
                            }}>
                                {item.summary || 'Sin resumen disponible para esta transmisión.'}
                            </p>

                            {/* Link to RSI */}
                            <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
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
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const News: React.FC = () => {
    const [items, setItems]         = useState<NewsItem[]>([]);
    const [loading, setLoading]     = useState(true);
    const [error, setError]         = useState<string | null>(null);
    const [lastFetch, setLastFetch] = useState<Date | null>(null);

    const fetchNews = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(NEWS_API_URL);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data: NewsItem[] | { error: string } = await res.json();
            if ('error' in data) throw new Error(data.error);
            setItems(data as NewsItem[]);
            setLastFetch(new Date());
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Error desconocido';
            setError(`No fue posible contactar el nexo de transmisiones. ${msg}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        document.title = 'Transmisiones del Vacío | Star Grimoire';
        fetchNews();
    }, []);

    return (
        <div style={{ padding: '0 2rem 5rem', maxWidth: '860px', margin: '0 auto' }}>

            {/* ── HERO ── */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                style={{ textAlign: 'center', padding: '4rem 2rem 2.5rem', position: 'relative' }}
            >
                <div style={{
                    position: 'absolute', inset: 0, pointerEvents: 'none',
                    backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(196,30,58,0.16) 0%, transparent 65%)',
                }} />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '1.5rem', opacity: 0.45 }}>
                    <div style={{ width: '60px', height: '1px', background: 'linear-gradient(to right, transparent, var(--secondary))' }} />
                    <span style={{ fontFamily: 'var(--cinzel-font)', fontSize: '0.65rem', letterSpacing: '5px', color: 'var(--secondary)' }}>IN NOMINI OBLIVIONIS</span>
                    <div style={{ width: '60px', height: '1px', background: 'linear-gradient(to left, transparent, var(--secondary))' }} />
                </div>

                <motion.div
                    animate={{ scale: [1, 1.06, 1] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', color: 'var(--primary)', filter: 'drop-shadow(0 0 16px rgba(196,30,58,0.65))' }}
                >
                    <Radio size={46} strokeWidth={1.2} />
                </motion.div>

                <h1 style={{
                    fontFamily: 'var(--cinzel-font)',
                    fontWeight: 900,
                    fontSize: 'clamp(1.6rem, 4vw, 2.6rem)',
                    letterSpacing: '10px',
                    color: 'var(--secondary)',
                    textShadow: '0 0 40px rgba(212,175,55,0.3)',
                    margin: '0 0 0.4rem',
                }}>
                    TRANSMISIONES
                </h1>
                <p style={{
                    fontFamily: 'var(--cinzel-font)',
                    fontSize: '0.65rem',
                    letterSpacing: '4px',
                    color: 'var(--text-muted)',
                    margin: '0 0 1.8rem',
                }}>
                    INTERCEPTACIONES DEL NEXO RSI · ÚLTIMAS {items.length || 20} SEÑALES
                </p>

                <motion.button
                    id="btn-resync-news"
                    onClick={fetchNews}
                    disabled={loading}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
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
                        padding: '0.55rem 1.4rem',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.5 : 1,
                        borderRadius: '2px',
                    }}
                >
                    <motion.span
                        animate={loading ? { rotate: 360 } : { rotate: 0 }}
                        transition={loading ? { duration: 1, repeat: Infinity, ease: 'linear' } : {}}
                        style={{ display: 'inline-flex' }}
                    >
                        <RefreshCw size={13} />
                    </motion.span>
                    {loading ? 'SINCRONIZANDO SEÑAL…' : 'RESINCRONIZAR'}
                </motion.button>

                {lastFetch && !loading && (
                    <p style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: '0.6rem', letterSpacing: '1px', opacity: 0.6 }}>
                        Última sincronización: {lastFetch.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                )}
            </motion.div>

            <SectionDivider />

            {/* ── LOADING ── */}
            {loading && (
                <div style={{ textAlign: 'center', padding: '5rem 1rem' }}>
                    <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity }}>
                        <Radio size={36} style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
                        <p style={{ fontFamily: 'var(--cinzel-font)', fontSize: '0.72rem', letterSpacing: '4px', color: 'var(--text-muted)' }}>
                            INTERCEPTANDO FRECUENCIAS RSI…
                        </p>
                    </motion.div>
                </div>
            )}

            {/* ── ERROR ── */}
            {!loading && error && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card"
                    style={{ borderLeft: '3px solid var(--primary)', padding: '2rem', textAlign: 'center' }}
                >
                    <AlertTriangle size={30} style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
                    <p style={{ fontFamily: 'var(--cinzel-font)', fontSize: '0.72rem', letterSpacing: '3px', color: 'var(--primary)', marginBottom: '0.5rem' }}>
                        SEÑAL CORROMPIDA
                    </p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.87rem', margin: 0 }}>{error}</p>
                </motion.div>
            )}

            {/* ── NEWS LIST ── */}
            {!loading && !error && (
                <>
                    {/* Stats bar */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.8rem',
                            padding: '0.7rem 1.2rem',
                            margin: '1rem 0 1.5rem',
                            background: 'rgba(212,175,55,0.04)',
                            border: '1px solid rgba(212,175,55,0.1)',
                            borderRadius: '2px',
                        }}
                    >
                        <span style={{ color: 'var(--secondary)' }}>☩</span>
                        <span style={{ fontFamily: 'var(--cinzel-font)', fontSize: '0.62rem', letterSpacing: '2px', color: 'var(--text-muted)' }}>
                            {items.length} TRANSMISIONES · FUENTE: RSI COMM-LINK · AÑO {new Date().getFullYear() + 930}
                        </span>
                    </motion.div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                        {items.map((item, i) => (
                            <NewsCard key={item.id} item={item} index={i} />
                        ))}
                    </div>

                    {/* Footer seal */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        style={{ textAlign: 'center', marginTop: '4rem', paddingTop: '2rem', borderTop: '1px solid rgba(212,175,55,0.08)' }}
                    >
                        <p style={{ fontFamily: 'var(--cinzel-font)', fontSize: '0.58rem', letterSpacing: '5px', color: 'var(--text-muted)', opacity: 0.35, margin: 0 }}>
                            ☩ FIN DE LAS TRANSMISIONES · ANCALAGON OBLIVION FLEET · IN NOMINI OBLIVIONIS ☩
                        </p>
                    </motion.div>
                </>
            )}
        </div>
    );
};

export default News;

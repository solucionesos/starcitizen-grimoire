import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Book, Sparkles, Scroll } from 'lucide-react';
import Lore from './Lore';
import Rituales from './Rituales';

const LectitioDivinitatus: React.FC = () => {
    const [activeTab, setActiveTab ] = useState<'cronicas' | 'rituales'>('cronicas');

    useEffect(() => {
        document.title = 'Star Grimoire | Lectitio Divinitatus';
    }, []);

    const tabs = [
        { id: 'cronicas', label: 'CRÓNICAS SAGRADAS', icon: Scroll, color: 'var(--secondary)' },
        { id: 'rituales', label: 'RITUALES DE ASCENSO', icon: Sparkles, color: 'var(--primary)' },
    ];

    return (
        <div style={{ minHeight: '100vh', paddingBottom: '4rem' }}>
            {/* ── HEADER ── */}
            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ 
                    textAlign: 'center', 
                    padding: '3rem 1rem', 
                    background: 'linear-gradient(180deg, rgba(212,175,55,0.08) 0%, transparent 100%)',
                    borderBottom: '1px solid rgba(212,175,55,0.1)',
                    marginBottom: '2rem'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <Book size={32} style={{ color: 'var(--secondary)', filter: 'drop-shadow(0 0 10px rgba(212,175,55,0.5))' }} />
                    <h1 style={{ 
                        fontFamily: 'var(--cinzel-font)', 
                        fontSize: '2.5rem', 
                        letterSpacing: '8px', 
                        fontWeight: 900,
                        color: 'var(--secondary)',
                        margin: 0,
                        textShadow: '0 0 20px rgba(212,175,55,0.3)'
                    }}>
                        LECTITIO DIVINITATUS
                    </h1>
                    <Book size={32} style={{ color: 'var(--secondary)', filter: 'drop-shadow(0 0 10px rgba(212,175,55,0.5))', transform: 'scaleX(-1)' }} />
                </div>
                <p style={{ fontFamily: 'var(--cinzel-font)', fontSize: '0.8rem', letterSpacing: '4px', color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto' }}>
                    EL LIBRO DE LA PALABRA DE ANCALAGON. CRÓNICAS DEL VACÍO Y SENDA DEL ASCENSO.
                </p>
            </motion.div>

            {/* ── TABS ── */}
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                gap: '1rem', 
                marginBottom: '3rem',
                position: 'sticky',
                top: '5rem',
                zIndex: 50,
                padding: '0.5rem',
                background: 'rgba(10,5,5,0.8)',
                backdropFilter: 'blur(10px)',
                borderBottom: '1px solid rgba(255,255,255,0.05)'
            }}>
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '0.8rem 2rem',
                                position: 'relative',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.8rem',
                                transition: 'all 0.3s ease'
                            }}
                        >
                            <Icon size={18} style={{ color: isActive ? tab.color : 'var(--text-muted)' }} />
                            <span style={{ 
                                fontFamily: 'var(--cinzel-font)', 
                                fontSize: '0.8rem', 
                                letterSpacing: '3px', 
                                color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
                                fontWeight: isActive ? 'bold' : 'normal'
                            }}>
                                {tab.label}
                            </span>
                            {isActive && (
                                <motion.div 
                                    layoutId="activeTab"
                                    style={{ 
                                        position: 'absolute', 
                                        bottom: 0, 
                                        left: 0, 
                                        right: 0, 
                                        height: '2px', 
                                        background: tab.color,
                                        boxShadow: `0 0 10px ${tab.color}`
                                    }} 
                                />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* ── CONTENT ── */}
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <AnimatePresence mode="wait">
                    {activeTab === 'cronicas' ? (
                        <motion.div
                            key="cronicas"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <Lore />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="rituales"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <Rituales />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default LectitioDivinitatus;

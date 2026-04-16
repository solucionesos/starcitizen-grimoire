import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Database, Lock, ShoppingCart } from 'lucide-react';
import Wikelo from './Wikelo';
import Bovedas from './Bovedas';

const Datavelo: React.FC = () => {
    const [activeTab, setActiveTab ] = useState<'bovedas' | 'wikelo'>('bovedas');

    useEffect(() => {
        document.title = 'Star Grimoire | DATAVELO';
    }, []);

    const tabs = [
        { id: 'bovedas', label: 'BÓVEDAS DEL VACÍO', icon: Lock, color: 'var(--accent-silver)' },
        { id: 'wikelo', label: 'EL ESTAFADOR (BANU)', icon: ShoppingCart, color: '#ff4444' },
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
                    background: 'linear-gradient(180deg, rgba(79,195,247,0.08) 0%, transparent 100%)',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    marginBottom: '2rem'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <Database size={32} style={{ color: 'var(--accent-silver)', filter: 'drop-shadow(0 0 10px rgba(148,163,184,0.5))' }} />
                    <h1 style={{ 
                        fontFamily: 'var(--cinzel-font)', 
                        fontSize: '2.5rem', 
                        letterSpacing: '8px', 
                        fontWeight: 900,
                        color: 'var(--text-main)',
                        margin: 0,
                    }}>
                        DATAVELO
                    </h1>
                    <Shield size={32} style={{ color: 'var(--accent-silver)', filter: 'drop-shadow(0 0 10px rgba(148,163,184,0.5))' }} />
                </div>
                <p style={{ fontFamily: 'var(--cinzel-font)', fontSize: '0.8rem', letterSpacing: '4px', color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto' }}>
                    NEXO DE SINCRONIZACIÓN Y MERCADO CLANDESTINO. ACCESO RESTRINGIDO A LA FLOTA.
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
                                    layoutId="activeTabData"
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
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                <AnimatePresence mode="wait">
                    {activeTab === 'bovedas' ? (
                        <motion.div
                            key="bovedas"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <Bovedas />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="wikelo"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <Wikelo />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default Datavelo;

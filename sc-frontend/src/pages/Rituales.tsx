import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import DragonIcon from '../components/DragonIcon';

const GlyphDivider: React.FC<{ text?: string }> = ({ text = '✦' }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '2.5rem 0', opacity: 0.45 }}>
        <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, transparent, var(--secondary))' }} />
        <span style={{ color: 'var(--secondary)', fontFamily: 'var(--cinzel-font)', fontSize: '0.85rem', letterSpacing: '4px', whiteSpace: 'nowrap' }}>{text}</span>
        <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to left, transparent, var(--secondary))' }} />
    </div>
);

const ranks = [
    {
        from: 'Sombras del Umbral',
        to: 'Iniciados del Vacío',
        icon: '🌑',
        number: 'I',
        color: '#8b0000',
        steps: [
            'Completar los contratos asignados por el Consejo en los sistemas Stanton o Nyx.',
            'Participar en al menos un asalto de purificación a una Breaker Station — ya sea por la vía del silencio (PVE) o de la confrontación directa (PVP).',
        ],
    },
    {
        from: 'Iniciados del Vacío',
        to: 'Portadores de Ceniza',
        icon: '⚗️',
        number: 'II',
        color: '#b8860b',
        steps: [
            'Demostrar dominio del arte sagrado de la Trasmutación: fabricación de equipamiento personal o herramientas para uso grupal.',
            'Registrar al menos un Tecnomilagro completado en el Star Grimoire, verificado por un superior.',
        ],
    },
    {
        from: 'Portadores de Ceniza',
        to: 'Voces del Abismo',
        icon: '📡',
        number: 'III',
        color: '#c41e3a',
        steps: [
            'Liderar una operación táctica con uso de comunicación org (VOIP + org chat).',
            'Demostrar coordinación formal entre mínimo tres hermanos de la Fleet en tiempo real.',
        ],
    },
    {
        from: 'Voces del Abismo',
        to: 'Profetas de la Ruina',
        icon: '🌌',
        number: 'IV',
        color: '#9b59b6',
        steps: [
            'Completar una campaña intersistémica estratégica: misiones coordinadas durante un período prolongado.',
            'Demostrar comprensión de la doctrina del Quiebre mediante decisión táctica documentada ante el Consejo.',
        ],
    },
    {
        from: 'Profetas de la Ruina',
        to: 'Heraldos de Ancalagon',
        icon: <DragonIcon size={32} />,
        number: 'V',
        color: '#d4af37',
        steps: [
            'Contribuir sustancialmente al avance de la Fleet: en reputación, influencia territorial o contenido desbloqueado.',
            'El ascenso se otorga únicamente a juicio del Consejo Interno mediante deliberación cerrada.',
            'No se postula. Se es elegido.',
        ],
    },
];

const Rituales: React.FC = () => {
    useEffect(() => {
        document.title = 'Star Grimoire | Rituales de Ancalagon';
    }, []);

    return (
        <div style={{ padding: '2rem', maxWidth: '960px', margin: '0 auto' }}>

            {/* ── HERO ── */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                style={{
                    textAlign: 'center',
                    padding: '4rem 2rem',
                    marginBottom: '2rem',
                    background: 'linear-gradient(180deg, rgba(196,30,58,0.1) 0%, transparent 100%)',
                    border: '1px solid rgba(212,175,55,0.2)',
                    borderRadius: '4px',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(196,30,58,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />

                <div style={{ fontSize: '3.5rem', marginBottom: '1rem', filter: 'drop-shadow(0 0 20px rgba(212,175,55,0.5))' }}>🔖</div>
                <h1 style={{
                    fontFamily: 'var(--cinzel-font)',
                    fontWeight: 900,
                    fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
                    letterSpacing: '8px',
                    color: 'var(--secondary)',
                    textShadow: '0 0 30px rgba(212,175,55,0.4), 2px 2px 10px rgba(0,0,0,0.9)',
                    marginBottom: '1rem',
                }}>
                    RITUALES SAGRADOS
                </h1>
                <p style={{ fontFamily: 'var(--cinzel-font)', fontSize: '0.85rem', letterSpacing: '3px', color: 'var(--text-muted)', marginBottom: '0' }}>
                    Los Ritos que forjan al Hermano desde la sombra hasta el Heraldo
                </p>
            </motion.div>

            {/* ── RITO DE INICIACIÓN ── */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                    <span style={{ color: 'var(--primary)', fontSize: '2rem' }}>🔖</span>
                    <div>
                        <div style={{ fontFamily: 'var(--cinzel-font)', fontSize: '0.7rem', letterSpacing: '4px', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>RITUAL DE INICIACIÓN</div>
                        <h2 style={{ margin: 0, fontFamily: 'var(--cinzel-font)', fontSize: '1.3rem', color: 'var(--secondary)', letterSpacing: '3px' }}>
                            "Despertar en las Ruinas"
                        </h2>
                    </div>
                </div>

                <div className="glass-card" style={{ borderTop: '3px solid var(--primary)', marginBottom: '1.5rem' }}>

                    {/* Objetivo */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <p style={{ fontFamily: 'var(--cinzel-font)', fontSize: '0.7rem', letterSpacing: '3px', color: 'var(--primary)', marginBottom: '0.5rem' }}>☩ PROPÓSITO DEL RITO</p>
                        <p style={{ color: 'var(--text-main)', lineHeight: 1.8, margin: 0 }}>
                            Introducir al neófito a la filosofía de Ancalagon Oblivion Fleet y las mecánicas del universo persistente. El candidato deberá demostrar que comprende la doctrina del Quiebre antes de ser admitido como hermano.
                        </p>
                    </div>

                    <GlyphDivider text="REQUISITOS DEL UMBRAL" />

                    {/* Requisitos */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                        {[
                            { icon: '🚀', title: 'Dominio de Nave', text: 'Ser capaz de pilotar una nave de clase básica (Aurora MR o equivalente). La movilidad es el primer sacramento.' },
                            { icon: '📜', title: 'Afiliación Formal', text: 'Estar inscrito en la organización in-game. La hermandad no admite fratres sin nombre registrado en el Grimoire.' },
                        ].map((req, i) => (
                            <div key={i} style={{
                                background: 'rgba(196,30,58,0.05)',
                                border: '1px solid rgba(212,175,55,0.2)',
                                borderLeft: '3px solid var(--primary)',
                                padding: '1.2rem',
                                borderRadius: '2px',
                            }}>
                                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{req.icon}</div>
                                <p style={{ fontFamily: 'var(--cinzel-font)', fontSize: '0.75rem', color: 'var(--secondary)', letterSpacing: '2px', marginBottom: '0.5rem' }}>{req.title}</p>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.7, margin: 0 }}>{req.text}</p>
                            </div>
                        ))}
                    </div>

                    <GlyphDivider text="LA SECUENCIA DEL RITO" />

                    {/* Los 3 pasos del ritual */}
                    {[
                        {
                            step: '01',
                            title: 'El Juramento del Vacío',
                            icon: '🕯️',
                            text: 'Frente al terminal de una Breaker Station en el sistema Nyx, el candidato declara públicamente su intención de abandonar el orden impuesto y aceptar la verdad de Ancalagon. El silencio de la hermandad escucha.',
                        },
                        {
                            step: '02',
                            title: 'La Prueba del Infiltrado',
                            icon: '⚔️',
                            text: 'El candidato completa una serie de objetivos tácticos que demuestran comprensión básica del mundo: exploración segura y sigilosa, combate táctico, uso del inventario y recuperación de ítems valiosos del Vacío.',
                        },
                        {
                            step: '03',
                            title: 'El Sello del Caminante',
                            icon: '🏛️',
                            text: 'Obtener reputación mínima aceptable con una facción neutral o en actividad estructurada en Nyx o Stanton: minería, edictos o interacción social en zonas no controladas. La Fleet observa.',
                        },
                    ].map((paso, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.12 }}
                            style={{
                                display: 'grid',
                                gridTemplateColumns: '60px 1fr',
                                gap: '1.2rem',
                                marginBottom: '1.2rem',
                                alignItems: 'start',
                            }}
                        >
                            <div style={{
                                background: 'rgba(196,30,58,0.1)',
                                border: '1px solid rgba(196,30,58,0.4)',
                                borderRadius: '2px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '0.8rem 0.3rem',
                            }}>
                                <span style={{ fontSize: '1.3rem' }}>{paso.icon}</span>
                                <span style={{ fontFamily: 'var(--cinzel-font)', fontSize: '0.65rem', color: 'var(--primary)', letterSpacing: '1px', marginTop: '0.3rem' }}>{paso.step}</span>
                            </div>
                            <div>
                                <p style={{ fontFamily: 'var(--cinzel-font)', fontSize: '0.8rem', color: 'var(--secondary)', letterSpacing: '2px', marginBottom: '0.4rem' }}>{paso.title}</p>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.75, margin: 0 }}>{paso.text}</p>
                            </div>
                        </motion.div>
                    ))}

                    {/* Resultado */}
                    <GlyphDivider text="☩" />
                    <div style={{
                        textAlign: 'center',
                        padding: '1.5rem',
                        background: 'linear-gradient(135deg, rgba(196,30,58,0.08), rgba(212,175,55,0.04))',
                        border: '1px solid rgba(212,175,55,0.25)',
                        borderRadius: '2px',
                    }}>
                        <p style={{ fontFamily: 'var(--cinzel-font)', fontSize: '0.7rem', letterSpacing: '3px', color: 'var(--primary)', marginBottom: '0.5rem' }}>RESULTADO DEL RITO</p>
                        <p style={{ fontFamily: 'var(--cinzel-font)', fontSize: '1.1rem', color: 'var(--secondary)', margin: 0, letterSpacing: '2px' }}>
                            El neófito asciende al rango de<br />
                            <strong style={{ fontSize: '1.3rem', textShadow: '0 0 15px rgba(212,175,55,0.5)' }}>Sombras del Umbral</strong>
                        </p>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.5rem', fontStyle: 'italic' }}>
                            Primer rango oficial en Ancalagon Oblivion Fleet
                        </p>
                    </div>
                </div>
            </motion.div>

            <GlyphDivider text="📈  RITUAL DE PROGRESIÓN  📈" />

            {/* ── TABLA DE PROGRESIÓN ── */}
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h2 style={{ fontFamily: 'var(--cinzel-font)', color: 'var(--secondary)', letterSpacing: '5px', fontSize: '1rem', marginBottom: '0.5rem' }}>
                        ☩ LA ESCALA DEL ABISMO ☩
                    </h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                        Cada ascenso exige sangre en los edictos y sabiduría en el Grimoire
                    </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {ranks.map((rank, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '-40px' }}
                            transition={{ delay: i * 0.08 }}
                            className="glass-card"
                            style={{
                                borderLeft: `4px solid ${rank.color}`,
                                display: 'grid',
                                gridTemplateColumns: '80px 1fr',
                                gap: '1.5rem',
                                alignItems: 'start',
                                padding: '1.5rem',
                            }}
                        >
                            {/* Badge */}
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '0.5rem',
                                paddingTop: '0.3rem',
                            }}>
                                <div style={{
                                    width: '52px', height: '52px',
                                    borderRadius: '2px',
                                    background: `${rank.color}22`,
                                    border: `1px solid ${rank.color}66`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '1.6rem',
                                }}>
                                    {rank.icon}
                                </div>
                                <span style={{ fontFamily: 'var(--cinzel-font)', fontSize: '0.65rem', color: rank.color, letterSpacing: '2px' }}>
                                    ASCENSO {rank.number}
                                </span>
                            </div>

                            {/* Content */}
                            <div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                                    <span style={{ fontFamily: 'var(--cinzel-font)', fontSize: '0.85rem', color: 'var(--text-muted)', letterSpacing: '1px' }}>{rank.from}</span>
                                    <span style={{ color: rank.color, fontSize: '1rem' }}>→</span>
                                    <span style={{ fontFamily: 'var(--cinzel-font)', fontSize: '0.95rem', color: rank.color, letterSpacing: '2px', textShadow: `0 0 12px ${rank.color}60` }}>{rank.to}</span>
                                </div>

                                {/* Litanías de Ascenso */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                    {rank.steps.map((step, s) => (
                                        <div key={s} style={{
                                            display: 'flex',
                                            gap: '0.8rem',
                                            alignItems: 'flex-start',
                                        }}>
                                            <span style={{ color: rank.color, fontSize: '0.8rem', marginTop: '0.2rem', flexShrink: 0 }}>☩</span>
                                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.7, margin: 0 }}>{step}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </motion.div>

            {/* ── Closing Seal ── */}
            <GlyphDivider />
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                style={{
                    textAlign: 'center',
                    padding: '3rem 2rem',
                    border: '1px solid rgba(212,175,55,0.15)',
                    borderRadius: '4px',
                    background: 'linear-gradient(180deg, rgba(196,30,58,0.06) 0%, transparent 100%)',
                }}
            >
                <div style={{ marginBottom: '1rem', opacity: 0.7 }}>
                    <DragonIcon size={60} />
                </div>
                <p style={{ fontFamily: 'var(--cinzel-font)', fontSize: '0.9rem', letterSpacing: '3px', color: 'var(--secondary)', marginBottom: '0.5rem' }}>
                    HERALDOS DE ANCALAGON
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', marginBottom: '1.5rem', lineHeight: 1.8 }}>
                    "No se llega al cúspide por ambición.<br/>Se llega porque el Vacío decide que ya estás listo."
                </p>
                <p style={{ fontFamily: 'var(--cinzel-font)', fontSize: '0.65rem', letterSpacing: '5px', color: 'var(--primary)', opacity: 0.5, margin: 0 }}>
                    IN NOMINI OBLIVIONIS · ANCALAGON OBLIVION FLEET
                </p>
            </motion.div>

        </div>
    );
};

export default Rituales;

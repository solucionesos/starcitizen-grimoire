import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import DragonIcon from '../components/DragonIcon';


const sections = [
    {
        path: '/divinitatus',
        icon: '📖',
        title: 'Lectitio Divinitatus',
        subtitle: 'El Libro de la Palabra de Ancalagon',
        description: 'La recopilación sagrada de la Flota. Contiene las Crónicas históricas de la hermandad y los Rituales de Ascenso necesarios para progresar en la escala del Abismo.',
        color: '#d4af37',
        label: 'ABRIR EL LIBRO',
    },
    {
        path: '/missions',
        icon: '📜',
        title: 'Edictos',
        subtitle: 'Registro de Contratos Sagrados',
        description: 'Los mandatos emitidos por las facciones del Imperio. Cada edicto exige sangre, sigilo o trasmutación. Filtra por tipo de bendición y reputación requerida.',
        color: '#c41e3a',
        label: 'VER EDICTOS',
    },
    {
        path: '/nexo',
        icon: '🌠',
        title: 'Nexo Estelar',
        subtitle: 'Cartografía Orbital de Stanton',
        description: 'El mapa sagrado de los cuatro mundos corporativos. Planetas, lunas, estaciones, cinturones de asteroides y puntos de salto: todas las coordenadas del Vacío en un solo nexo interactivo.',
        color: '#4FC3F7',
        label: 'ABRIR NEXO',
    },
    {
        path: '/mapa',
        icon: '🌌',
        title: 'Ofrendas',
        subtitle: 'Cartografía de Recursos del Vacío',
        description: 'Localiza los materiales dispersos por Stanton y Pyro. Cada ofrenda tiene coordenadas sagradas en los mapas de extracción del Grimoire.',
        color: '#c41e3a',
        label: 'ABRIR CARTOGRAFÍA',
    },
    {
        path: '/recipes',
        icon: '⚙️',
        title: 'Tecnomilagros',
        subtitle: 'Archive de Blueprints',
        description: 'Planos sagrados para la fabricación de armamento y equipamiento. Consulta las ofrendas requeridas y los edictos que desbloquean cada trasmutación.',
        color: '#c41e3a',
        label: 'CONSULTAR GRIMOIRE',
    },
    {
        path: '/altar',
        icon: '🔥',
        title: 'Altar de Forja',
        subtitle: 'Calculadora de Transmutación',
        description: 'Concentra los tecnomilagros que deseas manifestar para revelar el sumatorio sagrado de ofrendas. Una calculadora de recolección en masa para la Flota.',
        color: '#d4af37',
        label: 'ACTIVAR RITO',
    },
    {
        path: '/datavelo',
        icon: '📡',
        title: 'DATAVELO',
        subtitle: 'Logística y Mercado Negro',
        description: 'El nexo de operaciones de la Flota. Sincroniza las aperturas de las Bóvedas del Hangar Ejecutivo y accede al catálogo clandestino de Wikelo para adquirir naves y equipos restringidos.',
        color: '#94a3b8',
        label: 'ACCEDER A DATAVELO',
    },
];

const Home: React.FC = () => {
    const navigate = useNavigate();

    useEffect(() => {
        document.title = 'Star Grimoire | Ancalagon Oblivion Fleet';
    }, []);

    return (
        <div style={{ padding: '0 2rem 4rem', maxWidth: '1100px', margin: '0 auto' }}>

            {/* ── HERO ── */}
            <motion.div
                initial={{ opacity: 0, y: -30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, ease: 'easeOut' }}
                style={{
                    position: 'relative',
                    textAlign: 'center',
                    padding: '5rem 2rem 4rem',
                    marginBottom: '3rem',
                    overflow: 'hidden',
                }}
            >
                {/* Animated background glows */}
                <div style={{
                    position: 'absolute', inset: 0, pointerEvents: 'none',
                    backgroundImage: `
                        radial-gradient(ellipse at 50% 0%, rgba(196,30,58,0.22) 0%, transparent 60%),
                        radial-gradient(ellipse at 20% 80%, rgba(212,175,55,0.06) 0%, transparent 40%),
                        radial-gradient(ellipse at 80% 80%, rgba(196,30,58,0.06) 0%, transparent 40%)
                    `,
                }} />

                {/* Top ornament */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '2rem', opacity: 0.4 }}>
                    <div style={{ width: '80px', height: '1px', background: 'linear-gradient(to right, transparent, var(--secondary))' }} />
                    <span style={{ color: 'var(--secondary)', fontFamily: 'var(--cinzel-font)', fontSize: '0.75rem', letterSpacing: '6px' }}>IN NOMINI OBLIVIONIS</span>
                    <div style={{ width: '80px', height: '1px', background: 'linear-gradient(to left, transparent, var(--secondary))' }} />
                </div>

                <div style={{ marginBottom: '1.5rem', filter: 'drop-shadow(0 0 30px rgba(196,30,58,0.7))' }}>
                    <DragonIcon size={100} />
                </div>

                <h1 style={{
                    fontFamily: 'var(--cinzel-font)',
                    fontWeight: 900,
                    fontSize: 'clamp(2rem, 5vw, 3.5rem)',
                    letterSpacing: '10px',
                    color: 'var(--secondary)',
                    textShadow: '0 0 40px rgba(212,175,55,0.4), 2px 2px 12px rgba(0,0,0,1)',
                    marginBottom: '0.5rem',
                    lineHeight: 1.1,
                }}>
                    ANCALAGON
                    <br />
                    <span style={{ fontSize: '55%', letterSpacing: '14px', color: 'var(--text-main)', textShadow: 'none', opacity: 0.75 }}>
                        OBLIVION FLEET
                    </span>
                </h1>

                {/* Tagline */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.8 }}
                    style={{
                        fontFamily: 'var(--cinzel-font)',
                        fontSize: '1rem',
                        fontStyle: 'italic',
                        color: 'var(--text-muted)',
                        letterSpacing: '3px',
                        marginTop: '2rem',
                        borderTop: '1px solid rgba(212,175,55,0.15)',
                        borderBottom: '1px solid rgba(212,175,55,0.15)',
                        padding: '1rem 2rem',
                        display: 'inline-block',
                    }}
                >
                    "Donde termina el orden… comenzamos nosotros."
                </motion.p>
            </motion.div>

            {/* ── LORE SUMMARY ── */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.8 }}
                className="glass-card"
                style={{
                    borderTop: '3px solid var(--secondary)',
                    marginBottom: '3rem',
                    display: 'grid',
                    gridTemplateColumns: '3px 1fr',
                    gap: 0,
                    padding: 0,
                    overflow: 'hidden',
                }}
            >
                <div style={{ background: 'linear-gradient(to bottom, var(--secondary), var(--primary))', borderRadius: '0' }} />
                <div style={{ padding: '2rem 2.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.5rem' }}>
                        <span style={{ color: 'var(--secondary)', fontSize: '1.2rem' }}>☩</span>
                        <h2 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--secondary)', letterSpacing: '5px' }}>
                            EVANGELIO DE LA FLOTA
                        </h2>
                    </div>
                    <p style={{ color: 'var(--text-main)', lineHeight: 1.9, fontSize: '1.02rem', margin: '0 0 1rem' }}>
                        <strong style={{ color: 'var(--secondary)' }}>Ancalagon Oblivion Fleet</strong> nació de los fragmentos que el Imperio descartó: pilotos sin contrato, colonos desplazados por las megacorporaciones, almas que el UEE olvidó en los márgenes de Stanton y Pyro.
                    </p>
                    <p style={{ color: 'var(--text-muted)', lineHeight: 1.9, fontSize: '1.02rem', margin: '0 0 1rem' }}>
                        Donde otros vieron ruinas, ellos vieron una <strong style={{ color: 'var(--text-main)' }}>verdad oculta</strong>: todo sistema lleva en sí las semillas de su propio quiebre. No para destruir por destruir, sino para <em>acelerar el momento en que las grietas revelan lo que realmente yace debajo</em>.
                    </p>
                    <p style={{ color: 'var(--text-muted)', lineHeight: 1.9, fontSize: '1.02rem', margin: 0 }}>
                        La Fleet opera en las sombras del espacio civilizado. Sus hermanos no buscan territorios ni tronos. Buscan comprender. Y en ese entendimiento, forjan algo que ningún Imperio puede arrebatarles: <strong style={{ color: 'var(--primary)' }}>la libertad del Vacío</strong>.
                    </p>
                </div>
            </motion.div>

            {/* ── SECTION HEADER ── */}
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <p style={{ fontFamily: 'var(--cinzel-font)', fontSize: '0.7rem', letterSpacing: '5px', color: 'var(--text-muted)', margin: 0 }}>
                    ☩ ARCHIVOS DEL GRIMOIRE ☩
                </p>
            </div>

            {/* ── NAVIGATION CARDS ── */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '1.2rem',
            }}>
                {sections.map((section, i) => (
                    <motion.div
                        key={section.path}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 + i * 0.1, duration: 0.6 }}
                        onClick={() => navigate(section.path)}
                        className="glass-card"
                        style={{
                            cursor: 'pointer',
                            borderTop: `3px solid ${section.color}`,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1rem',
                            transition: 'all 0.3s ease',
                            userSelect: 'none',
                        }}
                        whileHover={{ y: -6, boxShadow: `0 12px 40px ${section.color}25` }}
                        whileTap={{ scale: 0.98 }}
                    >
                        {/* Icon + Title */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                            <div style={{
                                fontSize: '2.5rem',
                                lineHeight: 1,
                                filter: `drop-shadow(0 0 12px ${section.color}80)`,
                                flexShrink: 0,
                            }}>
                                {section.icon}
                            </div>
                            <div>
                                <h3 style={{
                                    margin: 0,
                                    fontFamily: 'var(--cinzel-font)',
                                    fontSize: '1rem',
                                    color: section.color === '#d4af37' ? 'var(--secondary)' : 'var(--text-main)',
                                    letterSpacing: '3px',
                                    marginBottom: '0.2rem',
                                }}>
                                    {section.title}
                                </h3>
                                <p style={{
                                    margin: 0,
                                    fontSize: '0.65rem',
                                    letterSpacing: '3px',
                                    color: 'var(--text-muted)',
                                    fontFamily: 'var(--cinzel-font)',
                                    textTransform: 'uppercase',
                                }}>
                                    {section.subtitle}
                                </p>
                            </div>
                        </div>

                        {/* Description */}
                        <p style={{
                            margin: 0,
                            color: 'var(--text-muted)',
                            fontSize: '0.9rem',
                            lineHeight: 1.8,
                            flex: 1,
                        }}>
                            {section.description}
                        </p>

                        {/* CTA */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingTop: '1rem',
                            borderTop: `1px solid ${section.color}30`,
                        }}>
                            <span style={{
                                fontFamily: 'var(--cinzel-font)',
                                fontSize: '0.65rem',
                                letterSpacing: '3px',
                                color: section.color,
                            }}>
                                {section.label}
                            </span>
                            <span style={{ color: section.color, fontSize: '1.2rem', transition: 'transform 0.2s' }}>→</span>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* ── Footer seal ── */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 1 }}
                style={{ textAlign: 'center', marginTop: '4rem', paddingTop: '2rem', borderTop: '1px solid rgba(212,175,55,0.1)' }}
            >
                <p style={{ fontFamily: 'var(--cinzel-font)', fontSize: '0.6rem', letterSpacing: '5px', color: 'var(--text-muted)', opacity: 0.4, margin: 0 }}>
                    STAR GRIMOIRE v4.7.0 · ANCALAGON OBLIVION FLEET · IN NOMINI OBLIVIONIS
                </p>
            </motion.div>
        </div>
    );
};

export default Home;

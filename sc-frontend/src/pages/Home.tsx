import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import DragonIcon from '../components/DragonIcon';
import { Vote, CheckCircle2, ChevronRight } from 'lucide-react';
import type { Verdict } from '../types';
import { formatAbyssalDate } from '../utils/abyssalDate';

const sections = [
  {
    path: '/divinitatus',
    icon: '📖',
    title: 'Lectitio Divinitatus',
    subtitle: 'Lore',
    description: 'La recopilación sagrada de la Flota. Contiene las Crónicas históricas de la hermandad y los Rituales de Ascenso necesarios para progresar en la escala del Abismo.',
    color: '#d4af37',
    label: 'ABRIR EL LIBRO',
  },
  {
    path: '/edictos',
    icon: '📜',
    title: 'Edictos Sagrados',
    subtitle: 'Decretos del Concilio del Vacío',
    description: 'El centro de mando de la Hermandad. Designios de la flota, Edictos de Cruzada con formación de escuadras y el Calendario Abisal del Ciclo 2956.',
    color: '#c41e3a',
    label: 'VER EDICTOS',
  },
  {
    path: '/conclave',
    icon: '⚖️',
    title: 'El Cónclave',
    subtitle: 'Deliberación del Concilio',
    description: 'Cámara soberana donde los hermanos consagrados en La Escala del Abismo votan el rumbo de las misiones, fechas de salto y Designios de la Flota.',
    color: '#9b59b6',
    label: 'ENTRAR AL CÓNCLAVE',
  },
  {
    path: '/codice',
    icon: '🏛️',
    title: 'El Códice',
    subtitle: 'Compendio de la Creación',
    description: 'Todo lo material y conceptual documentado: Mandatos Profanos del Imperio, Cartografía de Ofrendas, Tecnomilagros (blueprints), Arcas Estelares y Armamento.',
    color: '#d4af37',
    label: 'EXPLORAR CÓDICE',
  },
  {
    path: '/nexo',
    icon: '🌠',
    title: 'Nexo Estelar',
    subtitle: 'Cartografía Orbital',
    description: 'El mapa sagrado de los cuatro mundos corporativos y zonas disputadas. Planetas, lunas, estaciones, cinturones de asteroides y puntos de salto en un solo nexo interactivo.',
    color: '#4FC3F7',
    label: 'ABRIR NEXO',
  },
  {
    path: '/altar',
    icon: '🔥',
    title: 'Altar de Forja',
    subtitle: 'Crafting Persistente',
    description: 'Concentra los tecnomilagros que deseas manifestar para revelar el sumatorio sagrado de ofrendas. Sincronizado en tiempo real con el expediente de tu cuenta.',
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
  const [verdicts, setVerdicts] = useState<Verdict[]>([]);

  useEffect(() => {
    document.title = 'Star Grimoire | Ancalagon Oblivion Fleet';

    axios
      .get('/verdicts/home')
      .then((res) => {
        setVerdicts(res.data || []);
      })
      .catch((err) => {
        console.error('Error fetching home verdicts:', err);
      });
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
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            backgroundImage: `
              radial-gradient(ellipse at 50% 0%, rgba(196,30,58,0.22) 0%, transparent 60%),
              radial-gradient(ellipse at 20% 80%, rgba(212,175,55,0.06) 0%, transparent 40%),
              radial-gradient(ellipse at 80% 80%, rgba(196,30,58,0.06) 0%, transparent 40%)
            `,
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '2rem', opacity: 0.4 }}>
          <div style={{ width: '80px', height: '1px', background: 'linear-gradient(to right, transparent, var(--secondary))' }} />
          <span style={{ color: 'var(--secondary)', fontFamily: 'var(--cinzel-font)', fontSize: '0.75rem', letterSpacing: '6px' }}>
            IN NOMINI OBLIVIONIS
          </span>
          <div style={{ width: '80px', height: '1px', background: 'linear-gradient(to left, transparent, var(--secondary))' }} />
        </div>

        <div style={{ marginBottom: '1.5rem', filter: 'drop-shadow(0 0 30px rgba(196,30,58,0.7))' }}>
          <DragonIcon size={100} />
        </div>

        <h1
          style={{
            fontFamily: 'var(--cinzel-font)',
            fontWeight: 900,
            fontSize: 'clamp(2rem, 5vw, 3.5rem)',
            letterSpacing: '10px',
            color: 'var(--secondary)',
            textShadow: '0 0 40px rgba(212,175,55,0.4), 2px 2px 12px rgba(0,0,0,1)',
            marginBottom: '0.5rem',
            lineHeight: 1.1,
          }}
        >
          ANCALAGON
          <br />
          <span style={{ fontSize: '55%', letterSpacing: '14px', color: 'var(--text-main)', textShadow: 'none', opacity: 0.75 }}>
            OBLIVION FLEET
          </span>
        </h1>

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

      {/* ── EVANGELIO DE LA FLOTA ── */}
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

      {/* ── VEREDICTOS DEL CÓNCLAVE (Al finalizar la votación se agrega resumen en la página inicial) ── */}
      {verdicts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="glass-card"
          style={{
            borderTop: '3px solid #9b59b6',
            marginBottom: '3rem',
            padding: '2rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <Vote size={24} style={{ color: '#c084fc' }} />
              <div>
                <h2 style={{ margin: 0, fontSize: '1rem', color: '#c084fc', letterSpacing: '4px', fontFamily: 'var(--cinzel-font)' }}>
                  VEREDICTOS DEL CÓNCLAVE
                </h2>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Resoluciones y acuerdos sellados por la voluntad soberana de la Hermandad
                </span>
              </div>
            </div>

            <button
              onClick={() => navigate('/conclave')}
              className="btn-secondary"
              style={{
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                borderColor: '#9b59b6',
                color: '#c084fc',
              }}
            >
              CÁMARA DEL CÓNCLAVE <ChevronRight size={14} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.2rem' }}>
            {verdicts.map((v) => (
              <div
                key={v.id}
                style={{
                  background: 'rgba(0,0,0,0.3)',
                  padding: '1.2rem',
                  borderRadius: '6px',
                  borderLeft: '3px solid #9b59b6',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    style={{
                      fontSize: '0.65rem',
                      fontFamily: 'var(--cinzel-font)',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '3px',
                      background: 'rgba(155,89,182,0.15)',
                      color: '#c084fc',
                      textTransform: 'uppercase',
                    }}
                  >
                    {v.poll_type}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {formatAbyssalDate(v.closed_at, { prefixCycle: true })}
                  </span>
                </div>

                <h3 style={{ margin: 0, fontFamily: 'var(--cinzel-font)', fontSize: '1rem', color: 'var(--text-main)' }}>
                  {v.title}
                </h3>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: 'rgba(212,175,55,0.08)',
                    padding: '0.5rem 0.8rem',
                    borderRadius: '4px',
                    border: '1px solid rgba(212,175,55,0.2)',
                  }}
                >
                  <CheckCircle2 size={16} color="var(--secondary)" />
                  <div style={{ fontSize: '0.85rem', color: 'var(--secondary)', fontWeight: 'bold' }}>
                    {v.winner_label}
                  </div>
                </div>

                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  {v.summary}
                </p>

                {v.action_taken && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--accent-silver)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.4rem', fontStyle: 'italic' }}>
                    ✦ {v.action_taken}
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── SECTION HEADER ── */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <p style={{ fontFamily: 'var(--cinzel-font)', fontSize: '0.7rem', letterSpacing: '5px', color: 'var(--text-muted)', margin: 0 }}>
          ☩ ARCHIVOS DEL GRIMOIRE ☩
        </p>
      </div>

      {/* ── NAVIGATION CARDS ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.2rem',
        }}
      >
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
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
              <div
                style={{
                  fontSize: '2.5rem',
                  lineHeight: 1,
                  filter: `drop-shadow(0 0 12px ${section.color}80)`,
                  flexShrink: 0,
                }}
              >
                {section.icon}
              </div>
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontFamily: 'var(--cinzel-font)',
                    fontSize: '1rem',
                    color: section.color === '#d4af37' ? 'var(--secondary)' : 'var(--text-main)',
                    letterSpacing: '3px',
                    marginBottom: '0.2rem',
                  }}
                >
                  {section.title}
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.65rem',
                    letterSpacing: '3px',
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--cinzel-font)',
                    textTransform: 'uppercase',
                  }}
                >
                  {section.subtitle}
                </p>
              </div>
            </div>

            <p
              style={{
                margin: 0,
                color: 'var(--text-muted)',
                fontSize: '0.9rem',
                lineHeight: 1.8,
                flex: 1,
              }}
            >
              {section.description}
            </p>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '1rem',
                borderTop: `1px solid ${section.color}30`,
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--cinzel-font)',
                  fontSize: '0.65rem',
                  letterSpacing: '3px',
                  color: section.color,
                }}
              >
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
          STAR GRIMOIRE · ANCALAGON OBLIVION FLEET · IN NOMINI OBLIVIONIS
        </p>
      </motion.div>
    </div>
  );
};

export default Home;

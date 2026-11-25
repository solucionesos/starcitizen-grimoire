import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Compass,
  Flame,
  Library,
  Radio,
  Scale,
  ScrollText,
  Users,
  Vote,
} from 'lucide-react';
import DragonIcon from '../components/DragonIcon';
import DualLabel from '../components/DualLabel';
import { getHomeVerdicts } from '../api/client';
import { TERMINOLOGY, type TermEntry } from '../constants/terminology';
import type { Verdict } from '../types';
import { toAbyssalYear } from '../utils/abyssalDate';

const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'] as const;

function formatUtcAbyssalDate(raw: string | null | undefined): string {
  if (!raw) return 'Ciclo Indeterminado';
  const trimmed = raw.trim();
  if (!trimmed) return 'Ciclo Indeterminado';
  const sqliteUtcRe = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/;
  const isoNaiveRe = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/;
  const normalized = sqliteUtcRe.test(trimmed)
    ? `${trimmed.replace(' ', 'T')}Z`
    : isoNaiveRe.test(trimmed)
      ? `${trimmed}Z`
      : trimmed;

  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) {
    return trimmed.replace(/\b(202\d)\b/g, (_, y: string) => String(Number(y) + 930));
  }
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = MONTHS_ES[d.getUTCMonth()] ?? 'Ene';
  const year = toAbyssalYear(d.getUTCFullYear());
  return `${day} ${month} Ciclo ${year}`;
}

interface HomeSectionCard {
  path: string;
  term: TermEntry;
  icon: React.ComponentType<{ size?: number; 'aria-hidden'?: boolean; style?: React.CSSProperties }>;
  description: string;
  color: string;
  label: string;
}

const SECTIONS: readonly HomeSectionCard[] = [
  {
    path: '/hermandad',
    term: TERMINOLOGY.hermandad,
    icon: Users,
    description:
      'La pirámide viviente de La Escala del Abismo. Consulta el escalafón público de hermanos, sus expedientes RSI, Marcas del Abismo y el poder naval agregado de la Flota.',
    color: 'var(--secondary)',
    label: 'VER LA HERMANDAD',
  },
  {
    path: '/divinitatus',
    term: TERMINOLOGY.divinitatus,
    icon: BookOpen,
    description:
      'La recopilación sagrada de la Flota. Contiene las Crónicas históricas de la hermandad y los Rituales de Ascenso necesarios para progresar en la escala del Abismo.',
    color: 'var(--secondary)',
    label: 'ABRIR EL LIBRO',
  },
  {
    path: '/edictos',
    term: TERMINOLOGY.edictos,
    icon: ScrollText,
    description:
      'El centro de mando de la Hermandad. Designios de la flota, Edictos de Cruzada con formación de escuadras y el Calendario Abisal del Ciclo 2956.',
    color: 'var(--primary)',
    label: 'VER EDICTOS',
  },
  {
    path: '/conclave',
    term: TERMINOLOGY.conclave,
    icon: Scale,
    description:
      'Cámara soberana donde los hermanos consagrados en La Escala del Abismo votan el rumbo de las misiones, fechas de salto y Designios de la Flota.',
    color: 'var(--accent-conclave)',
    label: 'ENTRAR AL CÓNCLAVE',
  },
  {
    path: '/codice',
    term: TERMINOLOGY.codice,
    icon: Library,
    description:
      'Todo lo material y conceptual documentado: Mandatos Profanos del Imperio, Cartografía de Ofrendas, Tecnomilagros (blueprints), Arcas Estelares y Armamento.',
    color: 'var(--secondary)',
    label: 'EXPLORAR CÓDICE',
  },
  {
    path: '/nexo',
    term: TERMINOLOGY.nexo,
    icon: Compass,
    description:
      'El mapa sagrado de los mundos corporativos y zonas disputadas. Planetas, lunas, estaciones, cinturones de asteroides y puntos de salto en un solo nexo interactivo.',
    color: 'var(--accent-rsi)',
    label: 'ABRIR NEXO',
  },
  {
    path: '/altar',
    term: TERMINOLOGY.altar,
    icon: Flame,
    description:
      'Concentra los tecnomilagros que deseas manifestar para revelar el sumatorio sagrado de ofrendas. Sincronizado en tiempo real con el expediente de tu cuenta.',
    color: 'var(--secondary)',
    label: 'ACTIVAR RITO',
  },
  {
    path: '/datavelo',
    term: TERMINOLOGY.datavelo,
    icon: Radio,
    description:
      'El nexo de operaciones de la Flota. Sincroniza las aperturas de las Bóvedas del Hangar Ejecutivo, vigila alertas RSI, rutas SCU y accede al catálogo de Wikelo.',
    color: 'var(--accent-silver)',
    label: 'ACCEDER A DATAVELO',
  },
];

const Home: React.FC = () => {
  const [verdicts, setVerdicts] = useState<Verdict[]>([]);

  useEffect(() => {
    document.title = 'Star Grimoire | Ancalagon Oblivion Fleet';

    let cancelled = false;
    getHomeVerdicts()
      .then((data) => {
        if (!cancelled) {
          setVerdicts(data);
        }
      })
      .catch((err) => {
        console.error('Error fetching home verdicts:', err);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{ padding: '0 2rem 4rem', maxWidth: '1100px', margin: '0 auto' }}>
      {/* ── HERO ── */}
      <motion.div
        initial={{ opacity: 0, y: -24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.85, ease: 'easeOut' }}
        style={{
          position: 'relative',
          textAlign: 'center',
          padding: '4.5rem 2rem 3.5rem',
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

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '2rem', opacity: 0.45 }}>
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
            fontSize: 'clamp(1.65rem, 5vw, 3.5rem)',
            letterSpacing: 'clamp(4px, 1.4vw, 10px)',
            color: 'var(--secondary)',
            textShadow: '0 0 40px rgba(212,175,55,0.4), 2px 2px 12px rgba(0,0,0,1)',
            marginBottom: '0.5rem',
            lineHeight: 1.1,
          }}
        >
          ANCALAGON
          <br />
          <span style={{ fontSize: '55%', letterSpacing: 'clamp(5px, 1.8vw, 14px)', color: 'var(--text-main)', textShadow: 'none', opacity: 0.75 }}>
            OBLIVION FLEET
          </span>
        </h1>

        <p style={{ margin: '0.8rem auto 0', fontSize: '0.85rem', color: 'var(--accent-silver)', letterSpacing: '2px' }}>
          <DualLabel
            sacred={TERMINOLOGY.inicio.sacred}
            tactical={TERMINOLOGY.inicio.tactical}
            size="sm"
            inline
            align="center"
          />
        </p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.7 }}
          style={{
            fontFamily: 'var(--cinzel-font)',
            fontSize: '1rem',
            fontStyle: 'italic',
            color: 'var(--text-muted)',
            letterSpacing: '3px',
            marginTop: '1.8rem',
            borderTop: '1px solid rgba(212,175,55,0.15)',
            borderBottom: '1px solid rgba(212,175,55,0.15)',
            padding: '1rem 2rem',
            display: 'inline-block',
          }}
        >
          “Donde termina el orden… comenzamos nosotros.”
        </motion.p>
      </motion.div>

      {/* ── EVANGELIO DE LA FLOTA ── */}
      <motion.section
        aria-labelledby="evangelio-heading"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.7 }}
        className="surface-monolith"
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
        <div style={{ background: 'linear-gradient(to bottom, var(--secondary), var(--primary))' }} />
        <div style={{ padding: '2rem 2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.5rem' }}>
            <span aria-hidden="true" style={{ color: 'var(--secondary)', fontSize: '1.2rem' }}>☩</span>
            <h2 id="evangelio-heading" style={{ margin: 0, fontSize: '0.85rem', color: 'var(--secondary)', letterSpacing: '5px' }}>
              EVANGELIO DE LA FLOTA
            </h2>
          </div>
          <p className="prose-grimoire" style={{ color: 'var(--text-main)', fontSize: '1.02rem', margin: '0 0 1rem' }}>
            <strong style={{ color: 'var(--secondary)' }}>Ancalagon Oblivion Fleet</strong> nació de los fragmentos que el Imperio descartó: pilotos sin contrato, colonos desplazados por las megacorporaciones, almas que el UEE olvidó en los márgenes de Stanton y Pyro.
          </p>
          <p className="prose-grimoire" style={{ color: 'var(--text-muted)', fontSize: '1.02rem', margin: '0 0 1rem' }}>
            Donde otros vieron ruinas, ellos vieron una <strong style={{ color: 'var(--text-main)' }}>verdad oculta</strong>: todo sistema lleva en sí las semillas de su propio quiebre. No para destruir por destruir, sino para <em>acelerar el momento en que las grietas revelan lo que realmente yace debajo</em>.
          </p>
          <p className="prose-grimoire" style={{ color: 'var(--text-muted)', fontSize: '1.02rem', margin: 0 }}>
            La Fleet opera en las sombras del espacio civilizado. Sus hermanos no buscan territorios ni tronos. Buscan comprender. Y en ese entendimiento, forjan algo que ningún Imperio puede arrebatarles: <strong style={{ color: 'var(--primary)' }}>la libertad del Vacío</strong>.
          </p>
        </div>
      </motion.section>

      {/* ── VEREDICTOS DEL CÓNCLAVE ── */}
      {verdicts.length > 0 && (
        <motion.section
          aria-labelledby="home-verdicts-heading"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7 }}
          className="surface-monolith"
          style={{
            borderTop: '3px solid var(--accent-conclave)',
            marginBottom: '3rem',
            padding: '2rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <Vote size={24} aria-hidden="true" style={{ color: 'var(--accent-conclave)' }} />
              <div>
                <h2 id="home-verdicts-heading" style={{ margin: 0 }}>
                  <DualLabel
                    sacred="VEREDICTOS DEL CÓNCLAVE"
                    tactical={TERMINOLOGY.veredictos.tactical}
                    size="md"
                    sacredColor="var(--accent-conclave)"
                  />
                </h2>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Resoluciones y acuerdos sellados por la voluntad soberana de la Hermandad
                </span>
              </div>
            </div>

            <Link
              to="/conclave?status=closed"
              className="btn-secondary"
              style={{
                fontSize: '0.75rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                borderColor: 'var(--accent-conclave)',
                color: 'var(--accent-conclave)',
              }}
            >
              CÁMARA DEL CÓNCLAVE <ChevronRight size={14} aria-hidden="true" />
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.2rem' }}>
            {verdicts.map((v) => (
              <div
                key={v.id}
                style={{
                  background: 'rgba(0,0,0,0.3)',
                  padding: '1.2rem',
                  borderRadius: '6px',
                  borderLeft: '3px solid var(--accent-conclave)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontSize: '0.65rem',
                      fontFamily: 'var(--cinzel-font)',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '3px',
                      background: 'rgba(168, 85, 247, 0.16)',
                      color: 'var(--accent-conclave)',
                      textTransform: 'uppercase',
                    }}
                  >
                    {v.poll_type}
                  </span>
                  <span className="tabular-nums" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {formatUtcAbyssalDate(v.closed_at)}
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
                  <CheckCircle2 size={16} color="var(--secondary)" aria-hidden="true" style={{ flexShrink: 0 }} />
                  <div style={{ fontSize: '0.85rem', color: 'var(--secondary)', fontWeight: 'bold' }}>
                    {v.winner_label}
                  </div>
                </div>

                <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  {v.summary}
                </p>

                {typeof v.total_votes === 'number' && v.total_votes > 0 && (
                  <div className="tabular-nums" style={{ fontSize: '0.72rem', color: 'var(--accent-silver)' }}>
                    Quórum registrado: {v.total_votes} votos
                  </div>
                )}

                {v.action_taken && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--accent-silver)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.4rem', fontStyle: 'italic' }}>
                    ✦ {v.action_taken}
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.section>
      )}

      {/* ── SECTION HEADER ── */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontFamily: 'var(--cinzel-font)', fontSize: '0.72rem', fontWeight: 400, letterSpacing: '5px', color: 'var(--text-muted)', margin: 0 }}>
          ☩ ARCHIVOS DEL GRIMOIRE ☩
        </h2>
      </div>

      {/* ── NAVIGATION CARDS ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.2rem',
        }}
      >
        {SECTIONS.map((section, i) => {
          const IconComp = section.icon;
          return (
            <motion.div
              key={section.path}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + i * 0.06, duration: 0.45 }}
              style={{ display: 'flex' }}
            >
              <Link
                to={section.path}
                className="surface-interactive"
                style={{
                  borderTop: `3px solid ${section.color}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  textDecoration: 'none',
                  color: 'inherit',
                  width: '100%',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(255,255,255,0.03)',
                      border: `1px solid ${section.color}`,
                      color: section.color,
                      flexShrink: 0,
                    }}
                  >
                    <IconComp size={22} aria-hidden={true} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <h3 style={{ margin: 0 }}>
                      <DualLabel
                        sacred={section.term.sacred}
                        tactical={section.term.tactical}
                        size="md"
                        sacredColor={section.color === 'var(--secondary)' ? 'var(--secondary)' : 'var(--text-main)'}
                      />
                    </h3>
                  </div>
                </div>

                <p
                  style={{
                    margin: 0,
                    color: 'var(--text-muted)',
                    fontSize: '0.9rem',
                    lineHeight: 1.75,
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
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--cinzel-font)',
                      fontSize: '0.68rem',
                      letterSpacing: '3px',
                      color: section.color,
                    }}
                  >
                    {section.label}
                  </span>
                  <ChevronRight size={18} aria-hidden="true" style={{ color: section.color }} />
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* ── Footer seal ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.8 }}
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

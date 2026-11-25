import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BookMarked,
  FileCheck2,
  Flame,
  FlaskConical,
  Landmark,
  Moon,
  Radio,
  Rocket,
  ScrollText,
  Sparkles,
  Swords,
  TrendingUp,
} from 'lucide-react';
import DragonIcon from '../components/DragonIcon';
import DualLabel from '../components/DualLabel';
import { RANK_META, TERMINOLOGY } from '../constants/terminology';

const GlyphDivider: React.FC<{ text?: string; icon?: React.ReactNode }> = ({ text = '✦', icon }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '2.5rem 0', opacity: 0.5 }}>
    <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, transparent, var(--secondary))' }} />
    <span
      style={{
        color: 'var(--secondary)',
        fontFamily: 'var(--cinzel-font)',
        fontSize: '0.85rem',
        letterSpacing: '4px',
        whiteSpace: 'nowrap',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.6rem',
      }}
    >
      {icon}
      <span>{text}</span>
      {icon}
    </span>
    <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to left, transparent, var(--secondary))' }} />
  </div>
);

const ranks = [
  {
    from: RANK_META.sombras.name,
    to: RANK_META.iniciados.name,
    icon: <Moon size={24} aria-hidden="true" style={{ color: RANK_META.iniciados.color }} />,
    number: 'I',
    color: RANK_META.iniciados.color,
    steps: [
      'Completar los contratos asignados por el Consejo en los sistemas Stanton o Nyx.',
      'Participar en al menos un asalto de purificación a una Breaker Station — ya sea por la vía del silencio (PVE) o de la confrontación directa (PVP).',
    ],
  },
  {
    from: RANK_META.iniciados.name,
    to: RANK_META.portadores.name,
    icon: <FlaskConical size={24} aria-hidden="true" style={{ color: RANK_META.portadores.color }} />,
    number: 'II',
    color: RANK_META.portadores.color,
    steps: [
      'Demostrar dominio del arte sagrado de la Transmutación: fabricación de equipamiento personal o herramientas para uso grupal.',
      'Registrar al menos un Tecnomilagro completado en el Star Grimoire, verificado por un superior.',
    ],
  },
  {
    from: RANK_META.portadores.name,
    to: RANK_META.voces.name,
    icon: <Radio size={24} aria-hidden="true" style={{ color: RANK_META.voces.color }} />,
    number: 'III',
    color: RANK_META.voces.color,
    steps: [
      'Liderar una operación táctica con uso de comunicación org (VOIP + org chat).',
      'Demostrar coordinación formal entre mínimo tres hermanos de la Fleet en tiempo real.',
    ],
  },
  {
    from: RANK_META.voces.name,
    to: RANK_META.profetas.name,
    icon: <Sparkles size={24} aria-hidden="true" style={{ color: RANK_META.profetas.color }} />,
    number: 'IV',
    color: RANK_META.profetas.color,
    steps: [
      'Completar una campaña intersistémica estratégica: misiones coordinadas durante un período prolongado.',
      'Demostrar comprensión de la doctrina del Quiebre mediante decisión táctica documentada ante el Consejo.',
    ],
  },
  {
    from: RANK_META.profetas.name,
    to: 'Heraldos de Ancalagon',
    icon: <DragonIcon size={30} />,
    number: 'V',
    color: RANK_META.heraldo.color,
    steps: [
      'Contribuir sustancialmente al avance de la Fleet: en reputación, influencia territorial o contenido desbloqueado.',
      'El ascenso se otorga únicamente a juicio del Consejo Interno mediante deliberación cerrada.',
      'No se postula. Se es elegido.',
    ],
  },
];

const Rituales: React.FC = () => {
  useEffect(() => {
    document.title = 'Star Grimoire | Rituales de Ascenso';
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
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(196,30,58,0.15) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
          <BookMarked
            size={52}
            aria-hidden="true"
            style={{ color: 'var(--secondary)', filter: 'drop-shadow(0 0 20px rgba(212,175,55,0.5))' }}
          />
        </div>
        <h1 style={{ marginBottom: '1rem' }}>
          <DualLabel
            sacred={TERMINOLOGY.rituales.sacred}
            tactical={TERMINOLOGY.rituales.tactical}
            size="lg"
            align="center"
            sacredColor="var(--secondary)"
          />
        </h1>
        <p
          className="prose-grimoire"
          style={{
            fontFamily: 'var(--cinzel-font)',
            fontSize: '0.85rem',
            letterSpacing: '3px',
            color: 'var(--text-muted)',
            margin: '0 auto',
          }}
        >
          Los Ritos que forjan al Hermano desde la sombra hasta el Heraldo
        </p>
      </motion.div>

      {/* ── RITO DE INICIACIÓN ── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <ScrollText size={28} aria-hidden="true" style={{ color: 'var(--primary)', flexShrink: 0 }} />
          <h2 style={{ margin: 0 }}>
            <DualLabel
              sacred='Ritual de Iniciación · “Despertar en las Ruinas”'
              tactical="Requisitos & Proceso de Reclutamiento"
              size="md"
              sacredColor="var(--secondary)"
            />
          </h2>
        </div>

        <div className="surface-monolith" style={{ borderTop: '3px solid var(--primary)', marginBottom: '1.5rem' }}>
          {/* Objetivo */}
          <div style={{ marginBottom: '1.5rem' }}>
            <p
              style={{
                fontFamily: 'var(--cinzel-font)',
                fontSize: '0.7rem',
                letterSpacing: '3px',
                color: 'var(--primary)',
                marginBottom: '0.5rem',
              }}
            >
              <span aria-hidden="true">☩ </span>PROPÓSITO DEL RITO
            </p>
            <p className="prose-grimoire" style={{ color: 'var(--text-main)', margin: 0 }}>
              Introducir al neófito a la filosofía de Ancalagon Oblivion Fleet y las mecánicas del universo persistente. El candidato deberá demostrar que comprende la doctrina del Quiebre antes de ser admitido como hermano.
            </p>
          </div>

          <GlyphDivider text="REQUISITOS DEL UMBRAL" />

          {/* Requisitos */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem',
            }}
          >
            {[
              {
                icon: <Rocket size={24} aria-hidden="true" style={{ color: 'var(--primary)' }} />,
                title: 'Dominio de Nave',
                text: 'Ser capaz de pilotar una nave de clase básica (Aurora MR o equivalente). La movilidad es el primer sacramento.',
              },
              {
                icon: <FileCheck2 size={24} aria-hidden="true" style={{ color: 'var(--secondary)' }} />,
                title: 'Afiliación Formal',
                text: 'Estar inscrito en la organización in-game. La hermandad no admite fratres sin nombre registrado en el Grimoire.',
              },
            ].map((req) => (
              <div
                key={req.title}
                style={{
                  background: 'rgba(196,30,58,0.05)',
                  border: '1px solid rgba(212,175,55,0.2)',
                  borderLeft: '3px solid var(--primary)',
                  padding: '1.2rem',
                  borderRadius: '2px',
                }}
              >
                <div style={{ marginBottom: '0.6rem' }}>{req.icon}</div>
                <p
                  style={{
                    fontFamily: 'var(--cinzel-font)',
                    fontSize: '0.75rem',
                    color: 'var(--secondary)',
                    letterSpacing: '2px',
                    marginBottom: '0.5rem',
                  }}
                >
                  {req.title}
                </p>
                <p className="prose-grimoire" style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
                  {req.text}
                </p>
              </div>
            ))}
          </div>

          <GlyphDivider text="LA SECUENCIA DEL RITO" />

          {/* Los 3 pasos del ritual */}
          {[
            {
              step: '01',
              title: 'El Juramento del Vacío',
              icon: <Flame size={22} aria-hidden="true" style={{ color: 'var(--primary)' }} />,
              text: 'Frente al terminal de una Breaker Station en el sistema Nyx, el candidato declara públicamente su intención de abandonar el orden impuesto y aceptar la verdad de Ancalagon. El silencio de la hermandad escucha.',
            },
            {
              step: '02',
              title: 'La Prueba del Infiltrado',
              icon: <Swords size={22} aria-hidden="true" style={{ color: 'var(--primary)' }} />,
              text: 'El candidato completa una serie de objetivos tácticos que demuestran comprensión básica del mundo: exploración segura y sigilosa, combate táctico, uso del inventario y recuperación de ítems valiosos del Vacío.',
            },
            {
              step: '03',
              title: 'El Sello del Caminante',
              icon: <Landmark size={22} aria-hidden="true" style={{ color: 'var(--primary)' }} />,
              text: 'Obtener reputación mínima aceptable con una facción neutral o en actividad estructurada en Nyx o Stanton: minería, edictos o interacción social en zonas no controladas. La Fleet observa.',
            },
          ].map((paso, i) => (
            <motion.div
              key={paso.step}
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
              <div
                style={{
                  background: 'rgba(196,30,58,0.1)',
                  border: '1px solid rgba(196,30,58,0.4)',
                  borderRadius: '2px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0.8rem 0.3rem',
                }}
              >
                {paso.icon}
                <span
                  className="tabular-nums"
                  style={{
                    fontFamily: 'var(--cinzel-font)',
                    fontSize: '0.65rem',
                    color: 'var(--primary)',
                    letterSpacing: '1px',
                    marginTop: '0.35rem',
                  }}
                >
                  {paso.step}
                </span>
              </div>
              <div>
                <p
                  style={{
                    fontFamily: 'var(--cinzel-font)',
                    fontSize: '0.8rem',
                    color: 'var(--secondary)',
                    letterSpacing: '2px',
                    marginBottom: '0.4rem',
                  }}
                >
                  {paso.title}
                </p>
                <p className="prose-grimoire" style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: 0 }}>
                  {paso.text}
                </p>
              </div>
            </motion.div>
          ))}

          {/* Resultado */}
          <GlyphDivider text="☩" />
          <div
            style={{
              textAlign: 'center',
              padding: '1.5rem',
              background: 'linear-gradient(135deg, rgba(196,30,58,0.08), rgba(212,175,55,0.04))',
              border: '1px solid rgba(212,175,55,0.25)',
              borderRadius: '2px',
            }}
          >
            <p
              style={{
                fontFamily: 'var(--cinzel-font)',
                fontSize: '0.7rem',
                letterSpacing: '3px',
                color: 'var(--primary)',
                marginBottom: '0.5rem',
              }}
            >
              RESULTADO DEL RITO
            </p>
            <p style={{ fontFamily: 'var(--cinzel-font)', fontSize: '1.1rem', color: 'var(--secondary)', margin: 0, letterSpacing: '2px' }}>
              El neófito asciende al rango de<br />
              <strong style={{ fontSize: '1.3rem', textShadow: '0 0 15px rgba(212,175,55,0.5)' }}>
                {RANK_META.sombras.name}
              </strong>
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.5rem', fontStyle: 'italic' }}>
              Primer rango oficial en Ancalagon Oblivion Fleet
            </p>
          </div>
        </div>
      </motion.div>

      <GlyphDivider
        text="RITUAL DE PROGRESIÓN"
        icon={<TrendingUp size={16} aria-hidden="true" style={{ color: 'var(--secondary)' }} />}
      />

      {/* ── TABLA DE PROGRESIÓN ── */}
      <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ marginBottom: '0.5rem' }}>
            <DualLabel
              sacred="☩ LA ESCALA DEL ABISMO ☩"
              tactical="Jerarquía de Rangos & Requisitos de Ascenso"
              size="md"
              align="center"
              sacredColor="var(--secondary)"
            />
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
            Cada ascenso exige sangre en los edictos y sabiduría en el Grimoire
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {ranks.map((rank, i) => (
            <motion.div
              key={rank.number}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ delay: i * 0.08 }}
              className="surface-monolith"
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
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem',
                  paddingTop: '0.3rem',
                }}
              >
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '2px',
                    background: `${rank.color}22`,
                    border: `1px solid ${rank.color}66`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {rank.icon}
                </div>
                <span
                  className="tabular-nums"
                  style={{ fontFamily: 'var(--cinzel-font)', fontSize: '0.65rem', color: rank.color, letterSpacing: '2px' }}
                >
                  ASCENSO {rank.number}
                </span>
              </div>

              {/* Content */}
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  <span style={{ fontFamily: 'var(--cinzel-font)', fontSize: '0.85rem', color: 'var(--text-muted)', letterSpacing: '1px' }}>
                    {rank.from}
                  </span>
                  <span aria-hidden="true" style={{ color: rank.color, fontSize: '1rem' }}>
                    →
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--cinzel-font)',
                      fontSize: '0.95rem',
                      color: rank.color,
                      letterSpacing: '2px',
                      textShadow: `0 0 12px ${rank.color}60`,
                    }}
                  >
                    {rank.to}
                  </span>
                </div>

                {/* Litanías de Ascenso */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {rank.steps.map((step, s) => (
                    <div key={s} style={{ display: 'flex', gap: '0.8rem', alignItems: 'flex-start' }}>
                      <span aria-hidden="true" style={{ color: rank.color, fontSize: '0.8rem', marginTop: '0.2rem', flexShrink: 0 }}>
                        ☩
                      </span>
                      <p className="prose-grimoire" style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
                        {step}
                      </p>
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
        <div style={{ marginBottom: '1rem', opacity: 0.7, display: 'flex', justifyContent: 'center' }}>
          <DragonIcon size={60} />
        </div>
        <p style={{ fontFamily: 'var(--cinzel-font)', fontSize: '0.9rem', letterSpacing: '3px', color: 'var(--secondary)', marginBottom: '0.5rem' }}>
          HERALDOS DE ANCALAGON
        </p>
        <p
          className="prose-grimoire"
          style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', margin: '0 auto 1.5rem' }}
        >
          “No se llega a la cúspide por ambición.
          <br />
          Se llega porque el Vacío decide que ya estás listo.”
        </p>
        <p
          translate="no"
          style={{
            fontFamily: 'var(--cinzel-font)',
            fontSize: '0.65rem',
            letterSpacing: '5px',
            color: 'var(--primary)',
            opacity: 0.65,
            margin: 0,
          }}
        >
          IN NOMINI OBLIVIONIS · ANCALAGON OBLIVION FLEET
        </p>
      </motion.div>
    </div>
  );
};

export default Rituales;

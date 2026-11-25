import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Rocket, Crosshair, Box, Layers, ScrollText } from 'lucide-react';
import DualLabel from '../components/DualLabel';
import { TERMINOLOGY } from '../constants/terminology';

const CODEX_SECTIONS = [
  {
    entry: TERMINOLOGY.mandatos,
    icon: ScrollText,
    color: 'var(--primary)',
  },
  {
    entry: TERMINOLOGY.ofrendas,
    icon: Box,
    color: 'var(--accent-rsi)',
  },
  {
    entry: TERMINOLOGY.tecnomilagros,
    icon: BookOpen,
    color: 'var(--secondary)',
  },
  {
    entry: TERMINOLOGY.arcasEstelares,
    icon: Rocket,
    color: 'var(--status-warn)',
  },
  {
    entry: TERMINOLOGY.armamentos,
    icon: Crosshair,
    color: 'var(--status-danger)',
  },
  {
    entry: TERMINOLOGY.modulos,
    icon: Layers,
    color: 'var(--accent-rsi)',
  },
] as const;

const CodexIndex: React.FC = () => {
  useEffect(() => {
    document.title = 'Star Grimoire | El Códice';
  }, []);

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', fontFamily: 'var(--cinzel-font)' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '1rem' }}>
        <DualLabel
          sacred={TERMINOLOGY.codice.sacred}
          tactical={TERMINOLOGY.codice.tactical}
          size="lg"
          align="center"
          sacredColor="var(--secondary)"
        />
      </h1>
      <p
        className="prose-grimoire"
        style={{
          textAlign: 'center',
          color: 'var(--text-muted)',
          margin: '0 auto 3.5rem',
          fontSize: '1.1rem',
          fontFamily: 'var(--body-font)',
        }}
      >
        El Gran Compendio de la Creación. Todo lo material, bélico y conceptual documentado para los Iniciados de la Flota.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '2rem' }}>
        {CODEX_SECTIONS.map(({ entry, icon: Icon, color }) => (
          <Link
            key={entry.path}
            to={entry.path}
            className="surface-interactive hover-primary"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '2rem',
              textDecoration: 'none',
              color: 'var(--text-main)',
            }}
          >
            <Icon size={48} aria-hidden="true" style={{ color, marginBottom: '1rem' }} />
            <h2 style={{ fontSize: '1.35rem', margin: 0, textAlign: 'center' }}>
              <DualLabel
                sacred={entry.sacred}
                tactical={entry.tactical}
                size="md"
                align="center"
              />
            </h2>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default CodexIndex;

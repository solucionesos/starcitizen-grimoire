import React, { useEffect, useId } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { Book, Sparkles, Scroll } from 'lucide-react';
import { TERMINOLOGY } from '../constants/terminology';
import DualLabel from '../components/DualLabel';
import Lore from './Lore';
import Rituales from './Rituales';

type DivinitatusTab = 'cronicas' | 'rituales';

function parseTab(raw: string | null): DivinitatusTab {
  if (raw === 'rituales') return 'rituales';
  return 'cronicas';
}

const LectitioDivinitatus: React.FC = () => {
  const tabIdPrefix = useId();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = parseTab(searchParams.get('tab'));

  useEffect(() => {
    document.title = 'Star Grimoire | Lectitio Divinitatus';
  }, []);

  const handleSelectTab = (tab: DivinitatusTab) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    if (tab === 'rituales') {
      next.delete('subtab');
    }
    setSearchParams(next, { replace: true });
  };

  const tabs: Array<{
    id: DivinitatusTab;
    sacred: string;
    tactical: string;
    icon: React.ComponentType<{ size?: number; 'aria-hidden'?: boolean; style?: React.CSSProperties }>;
    color: string;
  }> = [
    {
      id: 'cronicas',
      sacred: TERMINOLOGY.cronicas.sacred,
      tactical: TERMINOLOGY.cronicas.tactical,
      icon: Scroll,
      color: 'var(--secondary)',
    },
    {
      id: 'rituales',
      sacred: TERMINOLOGY.rituales.sacred,
      tactical: TERMINOLOGY.rituales.tactical,
      icon: Sparkles,
      color: 'var(--primary)',
    },
  ];

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '4rem' }}>
      {/* ── HEADER ── */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          textAlign: 'center',
          padding: '3rem 1rem',
          background: 'linear-gradient(180deg, rgba(212,175,55,0.08) 0%, transparent 100%)',
          borderBottom: '1px solid rgba(212,175,55,0.1)',
          marginBottom: '2rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <Book size={30} aria-hidden="true" style={{ color: 'var(--secondary)', filter: 'drop-shadow(0 0 10px rgba(212,175,55,0.5))' }} />
          <h1 style={{ margin: 0 }}>
            <DualLabel
              sacred={TERMINOLOGY.divinitatus.sacred}
              tactical={TERMINOLOGY.divinitatus.tactical}
              size="lg"
              align="center"
              sacredColor="var(--secondary)"
            />
          </h1>
          <Book size={30} aria-hidden="true" style={{ color: 'var(--secondary)', filter: 'drop-shadow(0 0 10px rgba(212,175,55,0.5))', transform: 'scaleX(-1)' }} />
        </div>
        <p
          className="prose-grimoire"
          style={{
            fontFamily: 'var(--cinzel-font)',
            fontSize: '0.82rem',
            letterSpacing: '3px',
            color: 'var(--text-muted)',
            margin: '0 auto',
          }}
        >
          EL LIBRO DE LA PALABRA DE ANCALAGON. CRÓNICAS DEL VACÍO Y SENDA DEL ASCENSO.
        </p>
      </motion.div>

      {/* ── TABS ── */}
      <div
        role="tablist"
        aria-label="Secciones de Lectitio Divinitatus"
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
          marginBottom: '3rem',
          position: 'sticky',
          top: '5rem',
          zIndex: 50,
          padding: '0.5rem',
          background: 'rgba(10,5,5,0.88)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              id={`${tabIdPrefix}-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={isActive ? `${tabIdPrefix}-panel-${tab.id}` : undefined}
              onClick={() => handleSelectTab(tab.id)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.8rem 1.6rem',
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.8rem',
                transition: 'color 0.2s ease, opacity 0.2s ease',
              }}
            >
              <Icon size={18} aria-hidden={true} style={{ color: isActive ? tab.color : 'var(--text-muted)' }} />
              <DualLabel
                sacred={tab.sacred}
                tactical={tab.tactical}
                size="sm"
                sacredColor={isActive ? 'var(--text-main)' : 'var(--text-muted)'}
              />
              {isActive && (
                <motion.div
                  layoutId="activeTabDivinitatus"
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '2px',
                    background: tab.color,
                    boxShadow: `0 0 10px ${tab.color}`,
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ── CONTENT ── */}
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {activeTab === 'cronicas' ? (
          <motion.div
            key="cronicas"
            id={`${tabIdPrefix}-panel-cronicas`}
            role="tabpanel"
            aria-labelledby={`${tabIdPrefix}-tab-cronicas`}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25 }}
          >
            <Lore embedded />
          </motion.div>
        ) : (
          <motion.div
            key="rituales"
            id={`${tabIdPrefix}-panel-rituales`}
            role="tabpanel"
            aria-labelledby={`${tabIdPrefix}-tab-rituales`}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25 }}
          >
            <Rituales />
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default LectitioDivinitatus;

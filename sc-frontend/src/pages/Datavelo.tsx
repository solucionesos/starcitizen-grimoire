import React, { useEffect, useId } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { Shield, Database, Lock, ShoppingCart, Radio, TrendingUp } from 'lucide-react';
import { TERMINOLOGY } from '../constants/terminology';
import DualLabel from '../components/DualLabel';
import Wikelo from './Wikelo';
import Bovedas from './Bovedas';
import Comunicaciones from './Comunicaciones';
import RutasComerciales from './RutasComerciales';

type DataveloTab = 'bovedas' | 'wikelo' | 'comunicaciones' | 'comercio';

function parseTab(raw: string | null): DataveloTab {
  if (raw === 'wikelo' || raw === 'comunicaciones' || raw === 'comercio') return raw;
  return 'bovedas';
}

const Datavelo: React.FC = () => {
  const tabIdPrefix = useId();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = parseTab(searchParams.get('tab'));

  useEffect(() => {
    document.title = 'Star Grimoire | DATAVELO';
  }, []);

  const handleSelectTab = (tab: DataveloTab) => {
    const next = new URLSearchParams();
    next.set('tab', tab);
    setSearchParams(next, { replace: true });
  };

  const tabs: Array<{
    id: DataveloTab;
    sacred: string;
    tactical: string;
    icon: React.ComponentType<{ size?: number; 'aria-hidden'?: boolean; style?: React.CSSProperties }>;
    color: string;
  }> = [
    {
      id: 'bovedas',
      sacred: TERMINOLOGY.bovedas.sacred,
      tactical: TERMINOLOGY.bovedas.tactical,
      icon: Lock,
      color: 'var(--accent-silver)',
    },
    {
      id: 'wikelo',
      sacred: TERMINOLOGY.wikelo.sacred,
      tactical: TERMINOLOGY.wikelo.tactical,
      icon: ShoppingCart,
      color: 'var(--primary)',
    },
    {
      id: 'comunicaciones',
      sacred: TERMINOLOGY.comunicaciones.sacred,
      tactical: TERMINOLOGY.comunicaciones.tactical,
      icon: Radio,
      color: 'var(--accent-rsi)',
    },
    {
      id: 'comercio',
      sacred: TERMINOLOGY.comercio.sacred,
      tactical: TERMINOLOGY.comercio.tactical,
      icon: TrendingUp,
      color: 'var(--secondary)',
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
          background: 'linear-gradient(180deg, rgba(56, 189, 248, 0.08) 0%, transparent 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          marginBottom: '2rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <Database size={30} aria-hidden="true" style={{ color: 'var(--accent-silver)', filter: 'drop-shadow(0 0 10px rgba(148,163,184,0.5))' }} />
          <h1 style={{ margin: 0 }}>
            <DualLabel
              sacred={TERMINOLOGY.datavelo.sacred}
              tactical={TERMINOLOGY.datavelo.tactical}
              size="lg"
              align="center"
              sacredColor="var(--text-main)"
            />
          </h1>
          <Shield size={30} aria-hidden="true" style={{ color: 'var(--accent-silver)', filter: 'drop-shadow(0 0 10px rgba(148,163,184,0.5))' }} />
        </div>
        <p
          className="prose-grimoire"
          style={{
            fontFamily: 'var(--cinzel-font)',
            fontSize: '0.8rem',
            letterSpacing: '3px',
            color: 'var(--text-muted)',
            margin: '0 auto',
          }}
        >
          NEXO DE SINCRONIZACIÓN Y MERCADO CLANDESTINO. ACCESO OPERATIVO DE LA FLOTA.
        </p>
      </motion.div>

      {/* ── TABS ── */}
      <div
        role="tablist"
        aria-label="Módulos de Datavelo"
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '0.8rem',
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
                padding: '0.75rem 1.35rem',
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.75rem',
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
                  layoutId="activeTabData"
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
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {activeTab === 'bovedas' && (
          <motion.div
            key="bovedas"
            id={`${tabIdPrefix}-panel-bovedas`}
            role="tabpanel"
            aria-labelledby={`${tabIdPrefix}-tab-bovedas`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <Bovedas embedded />
          </motion.div>
        )}
        {activeTab === 'wikelo' && (
          <motion.div
            key="wikelo"
            id={`${tabIdPrefix}-panel-wikelo`}
            role="tabpanel"
            aria-labelledby={`${tabIdPrefix}-tab-wikelo`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <Wikelo embedded />
          </motion.div>
        )}
        {activeTab === 'comunicaciones' && (
          <motion.div
            key="comunicaciones"
            id={`${tabIdPrefix}-panel-comunicaciones`}
            role="tabpanel"
            aria-labelledby={`${tabIdPrefix}-tab-comunicaciones`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <Comunicaciones embedded />
          </motion.div>
        )}
        {activeTab === 'comercio' && (
          <motion.div
            key="comercio"
            id={`${tabIdPrefix}-panel-comercio`}
            role="tabpanel"
            aria-labelledby={`${tabIdPrefix}-tab-comercio`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <RutasComerciales embedded />
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Datavelo;

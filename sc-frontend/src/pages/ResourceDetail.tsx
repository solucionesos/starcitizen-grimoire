import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getResources, getBlueprints } from '../api/client';
import { ArrowLeft, Database, Map as MapIcon, ShoppingCart, Zap } from 'lucide-react';
import DualLabel from '../components/DualLabel';
import { TERMINOLOGY } from '../constants/terminology';
import type { Blueprint, Resource } from '../types';

const ResourceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [resources, setResources] = useState<Resource[]>([]);
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const numberFormatter = useMemo(() => new Intl.NumberFormat('es-ES'), []);

  useEffect(() => {
    Promise.all([getResources(), getBlueprints()])
      .then(([resData, bpData]) => {
        const list = Array.isArray(resData) ? resData : [];
        const bList = Array.isArray(bpData) ? bpData : bpData.blueprints || [];
        setResources(list);
        setBlueprints(bList);
      })
      .catch((err) => {
        console.error('Error fetching resource detail:', err);
        setError('No se pudo conectar con el banco de datos.');
      })
      .finally(() => setLoading(false));
  }, []);

  const resource = useMemo(() => resources.find((r) => r.id === id), [resources, id]);

  useEffect(() => {
    document.title = resource
      ? `Star Grimoire | ${resource.name} · Ofrenda`
      : 'Star Grimoire | Ofrenda del Vacío';
  }, [resource]);

  const resourceBlueprints = useMemo(() => {
    if (!resource) return [];
    const normalizedResourceName = resource.name.toLowerCase();
    return blueprints.filter((b) =>
      b.parts?.some((m) => {
        const partName = (m.label || m.name || '').toLowerCase();
        return (
          normalizedResourceName.includes(partName) ||
          partName.includes(normalizedResourceName) ||
          m.resourceId === resource.id
        );
      }),
    );
  }, [blueprints, resource]);

  if (loading) {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{ textAlign: 'center', padding: '5rem', fontFamily: 'var(--cinzel-font)', fontSize: '1.6rem', color: 'var(--secondary)' }}
      >
        CONSULTANDO ALMAS DE OFRENDAS…
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" style={{ textAlign: 'center', padding: '5rem', color: 'var(--status-danger)' }}>
        {error}
      </div>
    );
  }

  if (!resource) {
    return <div style={{ textAlign: 'center', padding: '5rem' }}>OFRENDA NO ENCONTRADA EN EL ARCHIVO</div>;
  }

  const clusters = [1, 2, 3, 4, 5, 6, 12, 24];
  const allLocations = resource.locationsDetail || [];

  return (
    <div style={{ padding: '0 2rem' }}>
      <Link
        to="/codice/ofrendas"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', textDecoration: 'none', marginBottom: '2rem' }}
      >
        <ArrowLeft size={16} aria-hidden="true" /> REGRESAR A LA CARTOGRAFÍA <span aria-hidden="true">☩</span>
      </Link>

      <div className="responsive-grid-2">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <div className="surface-monolith" style={{ position: 'sticky', top: '6rem' }}>
            <h1 style={{ margin: '0 0 1rem' }}>
              <DualLabel
                sacred={resource.name}
                tactical={`${TERMINOLOGY.ofrendas.sacred} · ${resource.type?.toUpperCase() || 'RECURSO'}`}
                size="lg"
                sacredColor="var(--secondary)"
              />
            </h1>
            <span
              style={{
                fontSize: '0.8rem',
                background: 'rgba(255, 62, 62, 0.1)',
                color: 'var(--primary)',
                padding: '0.3rem 0.8rem',
                borderRadius: '4px',
                border: '1px solid currentColor',
                display: 'inline-block',
              }}
            >
              MÉTODO: {resource.type?.toUpperCase()}
            </span>

            <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px' }}>
                <Database className="accent-amber" size={24} aria-hidden="true" />
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>EMISIÓN BASE</div>
                  <div className="tabular-nums" style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                    {numberFormatter.format(resource.baseEmission || 4000)} sc
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px' }}>
                <Zap className="accent-rsi" size={24} aria-hidden="true" />
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>RAREZA ESTIMADA</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                    {resource.rarity?.toUpperCase() || 'COMMON'}
                  </div>
                </div>
              </div>
            </div>

            {resource.description_lore && (
              <p
                className="prose-grimoire"
                style={{
                  marginTop: '2rem',
                  padding: '1rem',
                  background: 'rgba(0,0,0,0.3)',
                  borderLeft: '4px solid var(--secondary)',
                  fontStyle: 'italic',
                  color: 'var(--text-muted)',
                }}
              >
                “{resource.description_lore}”
              </p>
            )}

            {resource.uex_prices && resource.uex_prices.length > 0 && (
              <div style={{ marginTop: '2rem' }}>
                <h2 className="accent-amber" style={{ fontSize: '0.9rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShoppingCart size={16} aria-hidden="true" /> PUNTOS DE VENTA (UEX)
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {resource.uex_prices.map((p, idx) => (
                    <div
                      key={`${p.terminal_name}-${idx}`}
                      style={{
                        background: 'rgba(0,0,0,0.2)',
                        padding: '0.8rem',
                        borderRadius: '6px',
                        border: '1px solid rgba(255,255,255,0.05)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '0.75rem',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{p.terminal_name}</div>
                        {p.starmap_location && (
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                            {p.starmap_location.star_system_name} - {p.starmap_location.name}
                          </div>
                        )}
                      </div>
                      <div className="accent-rsi tabular-nums" style={{ fontWeight: 'bold', flexShrink: 0 }}>
                        {p.price_buy !== null ? `${numberFormatter.format(p.price_buy)} aUEC` : 'N/A'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginTop: '2rem' }}>
              <h2 className="accent-amber" style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
                TABLA DE SEÑALES (POR CLÚSTER):
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                {clusters.map((c) => (
                  <div
                    key={c}
                    style={{
                      background: 'rgba(0,0,0,0.2)',
                      padding: '0.5rem',
                      borderRadius: '6px',
                      textAlign: 'center',
                      border: '1px solid rgba(255,255,255,0.05)',
                    }}
                  >
                    <div className="tabular-nums" style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                      ×{c} NODOS
                    </div>
                    <div className="accent-amber tabular-nums" style={{ fontWeight: 'bold' }}>
                      {numberFormatter.format((resource.baseEmission || 4000) * c)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {resourceBlueprints.length > 0 && (
            <div className="surface-monolith">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.5rem', color: 'var(--secondary)' }}>
                <Zap className="accent-gold" size={28} aria-hidden="true" />
                <span>
                  TECNOMILAGROS <span className="tabular-nums">({resourceBlueprints.length})</span>
                </span>
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {resourceBlueprints.map((bp) => (
                  <Link
                    key={bp.id}
                    to={`/codice/tecnomilagros?id=${bp.id}`}
                    className="surface-interactive hover-glow"
                    style={{
                      padding: '1rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderLeft: '4px solid var(--primary)',
                      textDecoration: 'none',
                      color: 'inherit',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{bp.name || bp.label}</div>
                      <span style={{ fontSize: '0.65rem', opacity: 0.75, background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.45rem', borderRadius: '4px' }}>
                        IR AL RITO →
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="surface-monolith">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '2rem', color: 'var(--secondary)' }}>
              <MapIcon className="accent-gold" size={28} aria-hidden="true" />
              <span>
                LOCALIZACIONES SAGRADAS <span className="tabular-nums">({allLocations.length})</span>
              </span>
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {allLocations.map((loc, idx) => (
                <Link
                  key={`${loc.system}-${loc.name}-${idx}`}
                  to={`/locacion/${loc.system}/${loc.name}`}
                  className="surface-interactive cv-auto hover-glow"
                  style={{
                    padding: '1rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderLeft: '4px solid var(--primary)',
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--primary)', marginBottom: '0.2rem' }}>{loc.system}</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{loc.name}</div>
                    <span style={{ fontSize: '0.65rem', opacity: 0.75, background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.45rem', borderRadius: '4px' }}>
                      {loc.type?.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>CLUMPING</div>
                    <div className="accent-amber tabular-nums" style={{ fontWeight: 'bold' }}>
                      {loc.clustering || '1 item'}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ResourceDetail;

import React, { useEffect, useId, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Compass, Cpu, MapPin, Search, Shield, Thermometer, Zap } from 'lucide-react';
import { getComponents } from '../api/client';
import type { VehicleComponent } from '../types';
import DualLabel from '../components/DualLabel';
import Pagination from '../components/Pagination';
import { TERMINOLOGY } from '../constants/terminology';

const CodexComponents: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const baseId = useId();
  const searchInputId = `${baseId}-search`;
  const typeSelectId = `${baseId}-type`;
  const sizeSelectId = `${baseId}-size`;
  const classSelectId = `${baseId}-class`;

  const [components, setComponents] = useState<VehicleComponent[]>([]);
  const [loading, setLoading] = useState(true);

  const itemsPerPage = 24;
  const search = searchParams.get('search') ?? '';
  const typeFilter = searchParams.get('type') ?? 'ALL';
  const sizeFilter = searchParams.get('size') ?? 'ALL';
  const classFilter = searchParams.get('class') ?? 'ALL';
  const rawPage = Number.parseInt(searchParams.get('page') ?? '1', 10);
  const requestedPage = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  const numberFormatter = useMemo(() => new Intl.NumberFormat('es-ES'), []);

  useEffect(() => {
    document.title = 'Star Grimoire | Módulos y Artefactos del Vacío';
    getComponents()
      .then((data) => {
        setComponents(Array.isArray(data) ? data : []);
      })
      .catch((err) => console.error('Error cargando Artefactos del Vacío:', err))
      .finally(() => setLoading(false));
  }, []);

  const updateParams = (
    updates: Record<string, string | null>,
    options: { resetPage?: boolean; replace?: boolean } = {},
  ) => {
    const { resetPage = true, replace = false } = options;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(updates)) {
          if (value === null || value === '' || value === 'ALL') {
            next.delete(key);
          } else {
            next.set(key, value);
          }
        }
        if (resetPage) {
          next.delete('page');
        }
        return next;
      },
      { replace },
    );
  };

  const availableTypes = useMemo(() => {
    const s = new Set<string>();
    components.forEach((c) => {
      if (c.type) s.add(c.type);
    });
    return Array.from(s).sort();
  }, [components]);

  const availableClasses = useMemo(() => {
    const s = new Set<string>();
    components.forEach((c) => {
      if (c.class) s.add(c.class);
    });
    return Array.from(s).sort();
  }, [components]);

  const filtered = useMemo(() => {
    return components.filter((c) => {
      if (typeFilter !== 'ALL' && c.type !== typeFilter) return false;
      if (sizeFilter !== 'ALL' && String(c.size) !== sizeFilter) return false;
      if (classFilter !== 'ALL' && c.class !== classFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          Boolean(c.manufacturer && c.manufacturer.toLowerCase().includes(q)) ||
          Boolean(c.type && c.type.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [components, typeFilter, sizeFilter, classFilter, search]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const currentPage = totalPages > 0 ? Math.min(requestedPage, totalPages) : 1;

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  const getTypeIcon = (type: string) => {
    const t = (type || '').toLowerCase();
    if (t.includes('shield')) return <Shield size={16} aria-hidden="true" color="var(--secondary)" />;
    if (t.includes('quantum')) return <Compass size={16} aria-hidden="true" color="var(--accent-conclave)" />;
    if (t.includes('power')) return <Zap size={16} aria-hidden="true" color="var(--primary)" />;
    if (t.includes('cool')) return <Thermometer size={16} aria-hidden="true" color="var(--accent-rsi)" />;
    return <Cpu size={16} aria-hidden="true" color="var(--secondary)" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ padding: '0 2rem 4rem', maxWidth: '1300px', margin: '0 auto' }}
    >
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <Cpu
          size={44}
          aria-hidden="true"
          color="var(--secondary)"
          style={{ marginBottom: '0.8rem', filter: 'drop-shadow(0 0 15px rgba(212,175,55,0.4))' }}
        />
        <h1 style={{ margin: '0 0 0.75rem 0' }}>
          <DualLabel
            sacred={TERMINOLOGY.modulos.sacred}
            tactical={TERMINOLOGY.modulos.tactical}
            size="lg"
            align="center"
            sacredColor="var(--secondary)"
          />
        </h1>
        <p className="prose-grimoire" style={{ color: 'var(--text-muted)', fontSize: '0.98rem', margin: '0 auto' }}>
          Catálogo sagrado de núcleos cuánticos, generadores de escudo, plantas de poder y disipadores térmicos para
          armar los navíos de <strong>Ancalagon Oblivion Fleet</strong> en el Ciclo 2956.
        </p>
      </div>

      {/* Filters */}
      <div
        className="surface-monolith"
        style={{
          padding: '1.2rem 1.5rem',
          marginBottom: '2rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          alignItems: 'center',
        }}
      >
        <div style={{ position: 'relative' }}>
          <label htmlFor={searchInputId} className="sr-only">
            Buscar módulo, artefacto o fabricante
          </label>
          <Search
            size={16}
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              pointerEvents: 'none',
            }}
          />
          <input
            id={searchInputId}
            name="component-search"
            type="text"
            autoComplete="off"
            className="search-input"
            placeholder="Buscar artefacto o fabricante…"
            value={search}
            onChange={(e) => updateParams({ search: e.target.value || null }, { replace: true })}
            style={{ width: '100%', paddingLeft: '2.2rem' }}
          />
        </div>

        <div>
          <label htmlFor={typeSelectId} className="sr-only">
            Filtrar por tipo de componente
          </label>
          <select
            id={typeSelectId}
            name="component-type"
            className="select-filter"
            value={typeFilter}
            onChange={(e) => updateParams({ type: e.target.value })}
          >
            <option value="ALL">Todos los Sistemas ({components.length})</option>
            {availableTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor={sizeSelectId} className="sr-only">
            Filtrar por tamaño de componente
          </label>
          <select
            id={sizeSelectId}
            name="component-size"
            className="select-filter"
            value={sizeFilter}
            onChange={(e) => updateParams({ size: e.target.value })}
          >
            <option value="ALL">Todos los Tamaños (S0 - S4)</option>
            {[0, 1, 2, 3, 4].map((sz) => (
              <option key={sz} value={String(sz)}>
                Tamaño S{sz}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor={classSelectId} className="sr-only">
            Filtrar por doctrina o clase
          </label>
          <select
            id={classSelectId}
            name="component-class"
            className="select-filter"
            value={classFilter}
            onChange={(e) => updateParams({ class: e.target.value })}
          >
            <option value="ALL">Todas las Doctrinas (Clases)</option>
            {availableClasses.map((cl) => (
              <option key={cl} value={cl}>
                {cl}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div
          role="status"
          aria-live="polite"
          style={{ textAlign: 'center', padding: '4rem', color: 'var(--secondary)', fontFamily: 'var(--cinzel-font)' }}
        >
          DESENCRIPTANDO REGISTROS DE INGENIERÍA ABISAL…
        </div>
      ) : filtered.length === 0 ? (
        <div className="surface-monolith" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <p style={{ marginBottom: '1rem' }}>No se hallaron artefactos con los parámetros seleccionados.</p>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => updateParams({ search: null, type: null, size: null, class: null })}
          >
            LIMPIAR FILTROS
          </button>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '1.2rem' }}>
            {paginated.map((comp) => {
              const bestPrice = comp.uex_prices?.find((p) => p.price_buy && p.price_buy > 0);
              return (
                <div
                  key={comp.id}
                  className="surface-monolith cv-auto"
                  style={{
                    padding: '1.4rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '0.8rem',
                    borderTop: '2px solid rgba(212, 175, 55, 0.35)',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          fontSize: '0.7rem',
                          fontFamily: 'var(--cinzel-font)',
                          color: 'var(--secondary)',
                          textTransform: 'uppercase',
                        }}
                      >
                        {getTypeIcon(comp.type)} {comp.type}
                      </span>
                      <span
                        className="tabular-nums"
                        style={{
                          fontSize: '0.7rem',
                          padding: '0.15rem 0.5rem',
                          background: 'rgba(196, 30, 58, 0.18)',
                          color: 'var(--primary)',
                          border: '1px solid rgba(196, 30, 58, 0.4)',
                          borderRadius: '3px',
                          fontFamily: 'var(--cinzel-font)',
                          fontWeight: 'bold',
                        }}
                      >
                        S{comp.size} {comp.grade ? `· GRADO ${comp.grade}` : ''}
                      </span>
                    </div>

                    <h2 style={{ margin: '0 0 0.3rem', fontFamily: 'var(--cinzel-font)', fontSize: '1.08rem', color: 'var(--text-main)' }}>
                      {comp.name}
                    </h2>

                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
                      Forja: <strong style={{ color: 'var(--accent-silver)' }}>{comp.manufacturer || 'Desconocido'}</strong>
                      {comp.class && (
                        <>
                          {' '}
                          · Doctrina: <strong style={{ color: 'var(--secondary)' }}>{comp.class}</strong>
                        </>
                      )}
                    </div>

                    {comp.description_lore && (
                      <p
                        style={{
                          fontSize: '0.8rem',
                          color: 'var(--text-muted)',
                          lineHeight: 1.5,
                          margin: 0,
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {comp.description_lore}
                      </p>
                    )}
                  </div>

                  {bestPrice && (
                    <div
                      style={{
                        paddingTop: '0.7rem',
                        borderTop: '1px solid rgba(255,255,255,0.06)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.75rem',
                      }}
                    >
                      <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <MapPin size={12} aria-hidden="true" color="var(--secondary)" />
                        {bestPrice.terminal_name}
                      </span>
                      <strong className="tabular-nums" style={{ color: 'var(--secondary)', fontFamily: 'var(--cinzel-font)' }}>
                        {bestPrice.price_buy !== null ? `${numberFormatter.format(bestPrice.price_buy)} aUEC` : 'N/A'}
                      </strong>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <nav aria-label="Paginación de Módulos">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(page) =>
                updateParams({ page: page > 1 ? String(page) : null }, { resetPage: false })
              }
            />
          </nav>
        </>
      )}
    </motion.div>
  );
};

export default CodexComponents;

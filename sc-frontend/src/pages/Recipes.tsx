import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getBlueprints, getMissions } from '../api/client';
import Pagination from '../components/Pagination';
import DualLabel from '../components/DualLabel';
import { TERMINOLOGY } from '../constants/terminology';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Check, ChevronDown, Filter, Flame, Package, Search, Tag, Target } from 'lucide-react';
import { useAltar } from '../context/useAltar';
import type { Blueprint, Mission } from '../types';

const Recipes: React.FC = () => {
  const navigate = useNavigate();
  const { addToAltar } = useAltar();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchInputId = useId();

  const [recipes, setRecipes] = useState<Blueprint[]>([]);
  const [allMissions, setAllMissions] = useState<Record<string, Mission>>({});
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [consecratedIds, setConsecratedIds] = useState<Record<string, boolean>>({});
  const [liveFeedback, setLiveFeedback] = useState('');
  const timersRef = useRef<Record<string, number>>({});

  const itemsPerPage = 9;
  const activeId = searchParams.get('id');
  const searchTerm = searchParams.get('search') ?? '';
  const selectedType = searchParams.get('type') || null;
  const rawPage = Number.parseInt(searchParams.get('page') ?? '1', 10);
  const requestedPage = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  useEffect(() => {
    document.title = 'Star Grimoire | Tecnomilagros';
  }, []);

  useEffect(() => {
    Promise.all([getBlueprints(), getMissions()])
      .then(([bpsData, msData]) => {
        const list = Array.isArray(bpsData) ? bpsData : bpsData.blueprints || [];
        setRecipes(list);

        const mDict: Record<string, Mission> = {};
        msData.forEach((m) => {
          mDict[m.id] = m;
        });
        setAllMissions(mDict);
      })
      .catch((err) => console.error('Error loading recipes/missions:', err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      Object.values(timers).forEach((timerId) => window.clearTimeout(timerId));
    };
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
          if (value === null || value === '') {
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

  const types = useMemo(() => {
    return [...new Set(recipes.map((r) => r.type).filter((t): t is string => Boolean(t)))].sort();
  }, [recipes]);

  const filteredRecipes = useMemo(() => {
    let rs = recipes;

    if (activeId) {
      rs = rs.filter((r) => r.id === activeId);
    }

    if (selectedType) {
      rs = rs.filter((r) => r.type === selectedType);
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      rs = rs.filter((r) => (r.name || r.label || '').toLowerCase().includes(q));
    }
    return rs;
  }, [recipes, searchTerm, selectedType, activeId]);

  const totalPages = Math.ceil(filteredRecipes.length / itemsPerPage);
  const currentPage = totalPages > 0 ? Math.min(requestedPage, totalPages) : 1;

  const paginatedRecipes = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRecipes.slice(start, start + itemsPerPage);
  }, [filteredRecipes, currentPage]);

  const handleConsecrate = (recipe: Blueprint) => {
    addToAltar(recipe);
    const displayName = recipe.name || recipe.label || 'Tecnomilagro';
    setLiveFeedback(`${displayName} consagrado en el Altar de Forja.`);
    setConsecratedIds((prev) => ({ ...prev, [recipe.id]: true }));
    if (timersRef.current[recipe.id]) {
      window.clearTimeout(timersRef.current[recipe.id]);
    }
    timersRef.current[recipe.id] = window.setTimeout(() => {
      setConsecratedIds((prev) => ({ ...prev, [recipe.id]: false }));
    }, 1800);
  };

  if (loading) {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{ textAlign: 'center', padding: '5rem', fontFamily: 'var(--cinzel-font)', fontSize: '1.6rem', color: 'var(--secondary)' }}
      >
        CONSULTANDO REGISTROS DEL VACÍO…
      </div>
    );
  }

  return (
    <div style={{ padding: '0 2rem' }}>
      <span className="sr-only" aria-live="polite">
        {liveFeedback}
      </span>

      <h1 style={{ marginBottom: '1rem' }}>
        <DualLabel
          sacred="Archivo de Tecnomilagros"
          tactical={TERMINOLOGY.tecnomilagros.tactical}
          size="lg"
          sacredColor="var(--secondary)"
        />
      </h1>

      <div className="surface-monolith" style={{ marginBottom: '2rem', padding: '1rem 2rem' }}>
        <div className="search-container" style={{ margin: '0 0 1.5rem 0', width: '100%' }}>
          <label htmlFor={searchInputId} className="sr-only">
            Buscar tecnomilagro o blueprint
          </label>
          <div style={{ position: 'relative', maxWidth: '450px' }}>
            <Search
              size={16}
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: '0.9rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
                pointerEvents: 'none',
              }}
            />
            <input
              id={searchInputId}
              name="blueprint-search"
              type="text"
              autoComplete="off"
              className="search-input"
              style={{ paddingLeft: '2.5rem' }}
              placeholder="Buscar blueprint…"
              value={searchTerm}
              onChange={(e) => updateParams({ search: e.target.value || null }, { replace: true })}
            />
          </div>
        </div>

        <button
          type="button"
          aria-expanded={showFilters}
          aria-controls="recipes-filters-panel"
          onClick={() => setShowFilters(!showFilters)}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            width: '100%',
            background: 'none',
            border: 'none',
            color: 'var(--text-main)',
            alignItems: 'center',
            cursor: 'pointer',
            fontFamily: 'var(--cinzel-font)',
            letterSpacing: '2px',
            fontSize: '1rem',
            fontWeight: 'bold',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <Filter size={18} aria-hidden="true" className="accent-gold" /> MÁS FILTROS
          </span>
          <motion.div animate={{ rotate: showFilters ? 180 : 0 }}>
            <ChevronDown size={20} aria-hidden="true" />
          </motion.div>
        </button>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              id="recipes-filters-panel"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ paddingTop: '1.5rem', borderTop: '1px solid rgba(212,175,55,0.15)', marginTop: '1rem' }}>
                <div className="controls-container" style={{ margin: 0 }}>
                  <div className="filter-group">
                    <span className="filter-label">
                      <Tag size={14} aria-hidden="true" /> TIPO:
                    </span>
                    <button
                      type="button"
                      aria-pressed={selectedType === null}
                      className={`filter-btn ${selectedType === null ? 'active' : ''}`}
                      onClick={() => updateParams({ type: null })}
                    >
                      TODOS
                    </button>
                    {types.map((type) => (
                      <button
                        key={type}
                        type="button"
                        aria-pressed={selectedType === type}
                        className={`filter-btn ${selectedType === type ? 'active' : ''}`}
                        onClick={() => updateParams({ type })}
                      >
                        {type.toUpperCase()}
                      </button>
                    ))}
                  </div>
                  {activeId && (
                    <div>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ fontSize: '0.75rem', padding: '0.45rem 0.9rem' }}
                        onClick={() => updateParams({ id: null })}
                      >
                        DISOLVER EDICTO
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {filteredRecipes.length === 0 ? (
        <div
          className="surface-monolith"
          style={{ textAlign: 'center', padding: '3rem 2rem', marginBottom: '3rem' }}
        >
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Ningún tecnomilagro coincide con los filtros actuales.
          </p>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => updateParams({ search: null, type: null, id: null })}
          >
            LIMPIAR FILTROS
          </button>
        </div>
      ) : (
        <div className="grid-layout">
          {paginatedRecipes.map((recipe, idx) => {
            const displayName = recipe.name || recipe.label || 'Tecnomilagro';
            const isConsecrated = Boolean(consecratedIds[recipe.id]);

            return (
              <motion.div
                key={recipe.id || idx}
                className="surface-monolith cv-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (idx % itemsPerPage) * 0.05 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <h2 className="accent-rsi" style={{ margin: 0, fontSize: '1.15rem', letterSpacing: '1.5px' }}>
                    {displayName}
                  </h2>
                  {recipe.type && (
                    <span
                      style={{
                        fontSize: '0.65rem',
                        background: 'rgba(255, 62, 62, 0.1)',
                        color: 'var(--primary)',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        flexShrink: 0,
                      }}
                    >
                      {recipe.type.toUpperCase()}
                    </span>
                  )}
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.35rem' }}>
                  ID: {recipe.id}
                </p>
                <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '1rem 0' }} />

                <h3 style={{ fontSize: '0.85rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Package size={14} aria-hidden="true" />
                  <span>OFRENDAS AL VACÍO:</span>
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {recipe.parts?.map((part, pIdx) => {
                    const partTitle = part.label || part.name || 'Ofrenda';
                    const partHref = part.resourceId
                      ? `/recurso/${part.resourceId}`
                      : `/codice/ofrendas?tags=${encodeURIComponent(partTitle)}`;

                    return (
                      <Link
                        key={`${recipe.id}-${part.resourceId ?? partTitle}-${pIdx}`}
                        to={partHref}
                        state={part.resourceId ? { breadcrumbLabel: `OFRENDA: ${partTitle}` } : undefined}
                        title="Ver dónde obtener esta ofrenda"
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '0.9rem',
                          textDecoration: 'none',
                          color: 'inherit',
                          padding: '0.15rem 0',
                        }}
                      >
                        <span
                          style={{
                            color: part.resourceId ? 'var(--primary)' : 'var(--text-main)',
                            textDecoration: part.resourceId ? 'underline' : 'none',
                          }}
                        >
                          {partTitle}
                        </span>
                        <span className="accent-amber tabular-nums">x{part.amount}</span>
                      </Link>
                    );
                  })}
                </div>

                <div style={{ marginTop: '1.5rem' }}>
                  <h3
                    style={{
                      fontSize: '0.85rem',
                      marginBottom: '0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      color: 'var(--secondary)',
                    }}
                  >
                    <Target size={14} aria-hidden="true" className="accent-gold" />
                    <span>LETANÍA DE DESBLOQUEO (EDICTOS):</span>
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {recipe.missions && recipe.missions.length > 0 ? (
                      recipe.missions.map((m, mIdx) => {
                        const fullMission = allMissions[m.id];
                        const friendlyName =
                          fullMission?.friendly_name ||
                          fullMission?.name?.replaceAll('_', ' ') ||
                          m.name?.replaceAll('_', ' ') ||
                          'EDICTO';
                        return (
                          <button
                            key={`${m.id}-${mIdx}`}
                            type="button"
                            className="filter-btn"
                            onClick={() =>
                              navigate(`/codice/mandatos?id=${m.id}`, {
                                state: { breadcrumbLabel: `MANDATO: ${friendlyName}` },
                              })
                            }
                            style={{
                              fontSize: '0.65rem',
                              maxWidth: '100%',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              display: 'inline-block',
                              textAlign: 'left',
                            }}
                            title={friendlyName}
                          >
                            {friendlyName}
                          </button>
                        );
                      })
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Desbloqueo estándar / Loot</span>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="filter-btn"
                    style={{
                      padding: '0.75rem 1.2rem',
                      borderColor: isConsecrated ? 'var(--status-ok)' : 'var(--secondary)',
                      color: isConsecrated ? 'var(--status-ok)' : 'var(--secondary)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                    onClick={() => handleConsecrate(recipe)}
                    title="Añadir al Rito de Transmutación"
                  >
                    {isConsecrated ? (
                      <>
                        <Check size={16} aria-hidden="true" /> CONSAGRADO
                      </>
                    ) : (
                      <>
                        <Flame size={16} aria-hidden="true" /> CONSAGRAR
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => {
                      const tags = recipe.parts?.map((p) => encodeURIComponent(p.label || p.name || '')).join(',') ?? '';
                      navigate(`/codice/ofrendas?tags=${tags}`, {
                        state: { breadcrumbLabel: `REQ: ${displayName}` },
                      });
                    }}
                  >
                    EXPLORAR CARTOGRAFÍA
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <nav aria-label="Paginación de Tecnomilagros">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(page) => updateParams({ page: page > 1 ? String(page) : null }, { resetPage: false })}
        />
      </nav>
    </div>
  );
};

export default Recipes;

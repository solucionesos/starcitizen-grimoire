import React, { useEffect, useId, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getResources, getBlueprints } from '../api/client';
import { ChevronDown, Database, Filter, Globe, Map as MapIcon, MapPin, Pickaxe, Search, X } from 'lucide-react';
import Pagination from '../components/Pagination';
import DualLabel from '../components/DualLabel';
import { TERMINOLOGY } from '../constants/terminology';
import { useSearchParams, Link } from 'react-router-dom';
import type { Blueprint, Resource } from '../types';

const Resources: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const baseId = useId();
  const tagInputId = `${baseId}-tag-search`;
  const bodySelectId = `${baseId}-body-select`;

  const [resources, setResources] = useState<Resource[]>([]);
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const itemsPerPage = 9;
  const selectedSystem = searchParams.get('system') || null;
  const selectedMiningType = searchParams.get('mining') || null;
  const selectedLocType = searchParams.get('locType') || null;
  const selectedBody = searchParams.get('body') || null;
  const rawPage = Number.parseInt(searchParams.get('page') ?? '1', 10);
  const requestedPage = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  const searchTags = useMemo(() => {
    const t = searchParams.get('tags');
    return t ? t.split(',').filter(Boolean) : [];
  }, [searchParams]);

  const numberFormatter = useMemo(() => new Intl.NumberFormat('es-ES'), []);

  useEffect(() => {
    document.title = 'Star Grimoire | Ofrendas al Vacío';
  }, []);

  useEffect(() => {
    Promise.all([getResources(), getBlueprints()])
      .then(([resData, bpData]) => {
        const list = Array.isArray(resData) ? resData : [];
        const bList = Array.isArray(bpData) ? bpData : bpData.blueprints || [];
        setResources(list);
        setBlueprints(bList);
      })
      .finally(() => setLoading(false));
  }, []);

  const updateParams = (
    updates: Record<string, string | null>,
    options: { resetPage?: boolean; replace?: boolean } = {},
  ) => {
    const { resetPage = true, replace = true } = options;
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

  const setTags = (nextTags: string[]) => {
    updateParams({ tags: nextTags.length > 0 ? nextTags.join(',') : null });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = inputValue.trim().toLowerCase();
      if (val && !searchTags.includes(val)) {
        setTags([...searchTags, val]);
        setInputValue('');
      }
    } else if (e.key === 'Backspace' && !inputValue && searchTags.length > 0) {
      setTags(searchTags.slice(0, -1));
    }
  };

  const removeTag = (tag: string) => {
    setTags(searchTags.filter((t) => t !== tag));
  };

  const systems = useMemo(() => {
    const all = new Set<string>();
    resources.forEach((r) => {
      const parts = (r.parent || 'Stanton').split(' / ');
      parts.forEach((p) => all.add(p.trim()));
    });
    return Array.from(all).sort((a, b) => a.localeCompare(b));
  }, [resources]);

  const miningTypes = useMemo(() => {
    const all = new Set<string>();
    resources.forEach((r) => {
      if (r.type) {
        r.type.split(' / ').forEach((t) => all.add(t.trim()));
      }
    });
    return Array.from(all).sort((a, b) => a.localeCompare(b));
  }, [resources]);

  const locTypes = useMemo(() => {
    const all = new Set<string>();
    resources.forEach((r) => {
      r.locationsDetail?.forEach((l) => all.add(l.type));
    });
    return Array.from(all).sort((a, b) => a.localeCompare(b));
  }, [resources]);

  const bodies = useMemo(() => {
    const all = new Set<string>();
    resources.forEach((r) => {
      r.locations?.forEach((l) => {
        if (!selectedSystem || l.startsWith(selectedSystem)) {
          all.add(l);
        }
      });
    });
    return Array.from(all).sort((a, b) => a.localeCompare(b));
  }, [resources, selectedSystem]);

  const filteredResources = useMemo(() => {
    let rs = resources;
    if (selectedSystem) {
      rs = rs.filter((r) => (r.parent || 'Stanton').includes(selectedSystem));
    }
    if (selectedMiningType) {
      rs = rs.filter((r) => r.type?.includes(selectedMiningType));
    }
    if (selectedLocType) {
      rs = rs.filter((r) => r.locationsDetail?.some((l) => l.type === selectedLocType));
    }
    if (selectedBody) {
      rs = rs.filter((r) => r.locations?.includes(selectedBody));
    }
    if (searchTags.length > 0 || inputValue.trim() !== '') {
      const currentTags = [...searchTags];
      if (inputValue.trim() !== '') {
        currentTags.push(inputValue.trim().toLowerCase());
      }

      rs = rs.filter((r) =>
        currentTags.some((tag) => {
          let normTag = tag.toLowerCase().trim();
          if (normTag === 'aluminum') normTag = 'aluminium';
          if (normTag === 'titainum') normTag = 'titanium';
          const resName = (r.name || '').toLowerCase();
          const base = r.baseEmission || 4000;
          const matchSignal =
            normTag === base.toString() || normTag === (base * 2).toString() || normTag === (base * 3).toString();

          return resName.includes(normTag) || normTag.includes(resName.split(' ')[0]) || matchSignal;
        }),
      );
    }
    return rs;
  }, [resources, selectedSystem, selectedMiningType, selectedLocType, selectedBody, searchTags, inputValue]);

  const totalPages = Math.ceil(filteredResources.length / itemsPerPage);
  const currentPage = totalPages > 0 ? Math.min(requestedPage, totalPages) : 1;

  const paginatedResources = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredResources.slice(start, start + itemsPerPage);
  }, [filteredResources, currentPage]);

  if (loading) {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{ textAlign: 'center', padding: '5rem', fontFamily: 'var(--cinzel-font)', fontSize: '1.6rem', color: 'var(--secondary)' }}
      >
        EXTRAYENDO REGISTROS DE OFRENDAS…
      </div>
    );
  }

  return (
    <div style={{ padding: '0 2rem' }}>
      <h1 style={{ marginBottom: '1rem' }}>
        <DualLabel
          sacred={TERMINOLOGY.ofrendas.sacred}
          tactical={TERMINOLOGY.ofrendas.tactical}
          size="lg"
          sacredColor="var(--secondary)"
        />
      </h1>

      <div className="surface-monolith" style={{ marginBottom: '2rem', padding: '1rem 2rem' }}>
        <div
          className="search-container"
          style={{
            margin: '0 0 1.5rem 0',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            flexWrap: 'wrap',
            padding: '0.45rem 0.9rem',
            minHeight: '45px',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            background: 'rgba(12, 5, 5, 0.92)',
          }}
        >
          <Search size={16} aria-hidden="true" style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {searchTags.map((tag) => (
              <span
                key={tag}
                style={{
                  background: 'var(--primary)',
                  color: '#fff',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontWeight: 'bold',
                }}
              >
                {tag.toUpperCase()}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  aria-label={`Quitar etiqueta ${tag}`}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#fff',
                    cursor: 'pointer',
                    padding: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                  }}
                >
                  <X size={12} aria-hidden="true" />
                </button>
              </span>
            ))}
          </div>
          <label htmlFor={tagInputId} className="sr-only">
            Buscar ofrendas o señal de escaneo
          </label>
          <input
            id={tagInputId}
            name="resource-tags"
            type="text"
            autoComplete="off"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-main)',
              flex: 1,
              fontSize: '0.9rem',
              minWidth: '150px',
            }}
            placeholder={
              searchTags.length === 0 ? 'Buscar ofrendas o señal (ej: Agricium, 1700…)' : 'Añadir más etiquetas…'
            }
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        <button
          type="button"
          aria-expanded={showFilters}
          aria-controls="resources-filters-panel"
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
              id="resources-filters-panel"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ paddingTop: '1.5rem', borderTop: '1px solid rgba(212,175,55,0.15)', marginTop: '1rem' }}>
                <div className="controls-container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', margin: 0 }}>
                  <div style={{ display: 'flex', gap: '1rem', width: '100%', flexWrap: 'wrap' }}>
                    <label htmlFor={bodySelectId} className="sr-only">
                      Filtrar por cuerpo celeste específico
                    </label>
                    <select
                      id={bodySelectId}
                      name="resource-body"
                      className="select-filter"
                      style={{ flex: 1, minWidth: '280px' }}
                      value={selectedBody || ''}
                      onChange={(e) => updateParams({ body: e.target.value || null })}
                    >
                      <option value="">Cuerpo Específico (Todos)</option>
                      {bodies.map((b) => (
                        <option key={b} value={b}>
                          {b.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                    <div className="filter-group">
                      <span className="filter-label">
                        <Globe size={14} aria-hidden="true" /> SISTEMA:
                      </span>
                      <button
                        type="button"
                        aria-pressed={selectedSystem === null}
                        className={`filter-btn ${selectedSystem === null ? 'active' : ''}`}
                        onClick={() => updateParams({ system: null })}
                      >
                        TODO
                      </button>
                      {systems.map((s) => (
                        <button
                          key={s}
                          type="button"
                          aria-pressed={selectedSystem === s}
                          className={`filter-btn ${selectedSystem === s ? 'active' : ''}`}
                          onClick={() => updateParams({ system: s })}
                        >
                          {s}
                        </button>
                      ))}
                    </div>

                    <div className="filter-group">
                      <span className="filter-label">
                        <Pickaxe size={14} aria-hidden="true" /> MÉTODO:
                      </span>
                      <button
                        type="button"
                        aria-pressed={selectedMiningType === null}
                        className={`filter-btn ${selectedMiningType === null ? 'active' : ''}`}
                        onClick={() => updateParams({ mining: null })}
                      >
                        TODO
                      </button>
                      {miningTypes.map((t) => (
                        <button
                          key={t}
                          type="button"
                          aria-pressed={selectedMiningType === t}
                          className={`filter-btn ${selectedMiningType === t ? 'active' : ''}`}
                          onClick={() => updateParams({ mining: t })}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="filter-group">
                    <span className="filter-label">
                      <MapPin size={14} aria-hidden="true" /> TIPO LUGAR:
                    </span>
                    <button
                      type="button"
                      aria-pressed={selectedLocType === null}
                      className={`filter-btn ${selectedLocType === null ? 'active' : ''}`}
                      onClick={() => updateParams({ locType: null })}
                    >
                      TODO
                    </button>
                    {locTypes.map((t) => (
                      <button
                        key={t}
                        type="button"
                        aria-pressed={selectedLocType === t}
                        className={`filter-btn ${selectedLocType === t ? 'active' : ''}`}
                        onClick={() => updateParams({ locType: t })}
                      >
                        {t.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {filteredResources.length === 0 ? (
        <div className="surface-monolith" style={{ textAlign: 'center', padding: '3rem 2rem', marginBottom: '2rem' }}>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Ninguna ofrenda coincide con los filtros o etiquetas actuales.
          </p>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setInputValue('');
              updateParams({ tags: null, system: null, mining: null, locType: null, body: null });
            }}
          >
            LIMPIAR FILTROS
          </button>
        </div>
      ) : (
        <div className="grid-layout">
          {paginatedResources.map((resource) => {
            const matchingLocs =
              resource.locationsDetail?.filter((l) => {
                let match = true;
                if (selectedSystem) match = match && l.system === selectedSystem;
                if (selectedLocType) match = match && l.type === selectedLocType;
                if (selectedBody) match = match && `${l.system}: ${l.name} (${l.type})` === selectedBody;
                return match;
              }) ?? [];

            const normalizedName = resource.name.toLowerCase();
            const resourceBlueprints = blueprints.filter((b) =>
              b.parts?.some((m) => {
                const partName = (m.label || m.name || '').toLowerCase();
                return (
                  normalizedName.includes(partName) ||
                  partName.includes(normalizedName) ||
                  m.resourceId === resource.id
                );
              }),
            );

            return (
              <motion.div
                key={resource.id}
                className="surface-monolith cv-auto"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ borderLeft: '4px solid var(--primary)', position: 'relative' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <Link
                    to={`/recurso/${resource.id}`}
                    state={{ breadcrumbLabel: `OFRENDA: ${resource.name}` }}
                    style={{ textDecoration: 'none' }}
                  >
                    <h2 className="accent-gold hover-underline" style={{ margin: 0, fontSize: '1.2rem' }}>
                      {resource.name}
                    </h2>
                  </Link>
                  <span
                    style={{
                      fontSize: '0.65rem',
                      background: 'rgba(255, 62, 62, 0.1)',
                      color: 'var(--primary)',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      border: '1px solid currentColor',
                      flexShrink: 0,
                    }}
                  >
                    {resource.type?.toUpperCase()}
                  </span>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <MapIcon size={12} aria-hidden="true" /> {resource.parent}
                </p>

                <div style={{ marginTop: '1.2rem', padding: '0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                  <h3 style={{ fontSize: '0.8rem', margin: '0 0 0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Database size={14} aria-hidden="true" className="accent-amber" /> SEÑAL ESCANEO:
                  </h3>
                  <div className="responsive-grid-3" style={{ gap: '0.4rem' }}>
                    {[1, 2, 3, 4, 5, 6].map((c) => (
                      <div
                        key={c}
                        style={{
                          fontSize: '0.7rem',
                          border: '1px solid rgba(255,255,255,0.05)',
                          padding: '0.3rem',
                          borderRadius: '4px',
                          textAlign: 'center',
                        }}
                      >
                        <div className="tabular-nums" style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>
                          ×{c}
                        </div>
                        <div className="accent-amber tabular-nums">
                          {numberFormatter.format((resource.baseEmission || 4000) * c)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: '0.8rem' }}>
                  <details
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      padding: '0.5rem',
                      borderRadius: '4px',
                      border: '1px solid rgba(255,255,255,0.05)',
                    }}
                  >
                    <summary style={{ fontSize: '0.75rem', color: 'var(--primary)', cursor: 'pointer', fontWeight: 'bold' }}>
                      {selectedLocType || selectedBody ? 'UBICACIONES FILTRADAS' : 'UBICACIONES Y CLUMPING'}{' '}
                      <span className="tabular-nums">({matchingLocs.length})</span>
                    </summary>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.8rem' }}>
                      {matchingLocs.slice(0, 5).map((loc, lIdx) => (
                        <div
                          key={`${loc.system}-${loc.name}-${lIdx}`}
                          style={{
                            fontSize: '0.7rem',
                            background: 'rgba(255,255,255,0.03)',
                            padding: '0.4rem 0.6rem',
                            borderRadius: '4px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            borderLeft: '2px solid var(--primary)',
                          }}
                        >
                          <Link
                            to={`/locacion/${loc.system}/${loc.name}`}
                            state={{ breadcrumbLabel: `RITO: ${loc.name}` }}
                            style={{ textDecoration: 'none', color: 'inherit', display: 'flex', justifyContent: 'space-between', width: '100%' }}
                          >
                            <span>
                              {loc.system}: <strong>{loc.name}</strong> <span style={{ opacity: 0.7 }}>({loc.type})</span>
                            </span>
                            <span className="accent-amber tabular-nums" style={{ fontSize: '0.65rem' }}>
                              {loc.clustering || '1 item'}
                            </span>
                          </Link>
                        </div>
                      ))}
                      {matchingLocs.length > 5 && (
                        <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center', margin: '0.2rem 0 0' }}>
                          + Otros resultados…
                        </p>
                      )}
                    </div>
                  </details>
                </div>

                {resourceBlueprints.length > 0 && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <details
                      style={{
                        background: 'rgba(255,255,255,0.02)',
                        padding: '0.5rem',
                        borderRadius: '4px',
                        border: '1px solid rgba(255,255,255,0.05)',
                      }}
                    >
                      <summary style={{ fontSize: '0.75rem', color: 'var(--primary)', cursor: 'pointer', fontWeight: 'bold' }}>
                        TECNOMILAGROS <span className="tabular-nums">({resourceBlueprints.length})</span>
                      </summary>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.8rem' }}>
                        {resourceBlueprints.map((bp) => (
                          <div
                            key={bp.id}
                            style={{
                              fontSize: '0.7rem',
                              background: 'rgba(255,255,255,0.03)',
                              padding: '0.4rem 0.6rem',
                              borderRadius: '4px',
                              display: 'flex',
                              borderLeft: '2px solid var(--primary)',
                            }}
                          >
                            <Link
                              to={`/codice/tecnomilagros?id=${bp.id}`}
                              style={{ textDecoration: 'none', color: 'inherit', display: 'flex', justifyContent: 'space-between', width: '100%' }}
                            >
                              <span>{bp.name || bp.label}</span>
                              <span className="accent-amber" style={{ fontSize: '0.65rem' }}>
                                Ver Rito →
                              </span>
                            </Link>
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      <nav aria-label="Paginación de Ofrendas">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(page) =>
            updateParams({ page: page > 1 ? String(page) : null }, { resetPage: false, replace: false })
          }
        />
      </nav>
    </div>
  );
};

export default Resources;

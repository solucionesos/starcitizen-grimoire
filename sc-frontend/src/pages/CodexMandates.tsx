import React, { useEffect, useId, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getMissions } from '../api/client';
import { Award, ChevronDown, Coins, Filter, Flame, ScrollText, Search } from 'lucide-react';
import Pagination from '../components/Pagination';
import DualLabel from '../components/DualLabel';
import { TERMINOLOGY } from '../constants/terminology';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import type { Mission } from '../types';

const SYSTEM_COLORS: Record<string, { bg: string; text: string; border: string; dot: string; label: string }> = {
  Stanton: {
    bg: 'rgba(56, 189, 248, 0.12)',
    text: 'var(--accent-rsi)',
    border: 'rgba(56, 189, 248, 0.4)',
    dot: '#38bdf8',
    label: 'STANTON',
  },
  Pyro: {
    bg: 'rgba(249, 115, 22, 0.12)',
    text: '#fb923c',
    border: 'rgba(249, 115, 22, 0.4)',
    dot: '#fb923c',
    label: 'PYRO',
  },
  Nyx: {
    bg: 'rgba(168, 85, 247, 0.12)',
    text: 'var(--accent-conclave)',
    border: 'rgba(168, 85, 247, 0.4)',
    dot: '#a855f7',
    label: 'NYX',
  },
  Ambos: {
    bg: 'rgba(212, 175, 55, 0.12)',
    text: 'var(--secondary)',
    border: 'rgba(212, 175, 55, 0.4)',
    dot: '#d4af37',
    label: 'MULTI-SISTEMA',
  },
  Desconocido: {
    bg: 'rgba(100,100,100,0.1)',
    text: 'var(--text-muted)',
    border: 'rgba(100,100,100,0.3)',
    dot: '#a18a8a',
    label: 'DESCONOCIDO',
  },
};

type RewardFilter = 'all' | 'blueprint' | 'scrip' | 'credits';

const CodexMandates: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const baseId = useId();
  const searchInputId = `${baseId}-search`;
  const systemSelectId = `${baseId}-system`;
  const typeSelectId = `${baseId}-type`;
  const factionSelectId = `${baseId}-faction`;
  const repSelectId = `${baseId}-rep`;

  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const itemsPerPage = 9;
  const activeId = searchParams.get('id');
  const searchTerm = searchParams.get('search') ?? '';
  const selectedSystem = searchParams.get('system') || null;
  const selectedType = searchParams.get('type') || null;
  const selectedFaction = searchParams.get('faction') || null;
  const selectedRep = searchParams.get('rep') || null;
  const rawReward = searchParams.get('reward');
  const rewardFilter: RewardFilter =
    rawReward === 'blueprint' || rawReward === 'scrip' || rawReward === 'credits' ? rawReward : 'all';
  const rawPage = Number.parseInt(searchParams.get('page') ?? '1', 10);
  const requestedPage = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  const numberFormatter = useMemo(() => new Intl.NumberFormat('es-ES'), []);

  useEffect(() => {
    document.title = 'Star Grimoire | Mandatos Profanos';
  }, []);

  useEffect(() => {
    getMissions()
      .then((data) => {
        setMissions(Array.isArray(data) ? data : []);
      })
      .catch((err) => console.error('Error loading mandates:', err))
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

  const systems = useMemo(
    () => [...new Set(missions.map((m) => m.system || 'Desconocido'))].sort(),
    [missions],
  );

  const missionTypes = useMemo(
    () => [...new Set(missions.map((m) => m.mission_type || 'Otro'))].sort(),
    [missions],
  );

  const factionList = useMemo(() => {
    let ms = missions;
    if (selectedSystem) ms = ms.filter((m) => m.system === selectedSystem);
    if (selectedType) ms = ms.filter((m) => m.mission_type === selectedType);
    return [...new Set(ms.map((m) => m.faction || 'Independent'))].sort((a, b) => a.localeCompare(b));
  }, [missions, selectedSystem, selectedType]);

  const repLevels = useMemo(() => {
    let ms = missions;
    if (selectedSystem) ms = ms.filter((m) => m.system === selectedSystem);
    if (selectedFaction) ms = ms.filter((m) => (m.faction || 'Independent') === selectedFaction);
    return [...new Set(ms.map((m) => m.reputation_required).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }, [missions, selectedSystem, selectedFaction]);

  const filteredMissions = useMemo(() => {
    const query = searchTerm.toLowerCase();
    let ms = missions;

    if (activeId) ms = ms.filter((m) => m.id === activeId);
    if (selectedSystem) ms = ms.filter((m) => m.system === selectedSystem);
    if (selectedType) ms = ms.filter((m) => m.mission_type === selectedType);
    if (selectedFaction) ms = ms.filter((m) => (m.faction || 'Independent') === selectedFaction);
    if (selectedRep) ms = ms.filter((m) => m.reputation_required === selectedRep);

    if (rewardFilter === 'blueprint') ms = ms.filter((m) => m.probability_rewards?.length > 0);
    else if (rewardFilter === 'scrip') ms = ms.filter((m) => (m.script_items?.length ?? 0) > 0);
    else if (rewardFilter === 'credits') {
      ms = ms.filter(
        (m) =>
          (!m.probability_rewards || m.probability_rewards.length === 0) &&
          (!m.script_items || m.script_items.length === 0),
      );
    }

    if (query) {
      ms = ms.filter(
        (m) =>
          m.friendly_name?.toLowerCase().includes(query) ||
          m.name?.toLowerCase().includes(query) ||
          (m.faction || '').toLowerCase().includes(query) ||
          m.overview?.toLowerCase().includes(query),
      );
    }
    return ms;
  }, [missions, searchTerm, selectedSystem, selectedType, selectedFaction, selectedRep, rewardFilter, activeId]);

  const totalPages = Math.ceil(filteredMissions.length / itemsPerPage);
  const currentPage = totalPages > 0 ? Math.min(requestedPage, totalPages) : 1;

  const paginatedMissions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredMissions.slice(start, start + itemsPerPage);
  }, [filteredMissions, currentPage]);

  if (loading) {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{ textAlign: 'center', padding: '5rem', fontFamily: 'var(--cinzel-font)', fontSize: '1.8rem', color: 'var(--secondary)' }}
      >
        DESENCRIPTANDO MANDATOS PROFANOS DEL CÓDICE…
      </div>
    );
  }

  return (
    <div style={{ padding: '0 2rem 4rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: '0 0 0.75rem' }}>
          <DualLabel
            sacred={TERMINOLOGY.mandatos.sacred}
            tactical={TERMINOLOGY.mandatos.tactical}
            size="lg"
            align="center"
            sacredColor="var(--secondary)"
          />
        </h1>
        <p
          className="prose-grimoire"
          style={{ color: 'var(--text-muted)', fontSize: '1.05rem', margin: '0 auto', fontFamily: 'var(--body-font)' }}
        >
          El registro de encargos, cacerías y recompensas emitidos en las Fisuras del Orden y en los dominios de Los
          Custodios del Orden (La Gran Mentira) durante el Ciclo 2956.
        </p>
      </div>

      {/* Prominent Active Filter Banner */}
      {activeId && (
        <div
          className="surface-monolith"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
            padding: '1rem 1.5rem',
            marginBottom: '1.5rem',
            borderLeft: '4px solid var(--secondary)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <ScrollText size={22} aria-hidden="true" style={{ color: 'var(--secondary)', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--secondary)', fontFamily: 'var(--cinzel-font)' }}>
                CONSULTA DE MANDATO ESPECÍFICO
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>
                Identificador filtrado: <span className="accent-rsi">{activeId}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => updateParams({ id: null })}
            style={{ fontSize: '0.75rem', padding: '0.4rem 1rem' }}
          >
            VER TODOS LOS MANDATOS
          </button>
        </div>
      )}

      {/* Search and Filters Header */}
      <div className="surface-monolith" style={{ marginBottom: '2rem', padding: '1.5rem 2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="search-container" style={{ margin: 0, flex: 1, minWidth: '280px' }}>
            <label htmlFor={searchInputId} className="sr-only">
              Buscar mandatos por nombre, facción o palabras clave
            </label>
            <div style={{ position: 'relative' }}>
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
                name="mandate-search"
                type="text"
                autoComplete="off"
                className="search-input"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="Buscar por nombre, facción o palabras clave…"
                value={searchTerm}
                onChange={(e) => updateParams({ search: e.target.value || null }, { replace: true })}
              />
            </div>
          </div>

          <button
            type="button"
            aria-expanded={showFilters}
            aria-controls="mandates-filters-panel"
            onClick={() => setShowFilters(!showFilters)}
            className="btn-secondary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              borderColor: showFilters ? 'var(--secondary)' : 'rgba(212,175,55,0.2)',
            }}
          >
            <Filter size={16} aria-hidden="true" />
            <span>FILTROS SAGRADOS</span>
            <ChevronDown
              size={16}
              aria-hidden="true"
              style={{ transform: showFilters ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}
            />
          </button>
        </div>

        {/* Collapsible Filter Bar */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              id="mandates-filters-panel"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{
                overflow: 'hidden',
                marginTop: '1.5rem',
                paddingTop: '1.5rem',
                borderTop: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div>
                  <label
                    htmlFor={systemSelectId}
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--secondary)',
                      display: 'block',
                      marginBottom: '0.4rem',
                      fontFamily: 'var(--cinzel-font)',
                    }}
                  >
                    SISTEMA ESTELAR
                  </label>
                  <select
                    id={systemSelectId}
                    name="mandate-system"
                    className="select-filter"
                    value={selectedSystem || ''}
                    onChange={(e) =>
                      updateParams({
                        system: e.target.value || null,
                        faction: null,
                        rep: null,
                      })
                    }
                  >
                    <option value="">Todos los Sistemas</option>
                    {systems.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor={typeSelectId}
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--secondary)',
                      display: 'block',
                      marginBottom: '0.4rem',
                      fontFamily: 'var(--cinzel-font)',
                    }}
                  >
                    TIPO DE MANDATO
                  </label>
                  <select
                    id={typeSelectId}
                    name="mandate-type"
                    className="select-filter"
                    value={selectedType || ''}
                    onChange={(e) => updateParams({ type: e.target.value || null })}
                  >
                    <option value="">Todos los Tipos</option>
                    {missionTypes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor={factionSelectId}
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--secondary)',
                      display: 'block',
                      marginBottom: '0.4rem',
                      fontFamily: 'var(--cinzel-font)',
                    }}
                  >
                    FACCIÓN EMISORA
                  </label>
                  <select
                    id={factionSelectId}
                    name="mandate-faction"
                    className="select-filter"
                    value={selectedFaction || ''}
                    onChange={(e) =>
                      updateParams({
                        faction: e.target.value || null,
                        rep: null,
                      })
                    }
                  >
                    <option value="">Todas las Facciones</option>
                    {factionList.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor={repSelectId}
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--secondary)',
                      display: 'block',
                      marginBottom: '0.4rem',
                      fontFamily: 'var(--cinzel-font)',
                    }}
                  >
                    REPUTACIÓN REQUERIDA
                  </label>
                  <select
                    id={repSelectId}
                    name="mandate-rep"
                    className="select-filter"
                    value={selectedRep || ''}
                    onChange={(e) => updateParams({ rep: e.target.value || null })}
                  >
                    <option value="">Cualquier Rango</option>
                    {repLevels.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Reward Filter Pills */}
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--cinzel-font)' }}>
                  BENDICIÓN:
                </span>
                {(['all', 'blueprint', 'scrip', 'credits'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    aria-pressed={rewardFilter === r}
                    className={`filter-btn ${rewardFilter === r ? 'active' : ''}`}
                    onClick={() => updateParams({ reward: r === 'all' ? null : r })}
                    style={{ fontSize: '0.75rem', padding: '0.3rem 0.8rem' }}
                  >
                    {r === 'all'
                      ? 'TODAS'
                      : r === 'blueprint'
                        ? 'TECNOMILAGRO (BLUEPRINT)'
                        : r === 'scrip'
                          ? 'SCRIP'
                          : 'SOLO CRÉDITOS'}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Counter */}
      <div
        style={{
          textAlign: 'center',
          marginBottom: '1.5rem',
          fontFamily: 'var(--cinzel-font)',
          fontSize: '0.85rem',
          color: 'var(--text-muted)',
          letterSpacing: '2px',
        }}
      >
        <span aria-hidden="true">☩ </span>
        <span className="tabular-nums">{numberFormatter.format(filteredMissions.length)}</span> MANDATOS ENCONTRADOS EN EL CÓDICE
        <span aria-hidden="true"> ☩</span>
      </div>

      {/* Mandates Grid */}
      {filteredMissions.length === 0 ? (
        <div className="surface-monolith" style={{ textAlign: 'center', padding: '3rem 2rem', marginBottom: '2rem' }}>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            No se hallaron mandatos profanos con los filtros seleccionados.
          </p>
          <button
            type="button"
            className="btn-secondary"
            onClick={() =>
              updateParams({
                search: null,
                system: null,
                type: null,
                faction: null,
                rep: null,
                reward: null,
                id: null,
              })
            }
          >
            LIMPIAR FILTROS
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
          {paginatedMissions.map((m) => {
            const sysConfig = SYSTEM_COLORS[m.system || 'Desconocido'] || SYSTEM_COLORS.Desconocido;
            const creditsValue = m.credits || m.reward_min || 0;

            return (
              <motion.div
                key={m.id}
                className="surface-monolith cv-auto"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  borderTop: `3px solid ${sysConfig.border}`,
                  padding: '1.5rem',
                  gap: '1rem',
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontFamily: 'var(--cinzel-font)',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '3px',
                        background: sysConfig.bg,
                        color: sysConfig.text,
                        border: `1px solid ${sysConfig.border}`,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: sysConfig.dot,
                          display: 'inline-block',
                        }}
                      />
                      {sysConfig.label}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      {m.mission_type || 'Contrato'}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--secondary)', fontFamily: 'var(--cinzel-font)' }}>
                    REP: {m.reputation_required || 'Neutral'}
                  </span>
                </div>

                <h2
                  style={{
                    margin: 0,
                    fontFamily: 'var(--cinzel-font)',
                    fontSize: '1.15rem',
                    color: 'var(--text-main)',
                    letterSpacing: '1px',
                  }}
                >
                  {m.friendly_name || m.name?.replace(/_/g, ' ')}
                </h2>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Facción: <strong style={{ color: 'var(--text-main)' }}>{m.faction}</strong>
                </div>

                {/* Rewards Bar */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    background: 'rgba(0,0,0,0.4)',
                    padding: '0.6rem 0.8rem',
                    borderRadius: '4px',
                    border: '1px solid rgba(255,255,255,0.04)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--secondary)', fontSize: '0.85rem' }}>
                    <Coins size={15} aria-hidden="true" />
                    <strong className="tabular-nums">{numberFormatter.format(creditsValue)}</strong>
                    <span style={{ fontSize: '0.65rem' }}>aUEC</span>
                  </div>
                  {m.standing !== undefined && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--accent-rsi)', fontSize: '0.85rem' }}>
                      <strong className="tabular-nums">+{m.standing}</strong>
                      <span style={{ fontSize: '0.65rem' }}>REP</span>
                    </div>
                  )}
                  {m.script_items?.map((item) => (
                    <div
                      key={item.name}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--accent-conclave)', fontSize: '0.85rem' }}
                    >
                      <Award size={14} aria-hidden="true" />
                      <strong className="tabular-nums">{item.count || 1}</strong>
                      <span style={{ fontSize: '0.65rem' }}>{item.name}</span>
                    </div>
                  ))}
                </div>

                {/* Overview */}
                <p
                  className="prose-grimoire"
                  style={{
                    fontSize: '0.88rem',
                    color: 'var(--text-muted)',
                    lineHeight: 1.6,
                    margin: 0,
                    flex: 1,
                    whiteSpace: 'pre-line',
                  }}
                >
                  {(m.overview || m.description_lore || 'Sin especificaciones reportadas.').slice(0, 240)}
                  {(m.overview?.length ?? 0) > 240 ? '…' : ''}
                </p>

                {/* Related Blueprints */}
                {m.probability_rewards && m.probability_rewards.length > 0 && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.8rem' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--secondary)', fontFamily: 'var(--cinzel-font)', marginBottom: '0.4rem' }}>
                      TECNOMILAGROS RELACIONADOS:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {m.probability_rewards.map((reward) => (
                        <button
                          key={reward.id || reward.label}
                          type="button"
                          className="filter-btn"
                          style={{ fontSize: '0.7rem', padding: '0.3rem 0.6rem' }}
                          onClick={() => navigate(`/codice/tecnomilagros?id=${reward.id}`)}
                        >
                          {reward.label || reward.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                {user && user.status === 'approved' && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{
                        fontSize: '0.7rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        borderColor: 'var(--primary)',
                        color: 'var(--primary)',
                      }}
                      onClick={() => {
                        navigate(`/conclave?propose_cruzada=${encodeURIComponent(m.friendly_name || m.name)}`);
                      }}
                    >
                      <Flame size={13} aria-hidden="true" />
                      PROPONER AL CÓNCLAVE
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      <nav aria-label="Paginación de Mandatos Profanos">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(page) => updateParams({ page: page > 1 ? String(page) : null }, { resetPage: false })}
        />
      </nav>
    </div>
  );
};

export default CodexMandates;

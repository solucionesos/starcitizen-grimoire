import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getMissions } from '../api/client';
import { Award, Coins, Filter, ChevronDown, Flame } from 'lucide-react';
import Pagination from '../components/Pagination';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { Mission } from '../types';

const SYSTEM_COLORS: Record<string, { bg: string; text: string; border: string; label: string }> = {
  Stanton: { bg: 'rgba(59, 130, 246, 0.12)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.4)', label: '🔵 STANTON' },
  Pyro: { bg: 'rgba(249, 115, 22, 0.12)', text: '#fb923c', border: 'rgba(249, 115, 22, 0.4)', label: '🔴 PYRO' },
  Nyx: { bg: 'rgba(168, 85, 247, 0.12)', text: '#c084fc', border: 'rgba(168, 85, 247, 0.4)', label: '🟣 NYX' },
  Ambos: { bg: 'rgba(212, 175, 55, 0.12)', text: '#d4af37', border: 'rgba(212, 175, 55, 0.4)', label: '🟡 MULTI-SISTEMA' },
  Desconocido: { bg: 'rgba(100,100,100,0.1)', text: '#aaa', border: 'rgba(100,100,100,0.3)', label: '⬜ DESCONOCIDO' },
};

const CodexMandates: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFaction, setSelectedFaction] = useState<string | null>(null);
  const [selectedSystem, setSelectedSystem] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedRep, setSelectedRep] = useState<string | null>(null);
  const [rewardFilter, setRewardFilter] = useState<'all' | 'blueprint' | 'scrip' | 'credits'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const itemsPerPage = 9;

  useEffect(() => {
    getMissions()
      .then((data) => {
        const list = Array.isArray(data) ? data : (data as any).missions || [];
        setMissions(list);
      })
      .catch((err) => console.error('Error loading mandates:', err))
      .finally(() => setLoading(false));
  }, []);

  const systems = useMemo(
    () => [...new Set(missions.map((m) => m.system || 'Desconocido'))].sort(),
    [missions]
  );

  const missionTypes = useMemo(
    () => [...new Set(missions.map((m) => m.mission_type || 'Otro'))].sort(),
    [missions]
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

  const activeId = searchParams.get('id');

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
          (!m.script_items || m.script_items.length === 0)
      );
    }

    if (query) {
      ms = ms.filter(
        (m) =>
          m.friendly_name?.toLowerCase().includes(query) ||
          m.name?.toLowerCase().includes(query) ||
          (m.faction || '').toLowerCase().includes(query) ||
          m.overview?.toLowerCase().includes(query)
      );
    }
    return ms;
  }, [missions, searchTerm, selectedSystem, selectedType, selectedFaction, selectedRep, rewardFilter, activeId]);

  const totalPages = Math.ceil(filteredMissions.length / itemsPerPage);
  const paginatedMissions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredMissions.slice(start, start + itemsPerPage);
  }, [filteredMissions, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedSystem, selectedType, selectedFaction, selectedRep, rewardFilter, activeId]);

  useEffect(() => {
    setSelectedRep(null);
  }, [selectedFaction]);

  useEffect(() => {
    setSelectedFaction(null);
    setSelectedRep(null);
  }, [selectedSystem]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem', fontFamily: 'var(--cinzel-font)', fontSize: '1.8rem', color: 'var(--secondary)' }}>
        DESENCRIPTANDO MANDATOS PROFANOS DEL CÓDICE...
      </div>
    );
  }

  return (
    <div style={{ padding: '0 2rem 4rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ color: 'var(--secondary)', fontFamily: 'var(--cinzel-font)', fontSize: '2.5rem', margin: '0 0 0.5rem', letterSpacing: '4px' }}>
          MANDATOS DEL VACÍO Y CONTRATOS DE LOS CIEGOS
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', margin: 0, fontFamily: 'var(--body-font)' }}>
          El registro de encargos, cacerías y recompensas emitidos en las Fisuras del Orden y en los dominios de Los
          Custodios del Orden (La Gran Mentira) durante el Ciclo 2956.
        </p>
      </div>

      {/* Prominent Active Filter Banner */}
      {activeId && (
        <div
          className="glass-card"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem 1.5rem',
            marginBottom: '1.5rem',
            borderLeft: '4px solid var(--secondary)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <span style={{ fontSize: '1.4rem' }}>📜</span>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--secondary)', fontFamily: 'var(--cinzel-font)' }}>
                CONSULTA DE MANDATO ESPECÍFICO
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>
                Identificador filtrado: <span className="accent-cyan">{activeId}</span>
              </div>
            </div>
          </div>
          <button
            className="btn-secondary"
            onClick={() => {
              searchParams.delete('id');
              setSearchParams(searchParams);
            }}
            style={{ fontSize: '0.75rem', padding: '0.4rem 1rem' }}
          >
            VER TODOS LOS MANDATOS
          </button>
        </div>
      )}

      {/* Search and Filters Header */}
      <div className="glass-card" style={{ marginBottom: '2rem', padding: '1.5rem 2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="search-container" style={{ margin: 0, flex: 1, minWidth: '280px' }}>
            <input
              type="text"
              className="search-input"
              placeholder="🔍 Buscar por nombre, facción o palabras clave..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn-secondary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              borderColor: showFilters ? 'var(--secondary)' : 'rgba(212,175,55,0.2)',
            }}
          >
            <Filter size={16} />
            <span>FILTROS SAGRADOS</span>
            <ChevronDown size={16} style={{ transform: showFilters ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
        </div>

        {/* Collapsible Filter Bar */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{ overflow: 'hidden', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--secondary)', display: 'block', marginBottom: '0.4rem', fontFamily: 'var(--cinzel-font)' }}>
                    SISTEMA ESTELAR
                  </label>
                  <select
                    className="select-filter"
                    value={selectedSystem || ''}
                    onChange={(e) => setSelectedSystem(e.target.value || null)}
                    style={{ width: '100%', padding: '0.6rem', background: 'rgba(0,0,0,0.5)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px' }}
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
                  <label style={{ fontSize: '0.75rem', color: 'var(--secondary)', display: 'block', marginBottom: '0.4rem', fontFamily: 'var(--cinzel-font)' }}>
                    TIPO DE MANDATO
                  </label>
                  <select
                    className="select-filter"
                    value={selectedType || ''}
                    onChange={(e) => setSelectedType(e.target.value || null)}
                    style={{ width: '100%', padding: '0.6rem', background: 'rgba(0,0,0,0.5)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px' }}
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
                  <label style={{ fontSize: '0.75rem', color: 'var(--secondary)', display: 'block', marginBottom: '0.4rem', fontFamily: 'var(--cinzel-font)' }}>
                    FACCIÓN EMISORA
                  </label>
                  <select
                    className="select-filter"
                    value={selectedFaction || ''}
                    onChange={(e) => setSelectedFaction(e.target.value || null)}
                    style={{ width: '100%', padding: '0.6rem', background: 'rgba(0,0,0,0.5)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px' }}
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
                  <label style={{ fontSize: '0.75rem', color: 'var(--secondary)', display: 'block', marginBottom: '0.4rem', fontFamily: 'var(--cinzel-font)' }}>
                    REPUTACIÓN REQUERIDA
                  </label>
                  <select
                    className="select-filter"
                    value={selectedRep || ''}
                    onChange={(e) => setSelectedRep(e.target.value || null)}
                    style={{ width: '100%', padding: '0.6rem', background: 'rgba(0,0,0,0.5)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px' }}
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
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--cinzel-font)' }}>BENDICIÓN:</span>
                {(['all', 'blueprint', 'scrip', 'credits'] as const).map((r) => (
                  <button
                    key={r}
                    className={`filter-btn ${rewardFilter === r ? 'active' : ''}`}
                    onClick={() => setRewardFilter(r)}
                    style={{ fontSize: '0.75rem', padding: '0.3rem 0.8rem' }}
                  >
                    {r === 'all' ? 'TODAS' : r === 'blueprint' ? 'TECNOMILAGRO (BLUEPRINT)' : r === 'scrip' ? 'SCRIP' : 'SOLO CRÉDITOS'}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Counter */}
      <div style={{ textAlign: 'center', marginBottom: '1.5rem', fontFamily: 'var(--cinzel-font)', fontSize: '0.85rem', color: 'var(--text-muted)', letterSpacing: '2px' }}>
        ☩ {filteredMissions.length} MANDATOS ENCONTRADOS EN EL CÓDICE ☩
      </div>

      {/* Mandates Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
        {paginatedMissions.map((m) => {
          const sysConfig = SYSTEM_COLORS[m.system || 'Desconocido'] || SYSTEM_COLORS['Desconocido'];

          return (
            <motion.div
              key={m.id}
              className="glass-card"
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
                <div>
                  <span
                    style={{
                      fontSize: '0.65rem',
                      fontFamily: 'var(--cinzel-font)',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '3px',
                      background: sysConfig.bg,
                      color: sysConfig.text,
                      border: `1px solid ${sysConfig.border}`,
                      marginRight: '0.5rem',
                    }}
                  >
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

              <h3
                style={{
                  margin: 0,
                  fontFamily: 'var(--cinzel-font)',
                  fontSize: '1.15rem',
                  color: 'var(--text-main)',
                  letterSpacing: '1px',
                }}
              >
                {m.friendly_name || m.name?.replace(/_/g, ' ')}
              </h3>

              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Facción: <strong style={{ color: 'var(--text-main)' }}>{m.faction}</strong>
              </div>

              {/* Rewards Bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  background: 'rgba(0,0,0,0.4)',
                  padding: '0.6rem 0.8rem',
                  borderRadius: '4px',
                  border: '1px solid rgba(255,255,255,0.04)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--secondary)', fontSize: '0.85rem' }}>
                  <Coins size={15} />
                  <strong>{(m.credits || m.reward_min || 0).toLocaleString()}</strong>
                  <span style={{ fontSize: '0.65rem' }}>aUEC</span>
                </div>
                {m.standing !== undefined && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#60a5fa', fontSize: '0.85rem' }}>
                    <strong>+{m.standing}</strong>
                    <span style={{ fontSize: '0.65rem' }}>REP</span>
                  </div>
                )}
                {m.script_items?.map((item) => (
                  <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#c084fc', fontSize: '0.85rem' }}>
                    <Award size={14} />
                    <strong>{item.count || 1}</strong>
                    <span style={{ fontSize: '0.65rem' }}>{item.name}</span>
                  </div>
                ))}
              </div>

              {/* Overview */}
              <p
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
                {(m.overview?.length ?? 0) > 240 ? '...' : ''}
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
                    <Flame size={13} />
                    PROPONER AL CÓNCLAVE
                  </button>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
    </div>
  );
};

export default CodexMandates;

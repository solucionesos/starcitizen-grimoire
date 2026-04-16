import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getMissions } from '../api/client';
import { Award, Coins, TrendingUp, Zap, Bug, Trophy, Shield, Globe, Crosshair, Filter, ChevronDown } from 'lucide-react';
import Pagination from '../components/Pagination';
import { useNavigate, useSearchParams } from 'react-router-dom';

// System colors
const SYSTEM_COLORS: Record<string, { bg: string; text: string; border: string; label: string }> = {
    'Stanton': { bg: 'rgba(59, 130, 246, 0.12)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.4)', label: '🔵 STANTON' },
    'Pyro':    { bg: 'rgba(249, 115, 22, 0.12)', text: '#fb923c', border: 'rgba(249, 115, 22, 0.4)', label: '🔴 PYRO' },
    'Nyx':     { bg: 'rgba(168, 85, 247, 0.12)', text: '#c084fc', border: 'rgba(168, 85, 247, 0.4)', label: '🟣 NYX' },
    'Ambos':   { bg: 'rgba(212, 175, 55, 0.12)', text: '#d4af37',  border: 'rgba(212, 175, 55, 0.4)',  label: '🟡 MULTI-SISTEMA' },
    'Desconocido': { bg: 'rgba(100,100,100,0.1)', text: '#aaa', border: 'rgba(100,100,100,0.3)', label: '⬜ DESCONOCIDO' },
};

const Missions: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [missions, setMissions] = useState<any[]>([]);
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
            .then(data => {
                const list = Array.isArray(data) ? data : (data.missions || []);
                setMissions(list);
            })
            .catch(err => console.error('Error loading missions:', err))
            .finally(() => setLoading(false));
    }, []);

    // Available systems
    const systems = useMemo(() =>
        [...new Set(missions.map(m => m.system || 'Desconocido'))].sort(), [missions]);

    // Available mission types
    const missionTypes = useMemo(() =>
        [...new Set(missions.map(m => m.mission_type || 'Otro'))].sort(), [missions]);

    // Factions (filtered by active system/type selection)
    const factionList = useMemo(() => {
        let ms = missions;
        if (selectedSystem) ms = ms.filter(m => m.system === selectedSystem);
        if (selectedType)   ms = ms.filter(m => m.mission_type === selectedType);
        return [...new Set(ms.map(m => m.faction || 'Independent'))].sort((a, b) => a.localeCompare(b));
    }, [missions, selectedSystem, selectedType]);

    const repLevels = useMemo(() => {
        let ms = missions;
        if (selectedSystem)  ms = ms.filter(m => m.system === selectedSystem);
        if (selectedFaction) ms = ms.filter(m => (m.faction || 'Independent') === selectedFaction);
        return [...new Set(ms.map(m => m.reputation_required).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    }, [missions, selectedSystem, selectedFaction]);

    const filteredMissions = useMemo(() => {
        const query = searchTerm.toLowerCase();
        let ms = missions;

        const filterId = searchParams.get('id');
        if (filterId) ms = ms.filter(m => m.id === filterId);
        if (selectedSystem)  ms = ms.filter(m => m.system === selectedSystem);
        if (selectedType)    ms = ms.filter(m => m.mission_type === selectedType);
        if (selectedFaction) ms = ms.filter(m => (m.faction || 'Independent') === selectedFaction);
        if (selectedRep)     ms = ms.filter(m => m.reputation_required === selectedRep);

        if (rewardFilter === 'blueprint') ms = ms.filter(m => m.probability_rewards?.length > 0);
        else if (rewardFilter === 'scrip')   ms = ms.filter(m => m.script_items?.length > 0);
        else if (rewardFilter === 'credits') ms = ms.filter(m =>
            (!m.probability_rewards || m.probability_rewards.length === 0) &&
            (!m.script_items || m.script_items.length === 0));

        if (query) {
            ms = ms.filter(m =>
                m.friendly_name?.toLowerCase().includes(query) ||
                m.name?.toLowerCase().includes(query) ||
                (m.faction || '').toLowerCase().includes(query) ||
                m.overview?.toLowerCase().includes(query));
        }
        return ms;
    }, [missions, searchTerm, selectedSystem, selectedType, selectedFaction, selectedRep, rewardFilter, searchParams]);

    const totalPages = Math.ceil(filteredMissions.length / itemsPerPage);
    const paginatedMissions = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredMissions.slice(start, start + itemsPerPage);
    }, [filteredMissions, currentPage]);

    useEffect(() => { setCurrentPage(1); },
        [searchTerm, selectedSystem, selectedType, selectedFaction, selectedRep, rewardFilter, searchParams]);

    useEffect(() => { setSelectedRep(null); }, [selectedFaction]);
    useEffect(() => { setSelectedFaction(null); setSelectedRep(null); }, [selectedSystem]);

    if (loading) return <div style={{ textAlign: 'center', padding: '5rem', fontFamily: 'var(--cinzel-font)', fontSize: '2rem' }}>EXTRAYENDO EDICTOS DEL ARCHIVO...</div>;

    return (
        <div style={{ padding: '0 2rem' }}>
            <h1 style={{ color: 'var(--secondary)' }}>Registro de Edictos Sagrados</h1>

            <div className="glass-card" style={{ marginBottom: '2rem', padding: '1rem 2rem' }}>
                {/* Search */}
                <div className="search-container" style={{ margin: '0 0 1.5rem 0', maxWidth: '600px' }}>
                    <input
                        type="text"
                        className="search-input"
                        placeholder="🔍 Buscar por nombre, facción o descripción..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <button
                    onClick={() => setShowFilters(!showFilters)}
                    style={{
                        display: 'flex', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', color: 'var(--text-main)', alignItems: 'center', cursor: 'pointer', fontFamily: 'var(--cinzel-font)', letterSpacing: '2px', fontSize: '1rem', fontWeight: 'bold'
                    }}
                >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        <Filter size={18} className="accent-gold" /> MÁS FILTROS
                    </span>
                    <motion.div animate={{ rotate: showFilters ? 180 : 0 }}><ChevronDown size={20} /></motion.div>
                </button>
                <AnimatePresence>
                    {showFilters && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            style={{ overflow: 'hidden' }}
                        >
                            <div style={{ paddingTop: '1.5rem', borderTop: '1px solid rgba(212,175,55,0.15)', marginTop: '1rem' }}>
                                <div className="controls-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                {/* SYSTEM FILTER */}
                <div className="filter-group">
                    <span className="filter-label">🌌 SISTEMA:</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <button
                            className={`filter-btn ${selectedSystem === null ? 'active' : ''}`}
                            onClick={() => setSelectedSystem(null)}
                        >TODOS</button>
                        {systems.map(sys => {
                            const sc = SYSTEM_COLORS[sys] || SYSTEM_COLORS['Desconocido'];
                            return (
                                <button
                                    key={sys}
                                    className={`filter-btn ${selectedSystem === sys ? 'active' : ''}`}
                                    onClick={() => setSelectedSystem(sys)}
                                    style={selectedSystem === sys ? { borderColor: sc.border, color: sc.text, background: sc.bg } : {}}
                                >
                                    {sc.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* MISSION TYPE FILTER */}
                <div className="filter-group">
                    <span className="filter-label"><Crosshair size={12} style={{ display: 'inline', marginRight: '0.3rem' }} />TIPO DE EDICTO:</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <button
                            className={`filter-btn ${selectedType === null ? 'active' : ''}`}
                            onClick={() => setSelectedType(null)}
                        >TODOS</button>
                        {missionTypes.map(t => (
                            <button
                                key={t}
                                className={`filter-btn ${selectedType === t ? 'active' : ''}`}
                                onClick={() => setSelectedType(t)}
                            >{t.toUpperCase()}</button>
                        ))}
                    </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
                    {/* FACTION FILTER */}
                    <div className="filter-group">
                        <span className="filter-label">🏛️ FACCIÓN:</span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                            <button
                                className={`filter-btn ${selectedFaction === null ? 'active' : ''}`}
                                onClick={() => setSelectedFaction(null)}
                            >TODAS</button>
                            {factionList.map(faction => (
                                <button
                                    key={faction}
                                    className={`filter-btn ${selectedFaction === faction ? 'active' : ''}`}
                                    onClick={() => setSelectedFaction(faction)}
                                >{faction.toUpperCase()}</button>
                            ))}
                        </div>
                    </div>

                    {/* REP FILTER (conditional) */}
                    {selectedFaction && (
                        <div className="filter-group">
                            <span className="filter-label">🎯 REPUTACIÓN:</span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                                <button
                                    className={`filter-btn ${selectedRep === null ? 'active' : ''}`}
                                    onClick={() => setSelectedRep(null)}
                                    disabled={repLevels.length === 0}
                                >TODOS</button>
                                {repLevels.map(rep => (
                                    <button
                                        key={rep}
                                        className={`filter-btn ${selectedRep === rep ? 'active' : ''}`}
                                        onClick={() => setSelectedRep(rep)}
                                    >{rep}</button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* REWARD FILTER */}
                <div className="filter-group">
                    <span className="filter-label">🛐 TIPO DE BENDICIÓN:</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <button className={`filter-btn ${rewardFilter === 'all' ? 'active' : ''}`} onClick={() => setRewardFilter('all')}>TODAS</button>
                        <button className={`filter-btn ${rewardFilter === 'blueprint' ? 'active' : ''}`} onClick={() => setRewardFilter('blueprint')}>TECNOMILAGRO</button>
                        <button className={`filter-btn ${rewardFilter === 'scrip' ? 'active' : ''}`} onClick={() => setRewardFilter('scrip')}>SCRIP</button>
                        <button className={`filter-btn ${rewardFilter === 'credits' ? 'active' : ''}`} onClick={() => setRewardFilter('credits')}>SOLO CRÉDITOS</button>
                    </div>
                </div>

                {/* Active filter / result summary */}
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--cinzel-font)', letterSpacing: '2px' }}>
                    ☩ {filteredMissions.length} EDICTOS ENCONTRADOS EN EL ARCHIVO ☩
                </div>

                {searchParams.get('id') && (
                    <div style={{ background: 'rgba(196, 30, 58, 0.05)', padding: '1rem', borderRadius: '4px', border: '1px solid var(--secondary)', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--secondary)', fontWeight: 'bold', fontFamily: 'var(--cinzel-font)' }}>🕯️ CONSULTA DE EDICTO ESPECÍFICO</span>
                            <button className="btn" style={{ fontSize: '0.7rem', padding: '0.4rem 1rem' }} onClick={() => navigate('/missions')}>VOLVER AL ARCHIVO COMPLETO</button>
                        </div>
                    </div>
                )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* CARDS */}
            <div className="grid-layout">
                {paginatedMissions.map((mission) => {
                    const sys = mission.system || 'Desconocido';
                    const sc = SYSTEM_COLORS[sys] || SYSTEM_COLORS['Desconocido'];
                    const friendlyName = mission.friendly_name || mission.name?.replaceAll('_', ' ');
                    const missionType = mission.mission_type || 'Otro';

                    return (
                        <motion.div
                            key={mission.id}
                            className="glass-card"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                height: '100%',
                                padding: '0',
                                overflow: 'hidden',
                                borderTop: `4px solid ${sc.border}`,
                            }}
                        >
                            {/* Header */}
                            <div style={{ padding: '1.2rem', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                {/* Tags row */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.8rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                        {/* System tag */}
                                        <span style={{
                                            background: sc.bg,
                                            color: sc.text,
                                            border: `1px solid ${sc.border}`,
                                            padding: '0.2rem 0.6rem',
                                            fontSize: '0.6rem',
                                            borderRadius: '4px',
                                            fontFamily: 'var(--cinzel-font)',
                                            letterSpacing: '1px',
                                            fontWeight: 'bold',
                                        }}>
                                            {sc.label}
                                        </span>
                                        {/* Mission type tag */}
                                        <span style={{
                                            background: 'rgba(196,30,58,0.08)',
                                            color: 'var(--primary)',
                                            border: '1px solid rgba(196,30,58,0.3)',
                                            padding: '0.2rem 0.6rem',
                                            fontSize: '0.6rem',
                                            borderRadius: '4px',
                                            fontFamily: 'var(--cinzel-font)',
                                            letterSpacing: '1px',
                                        }}>
                                            {missionType.toUpperCase()}
                                        </span>
                                    </div>
                                    {/* Rep tag */}
                                    <span style={{
                                        background: 'rgba(255,255,255,0.04)',
                                        color: 'var(--text-muted)',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        padding: '0.2rem 0.6rem',
                                        fontSize: '0.6rem',
                                        borderRadius: '4px',
                                        fontFamily: 'var(--cinzel-font)',
                                        letterSpacing: '1px',
                                    }}>
                                        REP: {mission.reputation_required || 'Neutral'}
                                    </span>
                                </div>

                                {/* Readable name (clickable) */}
                                <button
                                    onClick={() => navigate(`/missions?id=${mission.id}`, { state: { breadcrumbLabel: `EDICTO: ${friendlyName}` } })}
                                    style={{
                                        background: 'none', border: 'none', padding: '0',
                                        textAlign: 'left', width: '100%',
                                        fontSize: '1.05rem',
                                        fontWeight: 'bold',
                                        color: 'var(--text-main)',
                                        cursor: 'pointer',
                                        fontFamily: 'var(--cinzel-font)',
                                        letterSpacing: '1px',
                                        lineHeight: 1.3,
                                        marginBottom: '0.3rem',
                                        display: '-webkit-box',
                                        WebkitLineClamp: '2',
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                    }}
                                    className="hover-primary"
                                    title={mission.name}
                                >
                                    {friendlyName}
                                </button>

                                {/* Faction sub-label */}
                                <div style={{ fontSize: '0.65rem', color: 'var(--secondary)', fontFamily: 'var(--cinzel-font)', letterSpacing: '2px', marginBottom: '0.8rem', opacity: 0.8 }}>
                                    <Globe size={10} style={{ display: 'inline', marginRight: '0.3rem', verticalAlign: 'middle' }} />
                                    {mission.faction?.toUpperCase() || 'INDEPENDENT'}
                                </div>

                                {/* Rewards bar */}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#d4af37' }}>
                                        <Coins size={14} />
                                        <strong>{mission.credits?.toLocaleString() || 0}</strong>
                                        <span style={{ fontSize: '0.6rem' }}>aUEC</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--primary)' }}>
                                        <TrendingUp size={14} />
                                        <strong>+{mission.standing || 0}</strong>
                                        <span style={{ fontSize: '0.6rem' }}>REP</span>
                                    </div>
                                    {mission.script_items?.map((item: any) => (
                                        <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#c084fc' }}>
                                            <Award size={14} />
                                            <strong>{item.amount || 1}</strong>
                                            <span style={{ fontSize: '0.6rem' }}>{item.name?.toUpperCase()}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Body */}
                            <div style={{ padding: '1.2rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                                <div
                                    style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}
                                    dangerouslySetInnerHTML={{
                                        __html: (mission.overview || mission.description || 'Sin descripción disponible para este edicto.')
                                            .replaceAll('<EM4>', '<strong style="color: var(--primary)">')
                                            .replaceAll('</EM4>', '</strong>')
                                            .replaceAll(String.raw`\\n`, '<br/>')
                                            .replaceAll('\n', '<br/>')
                                    }}
                                />

                                {/* Tactical Analysis */}
                                {mission.tactical_analysis?.length > 0 && (
                                    <div style={{
                                        padding: '1rem',
                                        background: 'rgba(0,0,0,0.4)',
                                        borderRadius: '8px',
                                        border: '1px solid rgba(255,255,255,0.05)',
                                        display: 'flex', flexDirection: 'column', gap: '0.8rem'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.7rem', color: 'var(--secondary)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--cinzel-font)' }}>
                                            <Zap size={14} /> INTELIGENCIA SAGRADA
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            {mission.tactical_analysis.map((tip: any) => {
                                                const isPro = tip.type === 'pro';
                                                const borderCol = tip.type === 'bug_avoidance' ? '#ff4444' : isPro ? 'var(--secondary)' : 'var(--primary)';
                                                const icon = tip.type === 'bug_avoidance' ? <Bug size={12} /> : isPro ? <Trophy size={12} /> : tip.type === 'loadout' ? <Shield size={12} /> : <Zap size={12} />;
                                                return (
                                                    <div key={`${tip.type}-${tip.content?.substring(0, 20)}`} style={{
                                                        display: 'flex', gap: '0.6rem', fontSize: '0.75rem',
                                                        padding: '0.4rem',
                                                        background: isPro ? 'rgba(255,215,0,0.05)' : 'rgba(255,255,255,0.02)',
                                                        borderRadius: '4px',
                                                        borderLeft: `2px solid ${borderCol}`
                                                    }}>
                                                        <div style={{ color: borderCol }}>{icon}</div>
                                                        <div style={{ color: isPro ? 'var(--text-main)' : 'var(--text-muted)', lineHeight: '1.2' }}>{tip.content}</div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Blueprint rewards */}
                                {mission.probability_rewards?.length > 0 && (
                                    <div>
                                        <h4 style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--secondary)', marginBottom: '0.8rem', letterSpacing: '1px', fontFamily: 'var(--cinzel-font)' }}>
                                            <Award size={14} /> TECNOMILAGROS RELACIONADOS:
                                        </h4>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                            {mission.probability_rewards.map((reward: any) => (
                                                <button
                                                    key={reward.id}
                                                    className="filter-btn"
                                                    style={{ fontSize: '0.65rem', padding: '0.3rem 0.6rem', borderRadius: '4px', background: 'rgba(212,175,55,0.05)', color: 'var(--secondary)', border: '1px solid rgba(212,175,55,0.2)' }}
                                                    onClick={() => navigate(`/recipes?id=${reward.id}`, { state: { breadcrumbLabel: `TECNOMILAGRO: ${reward.label || reward.name}` } })}
                                                >
                                                    {reward.label || reward.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
            />
        </div>
    );
};

export default Missions;

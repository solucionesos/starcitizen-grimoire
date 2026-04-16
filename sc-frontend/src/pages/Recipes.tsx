import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { getBlueprints, getMissions } from '../api/client';
import Pagination from '../components/Pagination';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Target, Filter, ChevronDown, Flame } from 'lucide-react';
import { useAltar } from '../context/AltarContext';
import { AnimatePresence } from 'framer-motion';

const Recipes: React.FC = () => {
    const navigate = useNavigate();
    const { addToAltar } = useAltar();
    const [searchParams] = useSearchParams();
    const [recipes, setRecipes] = useState<any[]>([]);
    const [allMissions, setAllMissions] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [showFilters, setShowFilters] = useState(false);
    const itemsPerPage = 9;

    useEffect(() => {
        Promise.all([getBlueprints(), getMissions()])
            .then(([bpsData, msData]) => {
                const list = Array.isArray(bpsData) ? bpsData : (bpsData.blueprints || []);
                setRecipes(list);
                
                const mList = Array.isArray(msData) ? msData : (msData.missions || []);
                const mDict: Record<string, any> = {};
                mList.forEach((m: any) => { mDict[m.id] = m; });
                setAllMissions(mDict);
            })
            .catch(err => console.error("Error loading recipes/missions:", err))
            .finally(() => setLoading(false));
    }, []);

    const types = useMemo(() => {
        return [...new Set(recipes.map(r => r.type).filter(Boolean))].sort();
    }, [recipes]);

    const filteredRecipes = useMemo(() => {
        let rs = recipes;
        
        const filterId = searchParams.get('id');
        if (filterId) {
            rs = rs.filter(r => r.id === filterId);
        }

        if (selectedType) {
            rs = rs.filter(r => r.type === selectedType);
        }
        if (searchTerm) {
            rs = rs.filter(r => 
                (r.name || r.label || "").toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        return rs;
    }, [recipes, searchTerm, selectedType, searchParams]);

    const totalPages = Math.ceil(filteredRecipes.length / itemsPerPage);
    const paginatedRecipes = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredRecipes.slice(start, start + itemsPerPage);
    }, [filteredRecipes, currentPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedType]);

    if (loading) return <div style={{ textAlign: 'center', padding: '5rem', fontFamily: 'var(--cinzel-font)', fontSize: '2rem' }}>CONSULTANDO REGISTROS DEL VACÍO...</div>;

    return (
        <div style={{ padding: '0 2rem' }}>
            <h1 style={{ marginBottom: '1rem', color: 'var(--secondary)' }}>Archive de Tecnomilagros</h1>
            
            <div className="glass-card" style={{ marginBottom: '2rem', padding: '1rem 2rem' }}>
                <div className="search-container" style={{ margin: '0 0 1.5rem 0', width: '100%' }}>
                    <input 
                        type="text" 
                        className="search-input" 
                        placeholder="🔍 Buscar blueprint..." 
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
                                <div className="controls-container">


                <div className="filter-group">
                    <span className="filter-label">🏷️ TIPO:</span>
                    <button 
                        className={`filter-btn ${selectedType === null ? 'active' : ''}`}
                        onClick={() => setSelectedType(null)}
                    >TODOS</button>
                    {types.map(type => (
                        <button 
                            key={type}
                            className={`filter-btn ${selectedType === type ? 'active' : ''}`}
                            onClick={() => setSelectedType(type)}
                        >
                            {type.toUpperCase()}
                        </button>
                    ))}
                </div>
                {searchParams.get('id') && (
                    <button className="btn" style={{ fontSize: '0.7rem', padding: '0.4rem' }} onClick={() => navigate('/recipes')}>DISOLVER EDICTO</button>
                )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="grid-layout">
                {paginatedRecipes.map((recipe, idx) => (
                    <motion.div 
                        key={idx} 
                        className="glass-card"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: (idx % itemsPerPage) * 0.05 }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <h3 className="accent-cyan">{recipe.name || recipe.label}</h3>
                            <span style={{ fontSize: '0.65rem', background: 'rgba(255, 62, 62, 0.1)', color: 'var(--primary)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{recipe.type?.toUpperCase()}</span>
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>ID: {recipe.id}</p>
                        <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '1rem 0' }} />
                        
                        <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                           📦 OFRENDAS AL VACÍO:
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {recipe.parts?.map((part: any, pIdx: number) => (
                                <div 
                                    key={pIdx} 
                                    style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', cursor: 'pointer' }}
                                    onClick={() => {
                                        if (part.resourceId) {
                                            navigate(`/recurso/${part.resourceId}`, { state: { breadcrumbLabel: `OFRENDA: ${part.label || part.name}` } });
                                        } else {
                                            navigate(`/mapa?tags=${encodeURIComponent(part.label || part.name)}`);
                                        }
                                    }}
                                    title="Click para ver donde sacrificar"
                                >
                                    <span style={{ color: part.resourceId ? 'var(--primary)' : 'inherit', textDecoration: part.resourceId ? 'underline' : 'none' }}>
                                        {part.label || part.name}
                                    </span>
                                    <span className="accent-amber">x{part.amount}</span>
                                </div>
                            ))}
                        </div>

                        <div style={{ marginTop: '1.5rem' }}>
                            <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--secondary)' }}>
                                <Target size={14} className="accent-gold" /> LITANIA DE DESBLOQUEO (EDICTOS):
                            </h4>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                {recipe.missions && recipe.missions.length > 0 ? (
                                    recipe.missions.map((m: any, mIdx: number) => {
                                        const fullMission = allMissions[m.id] || {};
                                        const friendlyName = fullMission.friendly_name || fullMission.name?.replaceAll('_', ' ') || m.name?.replaceAll('_', ' ') || 'EDICTO';
                                        return (
                                            <button 
                                                key={mIdx}
                                                className="filter-btn"
                                                onClick={() => navigate(`/missions?id=${m.id}`, { state: { breadcrumbLabel: `EDICTO: ${friendlyName}` } })}
                                                style={{ 
                                                    fontSize: '0.65rem', 
                                                    maxWidth: '100%', 
                                                    overflow: 'hidden', 
                                                    textOverflow: 'ellipsis', 
                                                    whiteSpace: 'nowrap',
                                                    display: 'inline-block',
                                                    textAlign: 'left'
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
                                className="filter-btn"
                                style={{ padding: '0.75rem 1.2rem', borderColor: 'var(--secondary)', color: 'var(--secondary)' }} 
                                onClick={() => addToAltar(recipe)}
                                title="Añadir al Rito de Transmutación"
                            >
                                <Flame size={16} style={{ display: 'inline', marginRight: '0.4rem', verticalAlign: 'text-top' }} /> CONSAGRAR
                            </button>
                            <button 
                                className="btn" 
                                onClick={() => {
                                    const tags = recipe.parts?.map((p: any) => encodeURIComponent(p.label || p.name)).join(',');
                                    navigate(`/mapa?tags=${tags}`, { state: { breadcrumbLabel: `REQ: ${recipe.name || 'BLUEPRINT'}` } });
                                }}
                            >
                                EXPLORAR CARTOGRAFÍA
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>

            <Pagination 
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
            />
        </div>
    );
};

export default Recipes;

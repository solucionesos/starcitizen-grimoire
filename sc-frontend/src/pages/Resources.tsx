import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { getResources } from '../api/client';
import { Database, Map as MapIcon, X, Filter, ChevronDown } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import Pagination from '../components/Pagination';
import { useSearchParams, Link } from 'react-router-dom';

const Resources: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [resources, setResources] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSystem, setSelectedSystem] = useState<string | null>(searchParams.get('system'));
    const [selectedMiningType, setSelectedMiningType] = useState<string | null>(null);
    const [selectedLocType, setSelectedLocType] = useState<string | null>(null);
    const [selectedBody, setSelectedBody] = useState<string | null>(searchParams.get('body'));
    
    // Multi-tag search state
    const initialTags = useMemo(() => {
        const t = searchParams.get('tags');
        return t ? t.split(',').filter(Boolean) : [];
    }, [searchParams]);

    const [searchTags, setSearchTags] = useState<string[]>(initialTags);
    const [inputValue, setInputValue] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [showFilters, setShowFilters] = useState(false);
    const itemsPerPage = 10;

    useEffect(() => {
        getResources()
            .then((data: any) => {
                const list = Array.isArray(data) ? data : (data.resources || []);
                setResources(list);
            })
            .finally(() => setLoading(false));
    }, []);

    // Sync tags with URL
    useEffect(() => {
        const newParams = new URLSearchParams(searchParams);
        if (searchTags.length > 0) newParams.set('tags', searchTags.join(','));
        else newParams.delete('tags');
        
        if (selectedSystem) newParams.set('system', selectedSystem);
        else newParams.delete('system');
        
        if (selectedBody) newParams.set('body', selectedBody);
        else newParams.delete('body');
        
        setSearchParams(newParams);
    }, [searchTags, selectedSystem, selectedBody]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const val = inputValue.trim().toLowerCase();
            if (val && !searchTags.includes(val)) {
                setSearchTags([...searchTags, val]);
                setInputValue('');
            }
        } else if (e.key === 'Backspace' && !inputValue && searchTags.length > 0) {
            setSearchTags(searchTags.slice(0, -1));
        }
    };

    const removeTag = (tag: string) => {
        setSearchTags(searchTags.filter(t => t !== tag));
    };

    const systems = useMemo(() => {
        const all = new Set<string>();
        resources.forEach(r => {
            const parts = (r.parent || 'Stanton').split(' / ');
            parts.forEach((p: string) => all.add(p.trim()));
        });
        return Array.from(all).sort((a, b) => a.localeCompare(b));
    }, [resources]);

    const miningTypes = useMemo(() => {
        const all = new Set<string>();
        resources.forEach(r => {
            if (r.type) {
                r.type.split(' / ').forEach((t: string) => all.add(t.trim()));
            }
        });
        return Array.from(all).sort((a, b) => a.localeCompare(b));
    }, [resources]);

    const locTypes = useMemo(() => {
        const all = new Set<string>();
        resources.forEach(r => {
            r.locationsDetail?.forEach((l: any) => all.add(l.type));
        });
        return Array.from(all).sort((a, b) => a.localeCompare(b));
    }, [resources]);

    const bodies = useMemo(() => {
        const all = new Set<string>();
        resources.forEach(r => {
            r.locations?.forEach((l: string) => {
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
            rs = rs.filter(r => (r.parent || 'Stanton').includes(selectedSystem));
        }
        if (selectedMiningType) {
            rs = rs.filter(r => r.type?.includes(selectedMiningType));
        }
        if (selectedLocType) {
            rs = rs.filter(r => r.locationsDetail?.some((l: any) => l.type === selectedLocType));
        }
        if (selectedBody) {
            rs = rs.filter(r => r.locations?.includes(selectedBody));
        }
        if (searchTags.length > 0) {
            rs = rs.filter(r => 
                searchTags.some(tag => {
                    let normTag = tag.toLowerCase().trim();
                    if (normTag === 'aluminum') normTag = 'aluminium';
                    if (normTag === 'titainum') normTag = 'titanium';
                    const resName = (r.name || "").toLowerCase();
                    return resName.includes(normTag) || normTag.includes(resName.split(' ')[0]);
                })
            );
        }
        return rs;
    }, [resources, selectedSystem, selectedMiningType, selectedLocType, selectedBody, searchTags]);


    const totalPages = Math.ceil(filteredResources.length / itemsPerPage);
    const paginatedResources = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredResources.slice(start, start + itemsPerPage);
    }, [filteredResources, currentPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTags, selectedSystem, selectedMiningType, selectedLocType, selectedBody]);

    if (loading) return <div style={{ textAlign: 'center', padding: '5rem', fontFamily: 'var(--cinzel-font)', fontSize: '2rem' }}>EXTRAYENDO REGISTROS DE OFRENDAS...</div>;

    return (
        <div style={{ padding: '0 2rem' }}>
            <h1 style={{ color: 'var(--secondary)' }}>Cartografía de Ofrendas</h1>
            
            <div className="glass-card" style={{ marginBottom: '2rem', padding: '1rem 2rem' }}>
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    style={{
                        display: 'flex', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', color: 'var(--text-main)', alignItems: 'center', cursor: 'pointer', fontFamily: 'var(--cinzel-font)', letterSpacing: '2px', fontSize: '1rem', fontWeight: 'bold'
                    }}
                >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        <Filter size={18} className="accent-gold" /> FILTROS DEL ARCHIVO
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
                                <div className="controls-container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', gap: '1rem', width: '100%', flexWrap: 'wrap' }}>
                    <div className="search-container" style={{ 
                        margin: 0, 
                        flex: 1, 
                        minWidth: '300px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.5rem',
                        flexWrap: 'wrap',
                        padding: '0.4rem 1rem',
                        minHeight: '45px'
                    }}>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                            {searchTags.map(tag => (
                                <span key={tag} style={{ 
                                    background: 'var(--primary)', 
                                    color: 'black', 
                                    padding: '0.1rem 0.5rem', 
                                    borderRadius: '4px', 
                                    fontSize: '0.75rem', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '0.3rem',
                                    fontWeight: 'bold'
                                }}>
                                    {tag.toUpperCase()}
                                    <X size={12} onClick={() => removeTag(tag)} style={{ cursor: 'pointer' }} />
                                </span>
                            ))}
                        </div>
                        <input 
                            type="text" 
                            style={{ 
                                background: 'transparent', 
                                border: 'none', 
                                color: 'var(--text)', 
                                outline: 'none', 
                                flex: 1,
                                fontSize: '0.9rem',
                                minWidth: '150px'
                            }}
                            placeholder={searchTags.length === 0 ? "🔍 Buscar ofrendas (ej: Cu, Agricium...)" : "Añadir más etiquetas..."}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                    </div>
                    <select 
                        className="filter-btn" 
                        style={{ padding: '0 1rem', background: 'rgba(0,0,0,0.5)' }}
                        value={selectedBody || ''}
                        onChange={(e) => setSelectedBody(e.target.value || null)}
                    >
                        <option value="">🎯 CUERPO ESPECÍFICO (TODOS)</option>
                        {bodies.map(b => <option key={b} value={b}>{b.toUpperCase()}</option>)}
                    </select>
                </div>

                <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                    <div className="filter-group">
                        <span className="filter-label">🌌 SISTEMA:</span>
                        <button className={`filter-btn ${selectedSystem === null ? 'active' : ''}`} onClick={() => setSelectedSystem(null)}>TODO</button>
                        {systems.map(s => <button key={s} className={`filter-btn ${selectedSystem === s ? 'active' : ''}`} onClick={() => setSelectedSystem(s)}>{s}</button>)}
                    </div>
                    <div className="filter-group">
                        <span className="filter-label">⚙️ MÉTODO:</span>
                        <button className={`filter-btn ${selectedMiningType === null ? 'active' : ''}`} onClick={() => setSelectedMiningType(null)}>TODO</button>
                        {miningTypes.map(t => <button key={t} className={`filter-btn ${selectedMiningType === t ? 'active' : ''}`} onClick={() => setSelectedMiningType(t)}>{t}</button>)}
                    </div>
                </div>

                <div className="filter-group">
                    <span className="filter-label">📍 TIPO LUGAR:</span>
                    <button className={`filter-btn ${selectedLocType === null ? 'active' : ''}`} onClick={() => setSelectedLocType(null)}>TODO</button>
                    {locTypes.map(t => <button key={t} className={`filter-btn ${selectedLocType === t ? 'active' : ''}`} onClick={() => setSelectedLocType(t)}>{t.toUpperCase()}</button>)}
                </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="grid-layout">
                {paginatedResources.map((resource) => (
                    <motion.div 
                        key={resource.id} 
                        className="glass-card" 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        style={{ borderLeft: '4px solid var(--primary)', position: 'relative' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Link to={`/recurso/${resource.id}`} state={{ breadcrumbLabel: `OFRENDA: ${resource.name}` }} style={{ textDecoration: 'none' }}>
                                <h3 className="accent-gold hover-underline">{resource.name}</h3>
                            </Link>
                            <span style={{ fontSize: '0.65rem', background: 'rgba(255, 62, 62, 0.1)', color: 'var(--primary)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid currentColor' }}>
                                {resource.type?.toUpperCase()}
                            </span>
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <MapIcon size={12} /> {resource.parent}
                        </p>
                        
                        <div style={{ marginTop: '1.2rem', padding: '0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                            <h4 style={{ fontSize: '0.8rem', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <Database size={14} className="accent-amber" /> SEÑAL ESCANEO:
                            </h4>
                            <div className="responsive-grid-3" style={{ gap: '0.4rem' }}>
                                {[1, 2, 3].map(c => (
                                    <div key={c} style={{ fontSize: '0.7rem', border: '1px solid rgba(255,255,255,0.05)', padding: '0.3rem', borderRadius: '4px', textAlign: 'center' }}>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.55rem' }}>x{c}</div>
                                        <div className="accent-amber">{(resource.baseEmission || 4000) * c}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={{ marginTop: '1.2rem' }}>
                            <h4 style={{ fontSize: '0.8rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>
                                {selectedLocType || selectedBody ? 'UBICACIONES FILTRADAS' : 'LOCACIONES Y CLUMPING'} 
                                ({
                                    resource.locationsDetail?.filter((l: any) => {
                                        let match = true;
                                        if (selectedSystem) match = match && l.system === selectedSystem;
                                        if (selectedLocType) match = match && l.type === selectedLocType;
                                        if (selectedBody) match = match && (l.system + ': ' + l.name + ' (' + l.type + ')') === selectedBody;
                                        return match;
                                    }).length || 0
                                }):
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                {resource.locationsDetail?.filter((l: any) => {
                                    let match = true;
                                    if (selectedSystem) match = match && l.system === selectedSystem;
                                    if (selectedLocType) match = match && l.type === selectedLocType;
                                    if (selectedBody) match = match && (l.system + ': ' + l.name + ' (' + l.type + ')') === selectedBody;
                                    return match;
                                }).slice(0, 5).map((loc: any, lIdx: number) => (
                                    <div key={lIdx} style={{ 
                                        fontSize: '0.7rem', 
                                        background: 'rgba(255,255,255,0.03)', 
                                        padding: '0.4rem 0.6rem', 
                                        borderRadius: '4px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        borderLeft: '2px solid var(--primary)'
                                    }}>
                                        <Link 
                                            to={`/locacion/${loc.system}/${loc.name}`}
                                            state={{ breadcrumbLabel: `RITO: ${loc.name}` }}
                                            style={{ textDecoration: 'none', color: 'inherit', display: 'flex', justifyContent: 'space-between', width: '100%' }}
                                        >
                                            <span>{loc.system}: <strong>{loc.name}</strong> <span style={{opacity: 0.6}}>({loc.type})</span></span>
                                            <span className="accent-amber" style={{ fontSize: '0.65rem' }}>{loc.clustering || '1 item'}</span>
                                        </Link>
                                    </div>
                                ))}
                                {resource.locationsDetail?.filter((l: any) => {
                                    let match = true;
                                    if (selectedSystem) match = match && l.system === selectedSystem;
                                    if (selectedLocType) match = match && l.type === selectedLocType;
                                    if (selectedBody) match = match && (l.system + ': ' + l.name + ' (' + l.type + ')') === selectedBody;
                                    return match;
                                }).length > 5 && <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center' }}>+ Otros resultados...</p>}
                            </div>
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

export default Resources;


import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getResources } from '../api/client';
import { Database, ArrowLeft, Locate } from 'lucide-react';

import Pagination from '../components/Pagination';

const LocationDetail: React.FC = () => {
    const { system, name } = useParams<{ system: string; name: string }>();
    const [resources, setResources] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        getResources().then(setResources).finally(() => setLoading(false));
    }, []);

    const locationResources = useMemo(() => {
        if (!name || !system) return [];
        const cleanName = name.toLowerCase().split('(')[0].trim();
        const cleanSystem = system.toLowerCase().trim();

        return resources.filter(r => 
            r.locationsDetail?.some((l: any) => {
                const lName = l.name?.toLowerCase() || '';
                const lSystem = l.system?.toLowerCase() || '';
                return lSystem.includes(cleanSystem) && (lName.includes(cleanName) || cleanName.includes(lName));
            })
        );
    }, [resources, system, name]);

    const paginatedResources = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return locationResources.slice(start, start + itemsPerPage);
    }, [locationResources, currentPage]);

    const totalPages = Math.ceil(locationResources.length / itemsPerPage);

    const locationInfo = useMemo(() => {
        const sample = locationResources[0]?.locationsDetail?.find((l: any) => {
            const lName = l.name?.toLowerCase() || '';
            const lSystem = l.system?.toLowerCase() || '';
            const cleanName = name?.toLowerCase().split('(')[0].trim() || '';
            const cleanSystem = system?.toLowerCase().trim() || '';
            return lSystem.includes(cleanSystem) && (lName.includes(cleanName) || cleanName.includes(lName));
        });
        return sample || { system, name, type: 'N/A' };
    }, [locationResources, system, name]);

    if (loading) return <div style={{ textAlign: 'center', padding: '5rem' }}>CARGANDO UBICACIÓN...</div>;
    if (locationResources.length === 0) return <div style={{ textAlign: 'center', padding: '5rem' }}>UBICACIÓN O RECURSOS NO ENCONTRADOS</div>;

    return (
        <div style={{ padding: '0 2rem' }}>
            <Link to="/mapa" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', textDecoration: 'none', marginBottom: '2rem' }}>
                <ArrowLeft size={16} /> VOLVER AL LOCALIZADOR
            </Link>

            <div style={{ marginBottom: '2rem' }}>
                <div style={{ fontSize: '1rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>{locationInfo.system} SYSTEM</div>
                <h1 className="accent-cyan" style={{ fontSize: '3.5rem', marginBottom: '0.5rem' }}>{locationInfo.name}</h1>
                <span style={{ fontSize: '0.8rem', background: 'rgba(255, 242, 0, 0.1)', color: 'var(--accent-amber)', padding: '0.4rem 1rem', borderRadius: '40px', border: '1px solid currentColor' }}>
                    TIPO: {locationInfo.type?.toUpperCase()}
                </span>
            </div>

            <div className="glass-card" style={{ marginTop: '2rem' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '2.5rem' }}>
                    <Database className="accent-cyan" size={32} /> RECURSOS DETECTADOS ({locationResources.length})
                </h2>
                
                <div className="grid-layout">
                    {paginatedResources.map((resource, idx) => (
                        <motion.div 
                            key={resource.id || idx} 
                            className="glass-card" 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            style={{ 
                                transition: 'transform 0.3s',
                                borderLeft: '3px solid var(--primary)'
                            }}
                        >
                            <Link to={`/recurso/${resource.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <h3 className="accent-cyan" style={{ fontSize: '1.4rem' }}>{resource.name}</h3>
                                    <span style={{ fontSize: '0.6rem', color: 'var(--primary)', border: '1px solid currentColor', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                                        {resource.type?.toUpperCase()}
                                    </span>
                                </div>
                                <div style={{ marginTop: '1.5rem', padding: '0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                                    <div>
                                        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>EMISIÓN BASE</div>
                                        <div className="accent-amber" style={{ fontWeight: 'bold' }}>{resource.baseEmission || 4000} sc</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>RAREZA</div>
                                        <div style={{ fontWeight: 'bold' }}>{resource.rarity?.toUpperCase() || 'COMMON'}</div>
                                    </div>
                                </div>
                                <div style={{ marginTop: '1rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                    <Locate size={10} /> CLUMPING EN ESTA ZONA: 
                                    <span style={{ color: 'var(--primary)', marginLeft: '0.5rem' }}>
                                        {resource.locationsDetail?.find((l: any) => l.system === system && l.name === name)?.clustering || '1 item'}
                                    </span>
                                </div>
                            </Link>
                        </motion.div>
                    ))}
                </div>
                <Pagination 
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                />
            </div>
        </div>
    );
};

export default LocationDetail;

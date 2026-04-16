import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getResources, getBlueprints } from '../api/client';
import { MapIcon, Database, ArrowLeft, Zap } from 'lucide-react';

const ResourceDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [resources, setResources] = useState<any[]>([]);
    const [blueprints, setBlueprints] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        Promise.all([getResources(), getBlueprints()])
            .then(([resData, bpData]) => {
                const list = Array.isArray(resData) ? resData : (resData.resources || []);
                const bList = Array.isArray(bpData) ? bpData : (bpData.blueprints || []);
                setResources(list);
                setBlueprints(bList);
            })
            .catch(err => {
                console.error("Error fetching resource detail:", err);
                setError("No se pudo conectar con el banco de datos.");
            })
            .finally(() => setLoading(false));
    }, []);

    const resource = useMemo(() => resources.find(r => r.id === id), [resources, id]);
    const resourceBlueprints = useMemo(() => {
        if (!resource) return [];
        const normalizedResourceName = resource.name.toLowerCase();
        return blueprints.filter(b => b.parts?.some((m: any) => {
            const partName = (m.label || m.name || "").toLowerCase();
            return normalizedResourceName.includes(partName) || 
                   partName.includes(normalizedResourceName) || 
                   m.resourceId === resource.id;
        }));
    }, [blueprints, resource]);

    if (loading) return <div style={{ textAlign: 'center', padding: '5rem', fontFamily: 'var(--cinzel-font)', fontSize: '2rem' }}>CONSULTANDO ALMAS DE OFRENDAS...</div>;
    if (error) return <div style={{ textAlign: 'center', padding: '5rem', color: '#ff4444' }}>{error}</div>;
    if (!resource) return <div style={{ textAlign: 'center', padding: '5rem' }}>OFRENDA NO ENCONTRADA EN EL ARCHIVO</div>;

    const clusters = [1, 2, 3, 4, 5, 6, 12, 24];
    const allLocations = resource.locationsDetail || [];

    return (
        <div style={{ padding: '0 2rem' }}>
            <Link to="/mapa" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', textDecoration: 'none', marginBottom: '2rem' }}>
                <ArrowLeft size={16} /> REGRESAR A LA CARTOGRAFÍA ✠
            </Link>

            <div className="responsive-grid-2">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                    <div className="glass-card" style={{ position: 'sticky', top: '6rem' }}>
                        <h1 className="accent-gold" style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{resource.name}</h1>
                        <span style={{ fontSize: '0.8rem', background: 'rgba(255, 62, 62, 0.1)', color: 'var(--primary)', padding: '0.3rem 0.8rem', borderRadius: '4px', border: '1px solid currentColor' }}>
                            MÉTODO: {resource.type?.toUpperCase()}
                        </span>
                        
                        <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px' }}>
                                <Database className="accent-amber" size={24} />
                                <div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>EMISIÓN BASE</div>
                                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{resource.baseEmission || 4000} sc</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px' }}>
                                <Zap className="accent-cyan" size={24} />
                                <div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>RAREZA ESTIMADA</div>
                                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{resource.rarity?.toUpperCase() || 'COMMON'}</div>
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: '2rem' }}>
                            <h4 className="accent-amber" style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>TABLA DE SEÑALES (POR CLUSTER):</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                                {clusters.map(c => (
                                    <div key={c} style={{ background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '6px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>x{c} NODOS</div>
                                        <div style={{ color: 'var(--accent-amber)', fontWeight: 'bold' }}>{(resource.baseEmission || 4000) * c}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    
                    {resourceBlueprints.length > 0 && (
                        <div className="glass-card">
                            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.5rem', color: 'var(--secondary)' }}>
                                <Zap className="accent-gold" size={28} /> TECNOMILAGROS ({resourceBlueprints.length})
                            </h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                {resourceBlueprints.map((bp) => (
                                    <Link 
                                        key={bp.id} 
                                        to={`/recipes?id=${bp.id}`} 
                                        style={{ textDecoration: 'none', color: 'inherit' }}
                                    >
                                        <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '4px solid var(--primary)', transition: 'transform 0.2s', cursor: 'pointer' }} className="hover-glow">
                                            <div>
                                                <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{bp.name}</div>
                                                <span style={{ fontSize: '0.6rem', opacity: 0.6, background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>
                                                    IR AL RITO →
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="glass-card">
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '2rem', color: 'var(--secondary)' }}>
                            <MapIcon className="accent-gold" size={28} /> LOCALIZACIONES SAGRADAS ({allLocations.length})
                        </h2>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            {allLocations.map((loc: any, idx: number) => (
                                <Link 
                                    key={idx} 
                                    to={`/locacion/${loc.system}/${loc.name}`} 
                                    style={{ textDecoration: 'none', color: 'inherit' }}
                                >
                                    <div style={{ 
                                        padding: '1rem', 
                                        background: 'rgba(255,255,255,0.03)', 
                                        borderRadius: '8px', 
                                        display: 'flex', 
                                        justifyContent: 'space-between', 
                                        alignItems: 'center',
                                        borderLeft: '4px solid var(--primary)',
                                        transition: 'transform 0.2s',
                                        cursor: 'pointer'
                                    }}
                                    className="hover-glow"
                                    >
                                        <div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--primary)', marginBottom: '0.2rem' }}>{loc.system}</div>
                                            <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{loc.name}</div>
                                            <span style={{ fontSize: '0.6rem', opacity: 0.6, background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>
                                                {loc.type?.toUpperCase()}
                                            </span>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>CLUMPING</div>
                                            <div className="accent-amber" style={{ fontWeight: 'bold' }}>{loc.clustering || '1 item'}</div>
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

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket, Crosshair, Shield, Coins, AlertCircle, Search, Filter } from 'lucide-react';
import { getMissions } from '../api/client';
import { useNavigate } from 'react-router-dom';

const CATEGORIES = [
  { id: 'Todos', label: 'TODOS', icon: Filter, color: 'var(--text-main)' },
  { id: 'Nave', label: 'NAVES', icon: Rocket, color: 'var(--primary)' },
  { id: 'Arma', label: 'ARMAS', icon: Crosshair, color: '#f87171' },
  { id: 'Armadura', label: 'ARMADURAS', icon: Shield, color: '#60a5fa' },
  { id: 'Intercambios', label: 'INTERCAMBIOS', icon: Coins, color: 'var(--secondary)' },
];

const Wikelo: React.FC = () => {
  const navigate = useNavigate();
  const [missionsDB, setMissionsDB] = useState<any[]>([]);
  const [wikeloConfig, setWikeloConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // New Search and Filter State
  const [activeFilter, setActiveFilter] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    Promise.all([
      getMissions(),
      fetch('/data/wikelo.json').then(r => r.json())
    ])
      .then(([dbData, configData]) => {
        setMissionsDB(Array.isArray(dbData) ? dbData : (dbData.missions || []));
        setWikeloConfig(configData);
      })
      .catch(err => console.error("Error loading Wikelo data:", err))
      .finally(() => setLoading(false));
  }, []);

  const getCategoryColor = (cat: string) => {
    switch (cat?.toLowerCase()) {
      case 'nave': return 'var(--primary)';
      case 'arma': return '#f87171';
      case 'armadura': return '#60a5fa';
      default: return 'var(--secondary)';
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat?.toLowerCase()) {
      case 'nave': return <Rocket size={12} />;
      case 'arma': return <Crosshair size={12} />;
      case 'armadura': return <Shield size={12} />;
      default: return <Coins size={12} />;
    }
  };

  const filteredData = useMemo(() => {
    let data = wikeloConfig?.items || [];

    // Filter by Category
    if (activeFilter !== 'Todos') {
      data = data.filter((item: any) => item.categoria === activeFilter);
    }

    // Filter by Search Query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      data = data.filter((item: any) => 
        (item.name || '').toLowerCase().includes(q) || 
        (item.soborno || '').toLowerCase().includes(q) ||
        (item.mision_nombre || '').toLowerCase().includes(q)
      );
    }

    return data;
  }, [wikeloConfig, activeFilter, searchQuery]);

  return (
    <div style={{ padding: '0 2rem' }}>
      <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid rgba(212,175,55,0.2)', paddingBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div>
          <h1 style={{ color: 'var(--secondary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            Wikelo "El Estafador"
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontFamily: 'var(--cinzel-font)', letterSpacing: '1px' }}>
            Mercado Negro Clandestino / Catálogo Versión {wikeloConfig?.version || '4.7.1'}
          </p>
        </div>
      </div>

      {/* Control Panel: Filters + Search */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '600px' }}>
          <Search size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Buscar cargamento, armamento o precio de soborno..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '1rem 1rem 1rem 3rem',
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(212,175,55,0.3)',
              borderRadius: '4px',
              color: 'var(--text-main)',
              fontSize: '1rem',
              outline: 'none',
              fontFamily: 'var(--main-font)'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const isActive = activeFilter === cat.id;
            // Optionally compute counts for each category specifically:
            const count = cat.id === 'Todos' 
              ? (wikeloConfig?.items?.length || 0) 
              : (wikeloConfig?.items?.filter((i:any) => i.categoria === cat.id).length || 0);

            return (
              <button
                key={cat.id}
                onClick={() => setActiveFilter(cat.id)}
                className="filter-btn"
                style={{
                  flex: 1, minWidth: '120px',
                  background: isActive ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.02)',
                  borderColor: isActive ? cat.color : 'rgba(255,255,255,0.1)',
                  color: isActive ? cat.color : 'var(--text-muted)',
                  padding: '0.8rem',
                  fontSize: '0.9rem',
                  position: 'relative'
                }}
              >
                <Icon size={16} style={{ margin: '0 auto 0.5rem block' }} />
                <div>{cat.label} ({count})</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Warning banner */}
      <div style={{ background: 'rgba(255, 62, 62, 0.05)', border: '1px solid rgba(255, 62, 62, 0.2)', borderRadius: '4px', padding: '1rem', marginBottom: '2rem', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
        <AlertCircle size={24} style={{ color: '#ff4444', flexShrink: 0 }} />
        <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: '1.5' }}>
          {wikeloConfig?.warning_message || 'Precaución al adquirir material.'}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--secondary)' }}>Sincronizando con el mercado negro...</div>
      ) : (
        <div className="grid-layout">
          <AnimatePresence>
            {filteredData.map((item: any, i: number) => {
              const dbRef = missionsDB.find(m => m.name === item.mision_id) || {};
              const friendlyName = item.name;
              const imageName = item.imagen;
              const rep = dbRef.reputation_required || 'Neutral';
              const dbId = dbRef.id || null;
              const catColor = getCategoryColor(item.categoria);
              
              return (
                <motion.div
                  layout
                  key={item.id || i}
                  className="glass-card"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  style={{ display: 'flex', flexDirection: 'column', borderTop: `4px solid ${catColor}` }}
                >
                  <div style={{ background: 'rgba(0,0,0,0.4)', height: '180px', borderRadius: '4px', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden', position: 'relative', cursor: dbId ? 'pointer' : 'default' }} onClick={() => dbId && navigate(`/missions?id=${dbId}`)}>
                    <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'rgba(0,0,0,0.8)', padding: '0.3rem 0.6rem', borderRadius: '4px', border: `1px solid ${catColor}`, color: catColor, fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 'bold' }}>
                      {getCategoryIcon(item.categoria)} {item.categoria?.toUpperCase()}
                    </div>
                    <img src={`/assets/wikelo/${imageName}`} alt={friendlyName} onError={(e) => { e.currentTarget.style.display='none'; e.currentTarget.parentElement!.innerHTML = '<div style="color:var(--text-muted);font-size:0.8rem;text-align:center"><p>IMAGEN DE REFERENCIA PENDIENTE</p><span style="font-size:2rem;opacity:0.2">👁️</span><p style="font-size:0.6rem;opacity:0.5;margin-top:0.5rem">'+imageName+'</p></div>'; }} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>

                  <h3 style={{ color: 'var(--text-main)', fontSize: '1.1rem', marginBottom: '0.5rem', fontFamily: 'var(--cinzel-font)' }}>{friendlyName}</h3>
                  
                  <p style={{ color: 'var(--primary)', fontSize: '0.75rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    REP: <span style={{ color: 'var(--text-main)' }}>{rep}</span>
                  </p>

                  <div style={{ marginTop: 'auto', background: 'rgba(255,255,255,0.03)', padding: '0.8rem', borderRadius: '4px', borderLeft: '2px solid var(--secondary)' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.3rem', letterSpacing: '1px' }}>REQUISITO DE SOBORNO</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--secondary)', lineHeight: '1.4' }}>{item.soborno || item.costo}</div>
                  </div>
                  
                  {dbId && (
                    <div style={{ marginTop: '0.8rem', display: 'flex', gap: '0.5rem' }}>
                      <button 
                        className="btn" 
                        style={{ flex: 1, padding: '0.6rem', fontSize: '0.75rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem' }}
                        onClick={() => navigate(`/missions?id=${dbId}`, { state: { breadcrumbLabel: `WIKELO: ${friendlyName}` } })}
                      >
                        <Search size={14} /> EXAMINAR EDICTO
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
          {filteredData.length === 0 && !loading && (
            <div style={{ padding: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem', gridColumn: '1 / -1', textAlign: 'center' }}>No hay registros que coincidan con la búsqueda.</div>
          )}
        </div>
      )}
    </div>
  );
};

export default Wikelo;

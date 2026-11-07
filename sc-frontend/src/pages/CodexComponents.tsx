import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Cpu, Search, Shield, Zap, Compass, Thermometer, MapPin } from 'lucide-react';

interface VehicleComponent {
  id: string;
  name: string;
  description_lore?: string;
  size: number;
  type: string;
  manufacturer?: string;
  grade?: string;
  class?: string;
  uex_prices?: {
    price_buy: number | null;
    terminal_name: string;
    starmap_location?: { name: string; star_system_name: string };
  }[];
}

const CodexComponents: React.FC = () => {
  const [components, setComponents] = useState<VehicleComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [sizeFilter, setSizeFilter] = useState('ALL');
  const [classFilter, setClassFilter] = useState('ALL');

  useEffect(() => {
    document.title = 'Artefactos del Vacío | El Códice | Ancalagon';
    fetch('/api/components')
      .then((res) => res.json())
      .then((data) => {
        setComponents(Array.isArray(data) ? data : []);
      })
      .catch((err) => console.error('Error cargando Artefactos del Vacío:', err))
      .finally(() => setLoading(false));
  }, []);

  const availableTypes = useMemo(() => {
    const s = new Set<string>();
    components.forEach((c) => {
      if (c.type) s.add(c.type);
    });
    return Array.from(s).sort();
  }, [components]);

  const availableClasses = useMemo(() => {
    const s = new Set<string>();
    components.forEach((c) => {
      if (c.class) s.add(c.class);
    });
    return Array.from(s).sort();
  }, [components]);

  const filtered = useMemo(() => {
    return components
      .filter((c) => {
        if (typeFilter !== 'ALL' && c.type !== typeFilter) return false;
        if (sizeFilter !== 'ALL' && String(c.size) !== sizeFilter) return false;
        if (classFilter !== 'ALL' && c.class !== classFilter) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          return (
            c.name.toLowerCase().includes(q) ||
            (c.manufacturer && c.manufacturer.toLowerCase().includes(q)) ||
            (c.type && c.type.toLowerCase().includes(q))
          );
        }
        return true;
      })
      .slice(0, 120);
  }, [components, typeFilter, sizeFilter, classFilter, search]);

  const getTypeIcon = (type: string) => {
    const t = (type || '').toLowerCase();
    if (t.includes('shield')) return <Shield size={16} color="var(--secondary)" />;
    if (t.includes('quantum')) return <Compass size={16} color="#c084fc" />;
    if (t.includes('power')) return <Zap size={16} color="var(--primary)" />;
    if (t.includes('cool')) return <Thermometer size={16} color="#38bdf8" />;
    return <Cpu size={16} color="var(--secondary)" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ padding: '0 2rem 4rem', maxWidth: '1300px', margin: '0 auto' }}
    >
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <Cpu
          size={44}
          color="var(--secondary)"
          style={{ marginBottom: '0.8rem', filter: 'drop-shadow(0 0 15px rgba(212,175,55,0.4))' }}
        />
        <h1 style={{ fontSize: '2.4rem', margin: '0 0 0.5rem 0', letterSpacing: '6px' }}>
          ARTEFACTOS DEL VACÍO
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.98rem', maxWidth: '720px', margin: '0 auto' }}>
          Catálogo sagrado de núcleos cuánticos, generadores de escudo, plantas de poder y disipadores térmicos para
          armar los navíos de <strong>Ancalagon Oblivion Fleet</strong> en el Ciclo 2956.
        </p>
      </div>

      {/* Filters */}
      <div
        className="glass-card"
        style={{
          padding: '1.2rem 1.5rem',
          marginBottom: '2rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          alignItems: 'center',
        }}
      >
        <div style={{ position: 'relative' }}>
          <Search
            size={16}
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
          />
          <input
            type="text"
            className="search-input"
            placeholder="Buscar artefacto o fabricante..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', paddingLeft: '2.2rem' }}
          />
        </div>

        <select
          className="search-input"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={{ width: '100%' }}
        >
          <option value="ALL">Todos los Sistemas ({components.length})</option>
          {availableTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <select
          className="search-input"
          value={sizeFilter}
          onChange={(e) => setSizeFilter(e.target.value)}
          style={{ width: '100%' }}
        >
          <option value="ALL">Todos los Tamaños (S0 - S4)</option>
          {[0, 1, 2, 3, 4].map((sz) => (
            <option key={sz} value={String(sz)}>
              Tamaño S{sz}
            </option>
          ))}
        </select>

        <select
          className="search-input"
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          style={{ width: '100%' }}
        >
          <option value="ALL">Todas las Doctrinas (Clases)</option>
          {availableClasses.map((cl) => (
            <option key={cl} value={cl}>
              {cl}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--secondary)', fontFamily: 'var(--cinzel-font)' }}>
          DESENCRIPTANDO REGISTROS DE INGENIERÍA ABISAL...
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          No se hallaron artefactos con los parámetros seleccionados.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '1.2rem' }}>
          {filtered.map((comp) => {
            const bestPrice = comp.uex_prices?.find((p) => p.price_buy && p.price_buy > 0);
            return (
              <div
                key={comp.id}
                className="glass-card"
                style={{
                  padding: '1.4rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '0.8rem',
                  borderTop: '2px solid rgba(212, 175, 55, 0.35)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        fontSize: '0.7rem',
                        fontFamily: 'var(--cinzel-font)',
                        color: 'var(--secondary)',
                        textTransform: 'uppercase',
                      }}
                    >
                      {getTypeIcon(comp.type)} {comp.type}
                    </span>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        padding: '0.15rem 0.5rem',
                        background: 'rgba(196, 30, 58, 0.18)',
                        color: 'var(--primary)',
                        border: '1px solid rgba(196, 30, 58, 0.4)',
                        borderRadius: '3px',
                        fontFamily: 'var(--cinzel-font)',
                        fontWeight: 'bold',
                      }}
                    >
                      S{comp.size} {comp.grade ? `· GRADO ${comp.grade}` : ''}
                    </span>
                  </div>

                  <h3 style={{ margin: '0 0 0.3rem', fontFamily: 'var(--cinzel-font)', fontSize: '1.08rem', color: 'var(--text-main)' }}>
                    {comp.name}
                  </h3>

                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
                    Forja: <strong style={{ color: 'var(--accent-silver)' }}>{comp.manufacturer || 'Desconocido'}</strong>
                    {comp.class && (
                      <>
                        {' '}
                        · Doctrina: <strong style={{ color: 'var(--secondary)' }}>{comp.class}</strong>
                      </>
                    )}
                  </div>

                  {comp.description_lore && (
                    <p
                      style={{
                        fontSize: '0.8rem',
                        color: 'var(--text-muted)',
                        lineHeight: 1.5,
                        margin: 0,
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {comp.description_lore}
                    </p>
                  )}
                </div>

                {bestPrice && (
                  <div
                    style={{
                      paddingTop: '0.7rem',
                      borderTop: '1px solid rgba(255,255,255,0.06)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.75rem',
                    }}
                  >
                    <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <MapPin size={12} color="var(--secondary)" />
                      {bestPrice.terminal_name}
                    </span>
                    <strong style={{ color: 'var(--secondary)', fontFamily: 'var(--cinzel-font)' }}>
                      {bestPrice.price_buy?.toLocaleString()} aUEC
                    </strong>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};

export default CodexComponents;

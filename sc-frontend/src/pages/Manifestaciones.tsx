import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Search, Filter, Wrench, ExternalLink, HelpCircle, AlertOctagon, CheckCircle2 } from 'lucide-react';

interface Manifestation {
  id: number;
  titulo: string;
  issue_council: string | null;
  descripcion: string;
  efecto_jugabilidad: string;
  workaround: string | null;
  estado?: string;
}

const FILTER_TYPES = [
  { id: 'Todos', label: 'TODAS LAS ANOMALÍAS', icon: Filter, color: 'var(--text-main)' },
  { id: 'Activo', label: 'ACTIVOS', icon: AlertTriangle, color: 'var(--primary)' },
  { id: 'Resuelto', label: 'RESUELTOS', icon: CheckCircle2, color: '#10b981' },
  { id: 'ConWorkaround', label: 'CON MITIGACIÓN', icon: Wrench, color: 'var(--secondary)' },
  { id: 'ConIssueCouncil', label: 'REPORTADAS EN IC', icon: ExternalLink, color: 'var(--primary)' },
];

const Manifestaciones: React.FC = () => {
  const [data, setData] = useState<Manifestation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('Todos');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/data/manifestaciones.json')
      .then(res => res.json())
      .then((json: Manifestation[]) => {
        setData(json);
      })
      .catch(err => console.error("Error loading void manifestations data:", err))
      .finally(() => setLoading(false));
  }, []);

  const filteredData = useMemo(() => {
    let result = data;

    // Apply Tab Filter
    if (activeFilter === 'ConWorkaround') {
      result = result.filter(item => item.workaround && !item.workaround.includes("No requiere"));
    } else if (activeFilter === 'ConIssueCouncil') {
      result = result.filter(item => item.issue_council !== null);
    } else if (activeFilter === 'Activo') {
      result = result.filter(item => (item.estado || 'Activo').toLowerCase() === 'activo');
    } else if (activeFilter === 'Resuelto') {
      result = result.filter(item => (item.estado || '').toLowerCase() === 'resuelto');
    }

    // Apply Search Query (Searches EVERY field)
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      result = result.filter(item =>
        (item.titulo || '').toLowerCase().includes(q) ||
        (item.descripcion || '').toLowerCase().includes(q) ||
        (item.efecto_jugabilidad || '').toLowerCase().includes(q) ||
        (item.workaround || '').toLowerCase().includes(q) ||
        (item.issue_council || '').toLowerCase().includes(q) ||
        (item.estado || 'Activo').toLowerCase().includes(q)
      );
    }

    return result;
  }, [data, activeFilter, searchQuery]);

  return (
    <div style={{ padding: '0 2rem' }}>
      {/* Dynamic Keyframe style injector for premium pulse effect */}
      <style>{`
        @keyframes custom-pulse {
          0% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
          100% { opacity: 0.4; transform: scale(1); }
        }
        .blinking-dot {
          animation: custom-pulse 1.8s infinite ease-in-out;
        }
      `}</style>

      {/* ── HEADER ── */}
      <div style={{ marginBottom: '2rem', borderBottom: '1px solid rgba(196,30,58,0.2)', paddingBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ color: 'var(--primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '1.8rem' }}>
            Manifestaciones del Vacío
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontFamily: 'var(--cinzel-font)', letterSpacing: '1px', margin: 0 }}>
            Base de Datos de Regresiones, Inestabilidad Sistémica y Correlación Operativa (Alfa 4.9.0-LIVE)
          </p>
        </div>
        <div style={{ background: 'rgba(196,30,58,0.05)', border: '1px solid rgba(196,30,58,0.2)', padding: '0.5rem 1rem', borderRadius: '4px', fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--primary)' }}>
          ESTADO: STABILIZATION CYCLE INTENSIVE
        </div>
      </div>

      {/* ── CONTROLS ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', marginBottom: '2.5rem' }}>
        {/* Search Input */}
        <div style={{ position: 'relative', width: '100%', maxWidth: '750px' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Buscar por título, descripción, Issue Council, mitigación o estado (Activo/Resuelto)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '1rem 1rem 1rem 3rem',
              background: 'rgba(10,5,5,0.6)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              color: 'var(--text-main)',
              fontSize: '0.95rem',
              outline: 'none',
              transition: 'all 0.3s ease',
              fontFamily: 'var(--main-font)'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--primary)';
              e.target.style.boxShadow = '0 0 15px rgba(196, 30, 58, 0.2)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--border)';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>

        {/* Filter Badges */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {FILTER_TYPES.map(filter => {
            const Icon = filter.icon;
            const isActive = activeFilter === filter.id;
            
            // Calculate item counts per filter criteria
            let count = data.length;
            if (filter.id === 'ConWorkaround') {
              count = data.filter(item => item.workaround && !item.workaround.includes("No requiere")).length;
            } else if (filter.id === 'ConIssueCouncil') {
              count = data.filter(item => item.issue_council !== null).length;
            } else if (filter.id === 'Activo') {
              count = data.filter(item => (item.estado || 'Activo').toLowerCase() === 'activo').length;
            } else if (filter.id === 'Resuelto') {
              count = data.filter(item => (item.estado || '').toLowerCase() === 'resuelto').length;
            }

            return (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                style={{
                  background: isActive ? 'rgba(196,30,58,0.1)' : 'rgba(255,255,255,0.02)',
                  border: '1px solid',
                  borderColor: isActive ? filter.color : 'rgba(255,255,255,0.1)',
                  color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
                  padding: '0.6rem 1.2rem',
                  fontSize: '0.85rem',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.3s ease',
                  fontFamily: 'var(--cinzel-font)',
                  letterSpacing: '1px'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.borderColor = filter.color;
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                }}
              >
                <Icon size={14} style={{ color: isActive ? filter.color : 'var(--text-muted)' }} />
                <span>{filter.label} ({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── BANNER WARNING ── */}
      <div style={{ background: 'rgba(196, 30, 58, 0.04)', border: '1px solid rgba(196, 30, 58, 0.15)', borderLeft: '4px solid var(--primary)', padding: '1rem 1.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'flex-start', gap: '1rem', borderRadius: '0 4px 4px 0' }}>
        <AlertTriangle size={24} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '2px' }} />
        <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: '1.6' }}>
          <strong style={{ color: 'var(--primary)', fontFamily: 'var(--cinzel-font)' }}>ALERTA DE SEGURIDAD OPERATIVA:</strong> Coexistencia crítica de código refactorizado de persistencia a largo plazo (LTP) con sistemas heredados no actualizados en el parche 4.9.0-LIVE. Tenga precaución al operar naves de gran tonelaje, interactuar con elevadores de carga o equipar componentes de inventario.
        </div>
      </div>

      {/* ── GRID OF CASES ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--primary)', fontFamily: 'var(--cinzel-font)', letterSpacing: '2px' }}>
          SINCRONIZANDO CON LOS ARCHIVOS DEL VACÍO...
        </div>
      ) : filteredData.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '4px', color: 'var(--text-muted)' }}>
          <HelpCircle size={40} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
          <p style={{ fontSize: '1rem', fontFamily: 'var(--cinzel-font)', letterSpacing: '1px' }}>No se encontraron anomalías que coincidan con la búsqueda.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '1.5rem' }}>
          <AnimatePresence>
            {filteredData.map((item) => {
              const isResuelto = (item.estado || 'Activo').toLowerCase() === 'resuelto';
              return (
                <motion.div
                  layout
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="glass-card"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    height: '100%',
                    boxSizing: 'border-box',
                    borderLeft: isResuelto ? '2px solid #10b981' : '2px solid var(--primary)'
                  }}
                >
                  <div>
                    {/* Badges / Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                          CASO #{item.id.toString().padStart(3, '0')}
                        </span>
                        
                        {/* Estado Badge */}
                        <span style={{
                          fontSize: '0.65rem',
                          fontFamily: 'var(--cinzel-font)',
                          letterSpacing: '1px',
                          fontWeight: 'bold',
                          padding: '0.1rem 0.5rem',
                          borderRadius: '3px',
                          background: isResuelto ? 'rgba(16,185,129,0.15)' : 'rgba(196,30,58,0.15)',
                          border: '1px solid',
                          borderColor: isResuelto ? '#10b981' : 'var(--primary)',
                          color: isResuelto ? '#34d399' : '#ff8888',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}>
                          <span 
                            className={isResuelto ? "" : "blinking-dot"}
                            style={{
                              width: '5px',
                              height: '5px',
                              borderRadius: '50%',
                              background: isResuelto ? '#10b981' : 'var(--primary)',
                              display: 'inline-block'
                            }} 
                          />
                          {item.estado || 'Activo'}
                        </span>
                      </div>

                      {item.issue_council ? (
                        <a
                          href={`https://issue-council.robertsspaceindustries.com/projects/STAR-CITIZEN/issues/${item.issue_council}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            background: 'rgba(196,30,58,0.15)',
                            border: '1px solid rgba(196,30,58,0.4)',
                            color: '#ff8888',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontFamily: 'monospace',
                            transition: 'all 0.3s ease',
                            fontWeight: 'bold'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(196,30,58,0.3)';
                            e.currentTarget.style.borderColor = 'var(--primary)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(196,30,58,0.15)';
                            e.currentTarget.style.borderColor = 'rgba(196,30,58,0.4)';
                          }}
                        >
                          <span>{item.issue_council}</span>
                          <ExternalLink size={12} />
                        </a>
                      ) : (
                        <span style={{
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          color: 'var(--text-muted)',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontFamily: 'monospace'
                        }}>
                          SIN CÓDIGO IC (N/A)
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 style={{
                      color: isResuelto ? '#34d399' : 'var(--secondary)',
                      fontSize: '1.2rem',
                      marginBottom: '1rem',
                      lineHeight: '1.4',
                      fontFamily: 'var(--cinzel-font)',
                      letterSpacing: '1px',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      paddingBottom: '0.5rem',
                      textTransform: 'uppercase'
                    }}>
                      {item.titulo}
                    </h3>

                    {/* Description */}
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: '1.5', marginBottom: '1.2rem' }}>
                      {item.descripcion}
                    </p>

                    {/* Gameplay Effect */}
                    <div style={{ background: 'rgba(239,68,68,0.03)', border: '1px solid rgba(239,68,68,0.1)', borderRadius: '4px', padding: '0.8rem 1rem', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', color: '#f87171', fontWeight: 'bold', fontSize: '0.8rem', textTransform: 'uppercase', fontFamily: 'var(--cinzel-font)', letterSpacing: '1px' }}>
                        <AlertOctagon size={14} />
                        <span>Efecto en la Jugabilidad</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#fca5a5', lineHeight: '1.5' }}>
                        {item.efecto_jugabilidad}
                      </p>
                    </div>
                  </div>

                  {/* Workaround */}
                  <div style={{
                    background: item.workaround && !item.workaround.includes("No requiere") ? 'rgba(212,175,55,0.03)' : 'rgba(16,185,129,0.03)',
                    border: '1px solid',
                    borderColor: item.workaround && !item.workaround.includes("No requiere") ? 'rgba(212,175,55,0.15)' : 'rgba(16,185,129,0.15)',
                    borderRadius: '4px',
                    padding: '0.8rem 1rem',
                    marginTop: '0.5rem'
                  }}>
                    {item.workaround && !item.workaround.includes("No requiere") ? (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', color: 'var(--secondary)', fontWeight: 'bold', fontSize: '0.8rem', textTransform: 'uppercase', fontFamily: 'var(--cinzel-font)', letterSpacing: '1px' }}>
                          <Wrench size={14} />
                          <span>Protocolo de Mitigación (Workaround)</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: '1.5' }}>
                          {item.workaround}
                        </p>
                      </>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#34d399', fontSize: '0.85rem', lineHeight: '1.5' }}>
                        <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                        <span>{item.workaround || "No requiere mitigación activa por parte del operador de la flota."}</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default Manifestaciones;

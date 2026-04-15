import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { getResources } from '../api/client';
import STARMAP_JSON from '../data/starmap.json';

// ─── TYPE DEFINITIONS ──────────────────────────────────────────────────────────
type LocationType = 'star' | 'planet' | 'moon' | 'station' | 'lagrange' | 'belt' | 'jumppoint' | 'city';
type ThreatLevel = 'BAJO' | 'MEDIO' | 'ALTO' | 'EXTREMO';

interface SubLocation {
  name: string;
  type: LocationType;
  description: string;
  faction?: string;
  services?: string[];
  threat?: ThreatLevel;
  orbitIndex?: number;
}

interface Planet {
  id: string;
  name: string;
  type: LocationType;
  nodeType: 'planet' | 'belt'; // top-level visual type for the orbital map
  description: string;
  faction: string;
  color: string;
  glowColor: string;
  threat: ThreatLevel;
  children: SubLocation[];
  orbitRadius: number;
  orbitAngle: number;
}

interface StarSystem {
  id: string;
  nombre: string;
  estrella: string;
  afiliacion: string;
  descripcion: string;
  color_estrella: string;
}

// ─── JSON → INTERNAL TYPE MAPPER ─────────────────────────────────────────────
// Converts the starmap.json planet schema into the Planet[] type used by components

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPlanet(p: any): Planet {
  const lunas: SubLocation[] = (p.lunas ?? []).map((l: any) => ({
    name: l.nombre,
    type: (l.tipo ?? 'moon') as LocationType,
    description: l.descripcion,
    faction: l.faction ?? l.tipo === 'moon' ? (l.faction ?? 'No controlada') : undefined,
    threat: (l.threat ?? 'BAJO') as ThreatLevel,
    services: l.servicios ?? [],
  }));

  const estaciones: SubLocation[] = (p.estaciones ?? []).map((e: any) => ({
    name: e.nombre,
    type: (e.tipo ?? 'station') as LocationType,
    description: e.descripcion,
    faction: e.faction,
    threat: (e.threat ?? 'BAJO') as ThreatLevel,
    services: e.servicios ?? [],
  }));

  const lagrange: SubLocation[] = (p.lagrange ?? []).map((tag: string) => ({
    name: `Lagrange ${tag}`,
    type: 'lagrange' as LocationType,
    description: `Punto de equilibrio gravitacional ${tag} de ${p.nombre}.`,
    threat: 'BAJO' as ThreatLevel,
    services: ['Navegación'],
  }));

  const ciudades: SubLocation[] = (p.hijos ?? []).filter((h: any) => h.tipo === 'city' || h.tipo === 'ciudad').map((c: any) => ({
    name: c.nombre,
    type: 'city' as LocationType,
    description: c.descripcion,
    faction: c.afiliacion ?? c.faction,
    threat: (c.amenaza ?? c.threat ?? 'BAJO') as ThreatLevel,
    services: c.servicios ?? [],
  }));

  return {
    id: p.id,
    name: p.nombre,
    type: (p.tipo === 'belt' ? 'belt' : 'planet') as LocationType,
    nodeType: (p.tipo === 'belt' ? 'belt' : 'planet') as 'planet' | 'belt',
    description: p.descripcion,
    faction: p.faction ?? p.ciudad_lz ? `${p.faction ?? p.nombre} (${p.ciudad_lz})` : (p.faction ?? p.nombre),
    color: p.color,
    glowColor: p.glowColor,
    threat: (p.threat ?? 'BAJO') as ThreatLevel,
    orbitRadius: p.orbitRadius,
    orbitAngle: p.orbitAngle,
    children: [...lunas, ...estaciones, ...lagrange, ...ciudades],
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapJumpPoints(jps: any[]): SubLocation[] {
  return (jps ?? []).map((jp: any) => ({
    name: jp.nombre,
    type: 'jumppoint' as LocationType,
    description: jp.descripcion,
    threat: (jp.threat ?? 'MEDIO') as ThreatLevel,
    services: ['Tránsito'],
  }));
}

// ─── DATA ACCESS HELPERS ──────────────────────────────────────────────────────
const SISTEMAS: StarSystem[] = (STARMAP_JSON.sistemas as any[]).map(s => ({
  id: s.id,
  nombre: s.nombre,
  estrella: s.estrella,
  afiliacion: s.afiliacion,
  descripcion: s.descripcion,
  color_estrella: s.color_estrella ?? '#FFD54F',
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getPlanetsForSystem(systemId: string): Planet[] {
  const sys = (STARMAP_JSON.sistemas as any[]).find(s => s.id === systemId);
  if (!sys) return [];
  return (sys.planetas ?? []).map(mapPlanet);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getJumpPointsForSystem(systemId: string): SubLocation[] {
  const sys = (STARMAP_JSON.sistemas as any[]).find(s => s.id === systemId);
  if (!sys) return [];
  return mapJumpPoints(sys.jump_points ?? []);
}

// ─── TYPE CONFIGURATION ────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<LocationType, { icon: string; label: string; color: string; bgColor: string }> = {
  star: { icon: '☀', label: 'ESTRELLA', color: '#FFD700', bgColor: 'rgba(255, 215, 0, 0.15)' },
  planet: { icon: '🪐', label: 'PLANETA', color: '#d4af37', bgColor: 'rgba(212, 175, 55, 0.15)' },
  moon: { icon: '◐', label: 'LUNA', color: '#a18a8a', bgColor: 'rgba(161, 138, 138, 0.15)' },
  station: { icon: '⬡', label: 'ESTACIÓN', color: '#4FC3F7', bgColor: 'rgba(79, 195, 247, 0.15)' },
  city: { icon: '⬟', label: 'CIUDAD', color: '#B39DDB', bgColor: 'rgba(179, 157, 219, 0.15)' },
  lagrange: { icon: '✦', label: 'LAGRANGE', color: 'rgba(212, 175, 55, 0.5)', bgColor: 'rgba(212, 175, 55, 0.05)' },
  belt: { icon: '◌', label: 'CINTURÓN', color: '#8B7355', bgColor: 'rgba(139, 115, 85, 0.15)' },
  jumppoint: { icon: '⬡', label: 'SALTO', color: '#c41e3a', bgColor: 'rgba(196, 30, 58, 0.15)' },
};

const THREAT_CONFIG = {
  'BAJO': { color: '#4CAF50', label: 'BAJO' },
  'MEDIO': { color: '#FF9800', label: 'MEDIO' },
  'ALTO': { color: '#F44336', label: 'ALTO' },
  'EXTREMO': { color: '#9C27B0', label: 'EXTREMO' },
};



// ─── DETAIL PANEL COMPONENT ───────────────────────────────────────────────────
const DetailPanel: React.FC<{
  selected: { planet: Planet; child?: SubLocation } | null;
  systemName: string;
  onClose: () => void;
}> = ({ selected, systemName, onClose }) => {
  const navigate = useNavigate();
  const [localResources, setLocalResources] = useState<any[]>([]);

  useEffect(() => {
    getResources().then((data: any) => {
      const list = Array.isArray(data) ? data : (data.resources || []);
      setLocalResources(list);
    }).catch(console.error);
  }, []);

  if (!selected) return null;
  const item = selected.child ?? selected.planet;
  const itemType = selected.child ? selected.child.type : selected.planet.type;
  const typeConf = TYPE_CONFIG[itemType];
  const threat = item.threat ?? 'BAJO';
  const threatConf = THREAT_CONFIG[threat];
  const faction = (selected.child?.faction) ?? selected.planet.faction;
  const services = (selected.child?.services) ?? [];

  // Filter notable children (non-lagrange) for planet view
  const notableChildren = selected.planet.children.filter(c => c.type !== 'lagrange' && !selected.child);

  // Match resources
  const searchBodyStr = `${systemName}: ${item.name}`; // e.g. "Stanton: Hurston"
  const matchingResources = localResources.filter(r => {
    return r.locationsDetail?.some((l: any) => l.system === systemName && l.name === item.name);
  });

  return (
    <AnimatePresence>
      <motion.div
        key={selected.planet.id + (selected.child?.name ?? '')}
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 30 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        style={{
          position: 'relative',
          background: 'rgba(10, 3, 3, 0.97)',
          border: `1px solid ${selected.planet.color}50`,
          borderLeft: `3px solid ${selected.planet.color}`,
          borderRadius: '4px',
          padding: '1.5rem',
          overflowY: 'auto',
          maxHeight: '80vh',
          backdropFilter: 'blur(20px)',
          boxShadow: `0 0 40px ${selected.planet.glowColor ?? 'rgba(196,30,58,0.2)'}`,
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '1rem', right: '1rem',
            background: 'none', border: '1px solid rgba(255,255,255,0.1)',
            color: 'var(--text-muted)', cursor: 'pointer', borderRadius: '2px',
            width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.8rem', transition: '0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
        >✕</button>

        {/* Type badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
          background: typeConf.bgColor, border: `1px solid ${typeConf.color}40`,
          padding: '0.2rem 0.6rem', borderRadius: '2px', marginBottom: '1rem',
        }}>
          <span style={{ color: typeConf.color, fontSize: '0.75rem' }}>{typeConf.icon}</span>
          <span style={{ fontFamily: 'var(--cinzel-font)', fontSize: '0.55rem', letterSpacing: '3px', color: typeConf.color }}>
            {typeConf.label}
          </span>
        </div>

        {/* Name */}
        <h2 style={{
          fontFamily: 'var(--cinzel-font)', color: selected.planet.color,
          fontSize: '1.3rem', letterSpacing: '4px', margin: '0 0 0.3rem', textShadow: `0 0 20px ${selected.planet.glowColor}`,
        }}>
          {item.name}
        </h2>

        {/* Planet name if sub-location */}
        {selected.child && (
          <p style={{ margin: '0 0 0.8rem', fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: '2px', fontFamily: 'var(--cinzel-font)' }}>
            ÓRBITA DE {selected.planet.name.toUpperCase()}
          </p>
        )}

        <div style={{ height: '1px', background: `linear-gradient(to right, ${selected.planet.color}60, transparent)`, margin: '0.8rem 0' }} />

        {/* Description */}
        <p style={{ color: 'var(--text-main)', lineHeight: 1.8, fontSize: '0.88rem', margin: '0 0 1.2rem' }}>
          {item.description}
        </p>

        {/* Metadata grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
          {faction && (
            <div style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '2px' }}>
              <p style={{ margin: 0, fontSize: '0.55rem', letterSpacing: '2px', color: 'var(--text-muted)', fontFamily: 'var(--cinzel-font)' }}>FACCIÓN</p>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: 'var(--text-main)', fontWeight: 700 }}>{faction}</p>
            </div>
          )}
          <div style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.03)', border: `1px solid ${threatConf.color}30`, borderRadius: '2px' }}>
            <p style={{ margin: 0, fontSize: '0.55rem', letterSpacing: '2px', color: 'var(--text-muted)', fontFamily: 'var(--cinzel-font)' }}>AMENAZA</p>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: threatConf.color, fontWeight: 700 }}>
              ● {threatConf.label}
            </p>
          </div>
        </div>

        {/* Services */}
        {services.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <p style={{ margin: '0 0 0.5rem', fontSize: '0.55rem', letterSpacing: '3px', color: 'var(--text-muted)', fontFamily: 'var(--cinzel-font)' }}>SERVICIOS DISPONIBLES</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
              {services.map(s => (
                <span key={s} style={{
                  padding: '0.2rem 0.5rem', fontSize: '0.65rem', letterSpacing: '1px',
                  background: 'rgba(79, 195, 247, 0.08)', border: '1px solid rgba(79, 195, 247, 0.2)',
                  borderRadius: '2px', color: '#4FC3F7', fontWeight: 700,
                }}>{s}</span>
              ))}
            </div>
          </div>
        )}

        {/* Notable children list (only for planet-level view) */}
        {notableChildren.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <p style={{ margin: '0 0 0.5rem', fontSize: '0.55rem', letterSpacing: '3px', color: 'var(--text-muted)', fontFamily: 'var(--cinzel-font)' }}>
              CUERPOS ORBITALES
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {notableChildren.map(c => (
                <div key={c.name} style={{
                  display: 'flex', alignItems: 'center', gap: '0.6rem',
                  padding: '0.4rem 0.6rem', background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)', borderRadius: '2px',
                }}>
                  <span style={{ color: TYPE_CONFIG[c.type].color, fontSize: '0.75rem' }}>{TYPE_CONFIG[c.type].icon}</span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-main)', flex: 1 }}>{c.name}</span>
                  <span style={{ fontSize: '0.6rem', letterSpacing: '1px', fontFamily: 'var(--cinzel-font)', color: TYPE_CONFIG[c.type].color }}>
                    {TYPE_CONFIG[c.type].label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ofrendas (Resources) */}
        {matchingResources.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <p style={{ margin: '0 0 0.5rem', fontSize: '0.55rem', letterSpacing: '3px', color: 'var(--text-muted)', fontFamily: 'var(--cinzel-font)' }}>
              OFRENDAS CONFIRMADAS
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {matchingResources.map(res => (
                <Link
                  key={res.id}
                  to={`/recurso/${res.id}`}
                  state={{ breadcrumbLabel: `OFRENDA: ${res.name}` }}
                  style={{
                    padding: '0.3rem 0.6rem',
                    background: 'rgba(212, 175, 55, 0.05)',
                    border: '1px solid rgba(212, 175, 55, 0.3)',
                    color: 'var(--secondary)',
                    borderRadius: '2px',
                    fontSize: '0.7rem',
                    textDecoration: 'none',
                    fontFamily: 'var(--cinzel-font)',
                    letterSpacing: '1px',
                    cursor: 'pointer',
                    transition: '0.2s'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(212, 175, 55, 0.15)';
                    e.currentTarget.style.borderColor = 'var(--secondary)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(212, 175, 55, 0.05)';
                    e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.3)';
                  }}
                >
                  {res.name}
                </Link>
              ))}
            </div>
            {/* Button to search all offerings in this location */}
            <button
              onClick={() => navigate(`/mapa?system=${encodeURIComponent(systemName)}&body=${encodeURIComponent(searchBodyStr + ' (' + itemType + ')')}`)}
              style={{
                width: '100%',
                padding: '0.8rem',
                background: 'linear-gradient(90deg, rgba(212, 175, 55, 0.1), rgba(212, 175, 55, 0.05))',
                border: '1px solid rgba(212, 175, 55, 0.4)',
                color: 'var(--secondary)',
                fontFamily: 'var(--cinzel-font)',
                letterSpacing: '2px',
                fontSize: '0.75rem',
                cursor: 'pointer',
                transition: '0.2s',
                marginTop: '0.8rem',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'linear-gradient(90deg, rgba(212, 175, 55, 0.2), rgba(212, 175, 55, 0.1))';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'linear-gradient(90deg, rgba(212, 175, 55, 0.1), rgba(212, 175, 55, 0.05))';
              }}
            >
              BUSCAR TODAS LAS OFRENDAS
            </button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

// ─── ORBITAL MAP COMPONENT ────────────────────────────────────────────────────
const OrbitalMap: React.FC<{
  planets: Planet[];
  selectedPlanet: Planet | null;
  onSelectPlanet: (p: Planet | null) => void;
  onSelectChild: (p: Planet, c: SubLocation) => void;
  selectedChild: SubLocation | null;
  jumpPoints: SubLocation[];
  starColor?: string;
  starLabel?: string;
  activeFilter?: LocationType | 'all';
}> = ({ planets, selectedPlanet, onSelectPlanet, onSelectChild, selectedChild, jumpPoints, starColor = '#FFD54F', starLabel = 'STANTON', activeFilter = 'all' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [animAngles, setAnimAngles] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    planets.forEach(p => { init[p.id] = p.orbitAngle; });
    return init;
  });

  // ── Zoom & Pan state ──
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragInfo = useRef({ active: false, startX: 0, startY: 0, panX: 0, panY: 0, moved: false });

  // Reset animAngles when the planet set changes (system switch)
  // This is the safety net — the key prop on OrbitalMap is the primary fix.
  useEffect(() => {
    setAnimAngles(prev => {
      const next: Record<string, number> = {};
      planets.forEach(p => {
        // Keep existing angle if planet already existed, otherwise use initial angle
        next[p.id] = prev[p.id] ?? p.orbitAngle;
      });
      return next;
    });
  // Use planet IDs as dependency to avoid firing on every render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planets.map(p => p.id).join(',')]);

  // Orbital animation — speed proportional to 1/radius (Kepler approximation)
  useEffect(() => {
    let frame: number;
    const animate = () => {
      setAnimAngles(prev => {
        const next = { ...prev };
        planets.forEach(p => {
          // Speed inversely proportional to orbit radius (Kepler approximation)
          const speed = Math.max(0.003, 1.2 / p.orbitRadius);
          next[p.id] = (prev[p.id] + speed) % 360;
        });
        return next;
      });
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [planets]);

  // Non-passive wheel zoom centered on cursor
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      // Mouse position in SVG viewBox coordinates (0-840, 0-680)
      const mx = ((e.clientX - rect.left) / rect.width) * 840;
      const my = ((e.clientY - rect.top) / rect.height) * 680;
      const factor = e.deltaY < 0 ? 1.18 : 0.85;
      setZoom(z => {
        const nz = Math.min(Math.max(z * factor, 0.35), 6);
        const ratio = nz / z;
        setPan(p => ({
          x: mx - (mx - p.x) * ratio,
          y: my - (my - p.y) * ratio,
        }));
        return nz;
      });
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, []);

  const handleDragStart = (e: React.MouseEvent<SVGSVGElement>) => {
    dragInfo.current = { active: true, startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y, moved: false };
    setIsDragging(true);
  };
  const handleDragMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragInfo.current.active) return;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const dx = ((e.clientX - dragInfo.current.startX) / rect.width) * 840;
    const dy = ((e.clientY - dragInfo.current.startY) / rect.height) * 680;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragInfo.current.moved = true;
    setPan({ x: dragInfo.current.panX + dx, y: dragInfo.current.panY + dy });
  };
  const handleDragEnd = () => {
    dragInfo.current.active = false;
    setIsDragging(false);
  };

  const handleZoomBtn = (factor: number) => {
    const cx2 = 420, cy2 = 390; // SVG viewBox center
    setZoom(z => {
      const nz = Math.min(Math.max(z * factor, 0.35), 6);
      const ratio = nz / z;
      setPan(p => ({ x: cx2 - (cx2 - p.x) * ratio, y: cy2 - (cy2 - p.y) * ratio }));
      return nz;
    });
  };
  const handleZoomReset = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const cx = 420, cy = 390;

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg
        ref={svgRef}
        viewBox="0 0 840 680"
        style={{ 
          height: '100%', 
          maxWidth: '100%',
          maxHeight: '100%',
          aspectRatio: '840 / 680', 
          display: 'block', 
          cursor: isDragging ? 'grabbing' : 'grab',
          touchAction: 'none'
        }}
        xmlns="http://www.w3.org/2000/svg"
        onMouseDown={handleDragStart}
        onMouseMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
      >
        <defs>
          {/* Bg star field */}
          {Array.from({ length: 80 }).map((_, i) => (
            <circle key={i} id={`star${i}`} r={Math.random() * 1.2 + 0.3} />
          ))}

          {/* Radial gradient for background */}
          <radialGradient id="bgGrad" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="rgba(30,5,5,0.8)" />
            <stop offset="100%" stopColor="rgba(5,1,1,0.98)" />
          </radialGradient>

          {/* Planet specific gradients */}
          {planets.map(p => (
            <radialGradient key={p.id} id={`grad-${p.id}`} cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor={p.color + 'ff'} />
              <stop offset="60%" stopColor={p.color + 'bb'} />
              <stop offset="100%" stopColor={p.color + '33'} />
            </radialGradient>
          ))}

          {/* Star gradient — dynamic from JSON starColor */}
          <radialGradient id="starGrad" cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#FFFDE7" />
            <stop offset="50%" stopColor={starColor} />
            <stop offset="100%" stopColor={starColor + '88'} />
          </radialGradient>

          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="starGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Background — fixed, not affected by zoom/pan */}
        <rect width="840" height="680" fill="url(#bgGrad)" style={{ cursor: isDragging ? 'grabbing' : 'grab' }} />

        {/* ── ALL INTERACTIVE MAP CONTENT inside zoom/pan transform group ── */}
        <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`} style={{ transformOrigin: '0 0' }}>

        {/* Star field */}
        {Array.from({ length: 80 }).map((_, i) => (
          <circle
            key={i}
            cx={Math.sin(i * 137.5) * 420 + 420}
            cy={Math.cos(i * 97.3) * 340 + 340}
            r={i % 7 === 0 ? 1.5 : 0.7}
            fill="white"
            opacity={0.15 + (i % 5) * 0.08}
          />
        ))}

        {/* Orbit rings — planets only; belts self-render their orbit */}
        {planets.map(p => p.nodeType === 'belt' ? null : (
          <circle
            key={`orbit-${p.id}`}
            cx={cx} cy={cy}
            r={p.orbitRadius}
            fill="none"
            stroke={selectedPlanet?.id === p.id ? `${p.color}40` : 'rgba(212,175,55,0.08)'}
            strokeWidth={selectedPlanet?.id === p.id ? 1.5 : 0.8}
            strokeDasharray={selectedPlanet?.id === p.id ? '0' : '4 6'}
          />
        ))}

        {/* Central Star */}
        <g filter="url(#starGlow)">
          <circle cx={cx} cy={cy} r={34} fill="url(#starGrad)" onClick={() => onSelectPlanet(null)} style={{ cursor: 'pointer' }} />
          <circle cx={cx} cy={cy} r={38} fill="none" stroke={starColor} strokeWidth="1" opacity="0.3" />
          <circle cx={cx} cy={cy} r={44} fill="none" stroke={starColor} strokeWidth="0.5" opacity="0.15" />
          <text x={cx} y={cy + 54} textAnchor="middle" fill={starColor} fontSize="9" fontFamily="Cinzel, serif" letterSpacing="2" opacity="0.9">
            {starLabel}
          </text>
        </g>

        {/* Planets & Belts */}
        {planets.map(p => {
          const rad = (animAngles[p.id] * Math.PI) / 180;
          const px = cx + p.orbitRadius * Math.cos(rad);
          const py = cy + p.orbitRadius * Math.sin(rad);
          const isSelected = selectedPlanet?.id === p.id;

          // ── BELT — full orbit ring with scattered rocks & distributed stations ──
          if (p.nodeType === 'belt') {
            const isBeltSelected = isSelected;
            const beltStations = p.children.filter(c => c.type === 'station');
            const beltW  = isBeltSelected ? 22 : 16;   // visible band width
            const halfW  = beltW / 2;
            const ROCKS  = 72;  // asteroid count

            // Deterministic rock positions along the orbit (pseudo-random but stable)
            const rocks = Array.from({ length: ROCKS }, (_, i) => {
              const seed   = (i * 137.508 + p.orbitRadius * 1.3) % 360;
              const angle  = (i / ROCKS) * Math.PI * 2 + (seed * Math.PI / 540);
              const spread = ((seed * 7.3) % beltW) - halfW;  // ±halfW px from orbit
              const r      = p.orbitRadius + spread;
              const size   = 0.6 + ((seed * 3.1) % 2.2);      // 0.6 – 2.8 px
              const opa    = 0.35 + ((seed * 5.7) % 0.5);
              return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle), size, opa };
            });

            // Station angles: evenly spread, starting at top (−π/2) rotated slightly per index
            const stCount = beltStations.length;

            const showBelt = activeFilter === 'all' || activeFilter === 'belt';
            const beltOpacity = showBelt || isBeltSelected ? 1 : 0.15;

            return (
              <g key={p.id}>
                {/* ── Orbit band (glow layers) ── */}
                <g style={{ opacity: beltOpacity, transition: 'opacity 0.3s' }}>
                  {/* Outer glow */}
                  <circle cx={cx} cy={cy} r={p.orbitRadius}
                    fill="none" stroke={`${p.color}18`}
                    strokeWidth={beltW + 8}
                    style={{ pointerEvents: 'none' }} />
                  {/* Main band */}
                  <circle cx={cx} cy={cy} r={p.orbitRadius}
                    fill="none"
                    stroke={isBeltSelected ? `${p.color}55` : `${p.color}30`}
                    strokeWidth={beltW}
                    style={{ pointerEvents: 'none' }} />
                  {/* Inner accent line */}
                  <circle cx={cx} cy={cy} r={p.orbitRadius}
                    fill="none"
                    stroke={isBeltSelected ? `${p.color}99` : `${p.color}55`}
                    strokeWidth="0.8"
                    strokeDasharray="3 5"
                    style={{ pointerEvents: 'none' }} />

                  {/* ── Asteroids scattered along the belt ── */}
                  {rocks.map((rock, ri) => (
                    <circle key={`${p.id}-rock-${ri}`}
                      cx={rock.x} cy={rock.y} r={rock.size}
                      fill={p.color} opacity={rock.opa}
                      style={{ pointerEvents: 'none' }} />
                  ))}

                  {/* ── Belt label at top of orbit ── */}
                  <text
                    x={cx} y={cy - p.orbitRadius - (halfW + 6)}
                    textAnchor="middle"
                    fill={isBeltSelected ? p.color : `${p.color}bb`}
                    fontSize="7" fontFamily="Cinzel, serif" letterSpacing="2"
                    style={{ pointerEvents: 'none' }}>
                    {p.name.toUpperCase()}
                  </text>

                  {/* ── Invisible thick ring as belt click target ── */}
                  <circle cx={cx} cy={cy} r={p.orbitRadius}
                    fill="none" stroke="transparent" strokeWidth={beltW + 10}
                    style={{ cursor: 'pointer' }}
                    onClick={() => onSelectPlanet(isBeltSelected ? null : p)} />
                </g>

                {/* ── Stations distributed evenly around the orbit ── */}
                {beltStations.map((station, si) => {
                  // Spread stations evenly, starting from -π/2 (top)
                  const stAngle  = -Math.PI / 2 + (si / Math.max(stCount, 1)) * Math.PI * 2;
                  const sx       = cx + p.orbitRadius * Math.cos(stAngle);
                  const sy       = cy + p.orbitRadius * Math.sin(stAngle);
                  const isStSel  = selectedChild?.name === station.name;
                  const R = 7;
                  const hex = Array.from({ length: 6 }, (_, k) => {
                    const a = (k * Math.PI) / 3 - Math.PI / 6;
                    return `${sx + R * Math.cos(a)},${sy + R * Math.sin(a)}`;
                  }).join(' ');
                  // Short label: first non-article word
                  const shortLabel = station.name.replace("People's Service Station ", 'PSS-').split(' ')[0];

                  const showSt = activeFilter === 'all' || activeFilter === 'station' || activeFilter === 'belt';
                  const stOpacity = showSt || isStSel ? 1 : 0.15;

                  return (
                    <g key={station.name} style={{ cursor: 'pointer', opacity: stOpacity, transition: 'opacity 0.3s' }}
                       onClick={(e) => { e.stopPropagation(); onSelectChild(p, station); }}>
                      {/* Glow backdrop when selected */}
                      {isStSel && (
                        <circle cx={sx} cy={sy} r={R + 5}
                          fill="rgba(79,195,247,0.12)" stroke="rgba(79,195,247,0.3)" strokeWidth="0.8"
                          style={{ pointerEvents: 'none' }} />
                      )}
                      {/* Hexagon body */}
                      <polygon points={hex}
                        fill={isStSel ? 'rgba(79,195,247,0.4)' : 'rgba(79,195,247,0.08)'}
                        stroke="#4FC3F7"
                        strokeWidth={isStSel ? 1.8 : 0.9}
                        opacity={isStSel ? 1 : 0.8}
                        style={{ pointerEvents: 'none' }} />
                      {/* Center dot */}
                      <circle cx={sx} cy={sy} r={1.8}
                        fill="#4FC3F7" opacity={0.95}
                        style={{ pointerEvents: 'none' }} />
                      {/* Short label */}
                      <text x={sx} y={sy + R + 9} textAnchor="middle"
                        fill={isStSel ? '#4FC3F7' : 'rgba(79,195,247,0.65)'}
                        fontSize="5.5" fontFamily="Cinzel, serif" letterSpacing="0.3"
                        style={{ pointerEvents: 'none' }}>
                        {shortLabel}
                      </text>
                      {/* Hit area */}
                      <circle cx={sx} cy={sy} r={16} fill="transparent" />
                    </g>
                  );
                })}
              </g>
            );
          }

          // ── PLANET NODE ────────────────────────────────────────
          const planetR = 24;
          const hitR = planetR + 16;
          const moons = p.children.filter(c => c.type === 'moon');
          
          const showPlanet = activeFilter === 'all' || activeFilter === 'planet' || activeFilter === p.type;
          const pOpacity = showPlanet || isSelected ? 1 : 0.15;

          return (
            <g key={p.id} filter={isSelected ? 'url(#glow)' : undefined}>
              <g style={{ cursor: 'pointer', opacity: pOpacity, transition: 'opacity 0.3s' }} onClick={() => onSelectPlanet(isSelected ? null : p)}>
                {/* Selection ring */}
                {isSelected && (
                  <circle cx={px} cy={py} r={planetR + 8} fill="none" stroke={p.color} strokeWidth="1.5" opacity="0.7" style={{ pointerEvents: 'none' }} />
                )}

                {/* Planet sphere */}
                <circle
                  cx={px} cy={py} r={planetR}
                  fill={`url(#grad-${p.id})`}
                  stroke={isSelected ? p.color : 'rgba(255,255,255,0.12)'}
                  strokeWidth={isSelected ? 2 : 1}
                  style={{ pointerEvents: 'none' }}
                />
                {/* Surface shader */}
                <ellipse cx={px + planetR * 0.25} cy={py - planetR * 0.2} rx={planetR * 0.5} ry={planetR * 0.35} fill="rgba(255,255,255,0.06)" style={{ pointerEvents: 'none' }} />
                <ellipse cx={px + planetR * 0.1} cy={py + planetR * 0.4} rx={planetR * 0.65} ry={planetR * 0.2} fill="rgba(0,0,0,0.25)" style={{ pointerEvents: 'none' }} />

                {/* Planet label */}
                <text x={px} y={py + planetR + 15} textAnchor="middle"
                  fill={isSelected ? p.color : 'rgba(255,255,255,0.6)'}
                  fontSize="8" fontFamily="Cinzel, serif" letterSpacing="1.5"
                  style={{ pointerEvents: 'none' }}>
                  {p.name.toUpperCase()}
                </text>

                {/* HIT AREA */}
                <circle cx={px} cy={py} r={hitR} fill="transparent" />
              </g>

              {/* Moon indicator dots (not selected) */}
              {!isSelected && moons.map((moon, mi) => {
                const showMoon = activeFilter === 'all' || activeFilter === 'moon' || activeFilter === 'planet';
                const mRad = rad + (mi + 1) * ((Math.PI * 2) / (moons.length + 1));
                const moonOr = 42;
                const mx2 = px + moonOr * Math.cos(mRad);
                const my2 = py + moonOr * Math.sin(mRad);
                return (
                  <circle key={moon.name} cx={mx2} cy={my2} r={4}
                    fill="rgba(161,138,138,0.35)" stroke="rgba(161,138,138,0.5)" strokeWidth="0.5"
                    style={{ opacity: showMoon ? 1 : 0.1, transition: 'opacity 0.3s', pointerEvents: 'none' }} />
                );
              })}

              {/* Expanded children orbit when selected */}
              {isSelected && p.children.filter(c => c.type !== 'lagrange').map((child, ci, arr) => {
                const childAngle = (ci / arr.length) * Math.PI * 2 - Math.PI / 2;
                const childOr = 58;
                const cxCoord = px + childOr * Math.cos(childAngle);
                const cyCoord = py + childOr * Math.sin(childAngle);
                const tc = TYPE_CONFIG[child.type];
                const isChildSelected = selectedChild?.name === child.name;
                const showChild = activeFilter === 'all' || activeFilter === 'planet' || activeFilter === child.type;
                const childOpacity = showChild || isChildSelected ? 1 : 0.15;
                const cR = child.type === 'station' ? 8 : 7;
                const hitChild = cR + 10;

                return (
                  <g key={child.name} style={{ cursor: 'pointer', opacity: childOpacity, transition: 'opacity 0.3s' }}
                     onClick={(e) => { e.stopPropagation(); onSelectChild(p, child); }}>
                    <line x1={px} y1={py} x2={cxCoord} y2={cyCoord}
                      stroke={tc.color} strokeWidth="0.5" opacity="0.25" strokeDasharray="2 3"
                      style={{ pointerEvents: 'none' }} />
                    {child.type === 'station' ? (
                      <polygon
                        points={`${cxCoord},${cyCoord - cR * 1.5} ${cxCoord + cR * 1.3},${cyCoord + cR * 0.8} ${cxCoord - cR * 1.3},${cyCoord + cR * 0.8}`}
                        fill={tc.color} stroke={isChildSelected ? '#fff' : 'none'} strokeWidth="1.5"
                        opacity={isChildSelected ? 1 : 0.8}
                        style={{ pointerEvents: 'none' }}
                      />
                    ) : child.type === 'city' ? (
                      <polygon
                        points={Array.from({length: 5}, (_, k) => {
                          const a = (k * Math.PI * 2) / 5 - Math.PI / 2;
                          return `${cxCoord + cR * 1.3 * Math.cos(a)},${cyCoord + cR * 1.3 * Math.sin(a)}`;
                        }).join(' ')}
                        fill={tc.color} stroke={isChildSelected ? '#fff' : 'none'} strokeWidth="1.5"
                        opacity={isChildSelected ? 1 : 0.8}
                        style={{ pointerEvents: 'none' }}
                      />
                    ) : child.type === 'belt' ? (
                      <circle cx={cxCoord} cy={cyCoord} r={cR} fill="none" stroke={tc.color}
                        strokeWidth="2.5" strokeDasharray="2 2" opacity="0.7"
                        style={{ pointerEvents: 'none' }} />
                    ) : (
                      <circle cx={cxCoord} cy={cyCoord} r={cR}
                        fill={isChildSelected ? tc.color : tc.bgColor}
                        stroke={isChildSelected ? '#fff' : tc.color}
                        strokeWidth={isChildSelected ? 2 : 1.2}
                        opacity={isChildSelected ? 1 : 0.85}
                        style={{ pointerEvents: 'none' }}
                      />
                    )}
                    <text x={cxCoord} y={cyCoord + cR + 11} textAnchor="middle"
                      fill={isChildSelected ? '#fff' : 'rgba(255,255,255,0.55)'}
                      fontSize="6.5" fontFamily="Cinzel, serif" letterSpacing="0.5"
                      style={{ pointerEvents: 'none' }}>
                      {child.name.replace('Lagrange ', 'L')}
                    </text>
                    <circle cx={cxCoord} cy={cyCoord} r={hitChild} fill="transparent" />
                  </g>
                );
              })}
            </g>
          );
        })}

        {/* ── PERMANENT STATION & CITY ICONS ── planets only; belts self-render their stations ── */}
        {planets.map(p => {
          const rad = (animAngles[p.id] * Math.PI) / 180;
          const px = cx + p.orbitRadius * Math.cos(rad);
          const py = cy + p.orbitRadius * Math.sin(rad);
          const stations = p.children.filter(c => (c.type === 'station' || c.type === 'city') && !c.name.startsWith('Lagrange'));
          const isParentSelected = selectedPlanet?.id === p.id;

          // Belts self-render their stations; planets hide permanent icons when expanded
          if (p.nodeType === 'belt' || (isParentSelected && p.nodeType === 'planet') || stations.length === 0) return null;

          return stations.map((station, si) => {
            const isCity = station.type === 'city';
            // Position around a ring slightly outside the planet
            const ringR = isCity ? 28 : (p.nodeType === 'belt' ? 38 : 44);
            const sAngle = rad + (si * (Math.PI * 2 / Math.max(stations.length, 1))) + Math.PI * 0.3;
            const sx = px + ringR * Math.cos(sAngle);
            const sy = py + ringR * Math.sin(sAngle);
            const isSelected = selectedChild?.name === station.name;
            const showSt = activeFilter === 'all' || activeFilter === station.type || activeFilter === 'planet';
            const stOpacity = showSt || isSelected ? 1 : 0.15;
            const R = isCity ? 6 : 7;
            const points = Array.from({length: isCity ? 5 : 6}, (_, k) => {
              const a = (k * Math.PI * 2) / (isCity ? 5 : 6) + (isCity ? -Math.PI / 2 : -Math.PI / 6);
              return `${sx + R * Math.cos(a)},${sy + R * Math.sin(a)}`;
            }).join(' ');

            return (
              <g key={station.name} style={{ cursor: 'pointer', opacity: stOpacity, transition: 'opacity 0.3s' }}
                 onClick={(e) => { e.stopPropagation(); onSelectChild(p, station); }}>
                {/* Connector line */}
                <line x1={px} y1={py} x2={sx} y2={sy}
                  stroke={isCity ? "#B39DDB" : "#4FC3F7"} strokeWidth="0.4" opacity="0.2" strokeDasharray="2 3"
                  style={{ pointerEvents: 'none' }} />
                {/* Polygon body */}
                <polygon points={points}
                  fill={isSelected ? (isCity ? 'rgba(179,157,219,0.4)' : 'rgba(79,195,247,0.4)') : (isCity ? 'rgba(179,157,219,0.1)' : 'rgba(79,195,247,0.1)')}
                  stroke={isCity ? "#B39DDB" : "#4FC3F7"}
                  strokeWidth={isSelected ? 1.5 : 0.8}
                  opacity={isSelected ? 1 : 0.75}
                  style={{ pointerEvents: 'none' }} />
                {/* Inner dot */}
                <circle cx={sx} cy={sy} r={1.5} fill={isCity ? "#B39DDB" : "#4FC3F7"} opacity="0.9" style={{ pointerEvents: 'none' }} />
                {/* Label */}
                <text x={sx} y={sy + R + 9} textAnchor="middle"
                  fill={isSelected ? (isCity ? '#B39DDB' : '#4FC3F7') : (isCity ? 'rgba(179,157,219,0.6)' : 'rgba(79,195,247,0.6)')}
                  fontSize="5.5" fontFamily="Cinzel, serif" letterSpacing="0.3"
                  style={{ pointerEvents: 'none' }}>
                  {station.name.split(' ')[0].toUpperCase()}
                </text>
                {/* Hit area */}
                <circle cx={sx} cy={sy} r={14} fill="transparent" />
              </g>
            );
          });
        })}

        {/* Jump points on outer edge — from JSON */}
        {jumpPoints.map((jp, i) => {
          const jRad = ((i / jumpPoints.length) * Math.PI * 2) - Math.PI * 0.3;
          const jR = 650;
          const jx = Math.min(Math.max(cx + jR * 0.5 * Math.cos(jRad), 30), 810);
          const jy = Math.min(Math.max(cy + jR * 0.5 * Math.sin(jRad), 20), 660);
          const showJP = activeFilter === 'all' || activeFilter === 'jumppoint';

          return (
            <g key={jp.name} style={{ cursor: 'pointer', opacity: showJP ? 1 : 0.15, transition: 'opacity 0.3s' }}>
              {/* Hexagon shape */}
              <polygon
                points={`${jx},${jy - 11} ${jx + 10},${jy - 5} ${jx + 10},${jy + 5} ${jx},${jy + 11} ${jx - 10},${jy + 5} ${jx - 10},${jy - 5}`}
                fill="rgba(196, 30, 58, 0.12)"
                stroke="#c41e3a"
                strokeWidth="1.2"
                opacity="0.9"
                style={{ pointerEvents: 'none' }}
              />
              <text x={jx} y={jy + 4} textAnchor="middle" fill="#c41e3a" fontSize="8" fontFamily="Cinzel, serif" opacity="0.9" style={{ pointerEvents: 'none' }}>⬡</text>
              <text x={jx} y={jy + 21} textAnchor="middle" fill="rgba(196,30,58,0.75)" fontSize="6" fontFamily="Cinzel, serif" letterSpacing="0.5" style={{ pointerEvents: 'none' }}>
                {jp.name.replace('Punto de Salto → ', '→ ').replace('Punto de Salto → ', '→ ')}
              </text>
              {/* HIT AREA: large invisible rect */}
              <rect x={jx - 30} y={jy - 20} width={60} height={46} fill="transparent" />
            </g>
          );
        })}

        </g>{/* end zoom/pan transform group */}
      </svg>

      {/* ── ZOOM CONTROLS OVERLAY ── */}
      <div
        style={{
          position: 'absolute', bottom: '1rem', right: '1rem',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem',
          zIndex: 15, userSelect: 'none',
        }}
      >
        {/* Zoom % indicator */}
        <div style={{
          padding: '0.2rem 0.5rem',
          background: 'rgba(5,1,1,0.9)', border: '1px solid rgba(212,175,55,0.3)',
          borderRadius: '2px', backdropFilter: 'blur(8px)',
          fontFamily: 'Cinzel, serif', fontSize: '0.5rem', letterSpacing: '2px',
          color: 'rgba(212,175,55,0.8)', textAlign: 'center', minWidth: '44px',
        }}>
          {Math.round(zoom * 100)}%
        </div>

        {/* + button */}
        <button
          onClick={() => handleZoomBtn(1.25)}
          style={{
            width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(5,1,1,0.9)', border: '1px solid rgba(212,175,55,0.3)',
            borderRadius: '2px', cursor: 'pointer', color: 'rgba(212,175,55,0.8)',
            fontSize: '1rem', fontWeight: 700, backdropFilter: 'blur(8px)', transition: '0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--secondary)', e.currentTarget.style.color = 'var(--secondary)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(212,175,55,0.3)', e.currentTarget.style.color = 'rgba(212,175,55,0.8)')}
          title="Acercar"
        >+</button>

        {/* ─ button */}
        <button
          onClick={() => handleZoomBtn(0.8)}
          style={{
            width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(5,1,1,0.9)', border: '1px solid rgba(212,175,55,0.3)',
            borderRadius: '2px', cursor: 'pointer', color: 'rgba(212,175,55,0.8)',
            fontSize: '1rem', fontWeight: 700, backdropFilter: 'blur(8px)', transition: '0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--secondary)', e.currentTarget.style.color = 'var(--secondary)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(212,175,55,0.3)', e.currentTarget.style.color = 'rgba(212,175,55,0.8)')}
          title="Alejar"
        >−</button>

        {/* Reset button */}
        <button
          onClick={handleZoomReset}
          style={{
            width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(196,30,58,0.12)', border: '1px solid rgba(196,30,58,0.35)',
            borderRadius: '2px', cursor: 'pointer', color: 'rgba(196,30,58,0.85)',
            fontSize: '0.75rem', backdropFilter: 'blur(8px)', transition: '0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = '#c41e3a', e.currentTarget.style.color = '#c41e3a')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(196,30,58,0.35)', e.currentTarget.style.color = 'rgba(196,30,58,0.85)')}
          title="Restablecer vista"
        >⦿</button>
      </div>
    </div>
  );
};

// ─── GRID VIEW COMPONENT ──────────────────────────────────────────────────────
const GridView: React.FC<{
  planets: Planet[];
  onSelect: (p: Planet, c?: SubLocation) => void;
  selectedPlanet: Planet | null;
  selectedChild: SubLocation | null;
  activeFilter: LocationType | 'all';
  jumpPoints: SubLocation[];
}> = ({ planets, onSelect, selectedPlanet, selectedChild, activeFilter, jumpPoints }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {planets.map(planet => {
        const visibleChildren = planet.children.filter(c =>
          activeFilter === 'all' || c.type === activeFilter
        );
        const showPlanet = activeFilter === 'all' || activeFilter === 'planet' || activeFilter === planet.type;

        // Do not render the wrapper at all if nothing matches
        if (!showPlanet && visibleChildren.length === 0) return null;

        return (
          <div key={planet.id}>
            {/* Planet row */}
            {showPlanet && (
              <motion.div
                onClick={() => onSelect(planet)}
                whileHover={{ x: 4 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  padding: '0.8rem 1rem', cursor: 'pointer',
                  background: selectedPlanet?.id === planet.id && !selectedChild
                    ? `${planet.color}18` : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${selectedPlanet?.id === planet.id && !selectedChild ? planet.color + '60' : 'rgba(255,255,255,0.07)'}`,
                  borderLeft: `3px solid ${planet.color}`,
                  borderRadius: '3px', marginBottom: '0.4rem',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: `radial-gradient(circle at 35% 30%, ${planet.color}ff, ${planet.color}44)`,
                  boxShadow: `0 0 12px ${planet.glowColor}`,
                  border: `1.5px solid ${planet.color}60`,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontFamily: 'var(--cinzel-font)', fontSize: '0.85rem', letterSpacing: '3px', color: planet.color }}>{planet.name}</p>
                  <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '1px' }}>{planet.faction}</p>
                </div>
                <div style={{
                  fontSize: '0.55rem', letterSpacing: '2px', padding: '0.15rem 0.4rem',
                  border: `1px solid ${THREAT_CONFIG[planet.threat].color}40`,
                  color: THREAT_CONFIG[planet.threat].color, fontFamily: 'var(--cinzel-font)', borderRadius: '2px',
                }}>● {planet.threat}</div>
              </motion.div>
            )}

            {/* Children */}
            <div style={{ paddingLeft: '2rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {visibleChildren.map(child => {
                const tc = TYPE_CONFIG[child.type];
                const isSelected = selectedChild?.name === child.name && selectedPlanet?.id === planet.id;
                return (
                  <motion.div
                    key={child.name}
                    onClick={() => onSelect(planet, child)}
                    whileHover={{ x: 4 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.7rem',
                      padding: '0.5rem 0.8rem', cursor: 'pointer',
                      background: isSelected ? `${tc.color}15` : 'transparent',
                      border: `1px solid ${isSelected ? tc.color + '50' : 'rgba(255,255,255,0.04)'}`,
                      borderLeft: `2px solid ${tc.color}60`,
                      borderRadius: '2px', transition: 'all 0.2s',
                    }}
                  >
                    <span style={{ color: tc.color, fontSize: '0.8rem', width: 16, textAlign: 'center' }}>{tc.icon}</span>
                    <span style={{ flex: 1, fontSize: '0.78rem', color: isSelected ? 'var(--text-main)' : 'var(--text-muted)' }}>{child.name}</span>
                    <span style={{ fontSize: '0.5rem', letterSpacing: '2px', color: tc.color, fontFamily: 'var(--cinzel-font)' }}>{tc.label}</span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Jump Points */}
      {(activeFilter === 'all' || activeFilter === 'jumppoint') && (
        <div>
          <p style={{ margin: '0 0 0.4rem', fontSize: '0.55rem', letterSpacing: '3px', color: 'var(--text-muted)', fontFamily: 'var(--cinzel-font)' }}>
            ── PUNTOS DE SALTO ──
          </p>
          {jumpPoints.map((jp: SubLocation) => (
            <div key={jp.name} style={{
              display: 'flex', alignItems: 'center', gap: '0.7rem',
              padding: '0.5rem 0.8rem', cursor: 'default',
              border: '1px solid rgba(196,30,58,0.15)', borderLeft: '2px solid rgba(196,30,58,0.5)',
              borderRadius: '2px', marginBottom: '0.25rem',
            }}>
              <span style={{ color: '#c41e3a', fontSize: '0.8rem' }}>⬡</span>
              <span style={{ flex: 1, fontSize: '0.78rem', color: 'var(--text-muted)' }}>{jp.name}</span>
              <span style={{ fontSize: '0.5rem', letterSpacing: '2px', color: '#c41e3a', fontFamily: 'var(--cinzel-font)' }}>SALTO</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── MAIN PAGE COMPONENT ───────────────────────────────────────────────────────

// Responsive breakpoint hook
function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handle = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);
  return width;
}

const StarMap: React.FC = () => {
  const [viewMode, setViewMode] = useState<'orbital' | 'grid'>('orbital');
  const [selectedSystem, setSelectedSystem] = useState('STANTON');
  const [selectedPlanet, setSelectedPlanet] = useState<Planet | null>(null);
  const [selectedChild, setSelectedChild] = useState<SubLocation | null>(null);
  const [activeFilter, setActiveFilter] = useState<LocationType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < 640;
  const isTablet = windowWidth < 1024;

  // Derived data from JSON
  const activeSistema = SISTEMAS.find(s => s.id === selectedSystem) ?? SISTEMAS[0];
  const allPlanets = getPlanetsForSystem(selectedSystem);
  const activeJumpPoints = getJumpPointsForSystem(selectedSystem);

  useEffect(() => {
    document.title = `Nexo Estelar · ${activeSistema.nombre} | Star Grimoire`;
  }, [activeSistema.nombre]);

  const handleSelectPlanet = useCallback((p: Planet | null) => {
    setSelectedPlanet(p);
    setSelectedChild(null);
  }, []);

  const handleSelectChild = useCallback((p: Planet, c: SubLocation) => {
    setSelectedPlanet(p);
    setSelectedChild(c);
  }, []);

  const handleClose = useCallback(() => {
    setSelectedChild(null);
    setSelectedPlanet(null);
  }, []);

  const handleGridSelect = useCallback((p: Planet, c?: SubLocation) => {
    if (c) {
      handleSelectChild(p, c);
    } else {
      setSelectedPlanet(prev => prev?.id === p.id && !selectedChild ? null : p);
      setSelectedChild(null);
    }
  }, [handleSelectChild, selectedChild]);

  // Reset selection when changing system
  const handleSelectSystem = useCallback((sysId: string) => {
    setSelectedSystem(sysId);
    setSelectedPlanet(null);
    setSelectedChild(null);
  }, []);

  // Filter planets by search
  const filteredPlanets = allPlanets.filter(p => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) ||
      p.children.some(c => c.name.toLowerCase().includes(q)) ||
      p.faction.toLowerCase().includes(q);
  });

  const FILTERS: { id: LocationType | 'all'; label: string; icon: string }[] = [
    { id: 'all', label: 'TODOS', icon: '◈' },
    { id: 'planet', label: 'PLANETAS', icon: '🪐' },
    { id: 'moon', label: 'LUNAS', icon: '◐' },
    { id: 'city', label: 'CIUDADES', icon: '⬟' },
    { id: 'station', label: 'ESTACIONES', icon: '⬡' },
    { id: 'belt', label: 'CINTURONES', icon: '◌' },
    { id: 'jumppoint', label: 'SALTOS', icon: '⬡' },
  ];

  return (
    <div style={{ padding: isMobile ? '0 0.5rem 4rem' : '0 1rem 4rem', maxWidth: '1400px', margin: '0 auto' }}>

      {/* ── PAGE HEADER ── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        style={{ textAlign: 'center', padding: isMobile ? '1.5rem 0.5rem 1rem' : '2rem 1rem 1.5rem' }}
      >
        <p style={{ fontFamily: 'var(--cinzel-font)', fontSize: '0.6rem', letterSpacing: '6px', color: 'var(--text-muted)', margin: '0 0 0.5rem' }}>
          ☩ CARTOGRAFÍA DEL VACÍO ☩
        </p>
        <h1 style={{ fontFamily: 'var(--cinzel-font)', color: 'var(--secondary)', letterSpacing: isMobile ? '4px' : '8px', margin: '0 0 0.5rem', fontSize: 'clamp(1.2rem, 5vw, 2.4rem)' }}>
          NEXO ESTELAR
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: isMobile ? '0.7rem' : '0.85rem', letterSpacing: '1px', margin: 0, maxWidth: 600, marginLeft: 'auto', marginRight: 'auto' }}>
          {isMobile ? activeSistema.nombre : activeSistema.descripcion}
        </p>
        {!isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginTop: '1rem', opacity: 0.4 }}>
            <div style={{ width: '60px', height: '1px', background: 'linear-gradient(to right, transparent, var(--secondary))' }} />
            <span style={{ color: 'var(--secondary)', fontFamily: 'var(--cinzel-font)', fontSize: '0.6rem', letterSpacing: '4px' }}>IN NOMINI OBLIVIONIS</span>
            <div style={{ width: '60px', height: '1px', background: 'linear-gradient(to left, transparent, var(--secondary))' }} />
          </div>
        )}

        {/* ── SYSTEM SELECTOR ── */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem', marginTop: '1.2rem', flexWrap: 'wrap' }}>
          {SISTEMAS.map(sys => (
            <button
              key={sys.id}
              onClick={() => handleSelectSystem(sys.id)}
              style={{
                padding: isMobile ? '0.3rem 0.7rem' : '0.4rem 1rem',
                fontFamily: 'var(--cinzel-font)',
                fontSize: isMobile ? '0.55rem' : '0.65rem',
                letterSpacing: '2px',
                border: `1px solid ${selectedSystem === sys.id ? 'var(--secondary)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: '2px',
                background: selectedSystem === sys.id ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.02)',
                color: selectedSystem === sys.id ? 'var(--secondary)' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: selectedSystem === sys.id ? '0 0 12px rgba(212,175,55,0.2)' : 'none',
              }}
            >
              <span style={{ marginRight: '0.3rem', opacity: 0.7 }}>⬡</span>
              {sys.nombre.toUpperCase()}
              <span style={{ marginLeft: '0.4rem', fontSize: '0.5rem', opacity: 0.6, letterSpacing: '1px' }}>{sys.afiliacion.split('/')[0].trim().toUpperCase()}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* ── CONTROLS BAR ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', marginBottom: '0.8rem', padding: '0 0.25rem' }}
      >
        {/* Search — full width on mobile */}
        <div style={{ position: 'relative', flex: isMobile ? '1 1 100%' : '1 1 200px', maxWidth: isMobile ? '100%' : 280 }}>
          <span style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>⌕</span>
          <input
            type="text"
            placeholder="Buscar ubicación..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="search-input"
            style={{ paddingLeft: '2rem', width: '100%', boxSizing: 'border-box' }}
          />
        </div>

        {/* Filter buttons — icon-only on mobile */}
        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', flex: '1 1 auto' }}>
          {FILTERS.map(f => (
            <button
              key={f.id}
              className={`filter-btn ${activeFilter === f.id ? 'active' : ''}`}
              onClick={() => setActiveFilter(f.id)}
              title={f.label}
              style={{ padding: isMobile ? '0.4rem 0.5rem' : undefined }}
            >
              {f.icon}{!isMobile && <> {f.label}</>}
            </button>
          ))}
        </div>

        {/* View toggle */}
        <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: '3px', overflow: 'hidden', flexShrink: 0 }}>
          <button
            onClick={() => setViewMode('orbital')}
            style={{
              padding: '0.4rem 0.7rem', border: 'none', cursor: 'pointer', fontSize: '0.7rem',
              fontFamily: 'var(--cinzel-font)', letterSpacing: '1px', transition: '0.2s',
              background: viewMode === 'orbital' ? 'var(--primary)' : 'rgba(255,255,255,0.03)',
              color: viewMode === 'orbital' ? '#fff' : 'var(--text-muted)',
            }}
          >⊙{!isMobile && ' ORBITAL'}</button>
          <button
            onClick={() => setViewMode('grid')}
            style={{
              padding: '0.4rem 0.7rem', border: 'none', cursor: 'pointer', fontSize: '0.7rem',
              fontFamily: 'var(--cinzel-font)', letterSpacing: '1px', transition: '0.2s',
              background: viewMode === 'grid' ? 'var(--primary)' : 'rgba(255,255,255,0.03)',
              color: viewMode === 'grid' ? '#fff' : 'var(--text-muted)',
              borderLeft: '1px solid var(--border)',
            }}
          >☰{!isMobile && ' LISTA'}</button>
        </div>
      </motion.div>

      {/* ── MAIN LAYOUT ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        style={{
          display: (viewMode === 'grid' && !isMobile) ? 'grid' : 'block',
          gridTemplateColumns: (selectedPlanet && viewMode === 'grid' && !isMobile) ? '1fr 320px' : '1fr',
          gap: '1rem',
          alignItems: 'start',
        }}
      >
        {/* MAP / LIST AREA */}
        <div
          className="glass-card"
          style={{
            padding: viewMode === 'orbital' ? '0' : '1rem',
            overflow: 'hidden',
            // Responsive height: aspect-ratio on desktop, min-height on mobile
            aspectRatio: (viewMode === 'orbital' && !isMobile) ? '16/10' : undefined,
            minHeight: viewMode === 'orbital' ? (isMobile ? '65vw' : undefined) : 'auto',
            position: 'relative',
          }}
        >
          {viewMode === 'orbital' ? (
            <>
              <OrbitalMap
                key={selectedSystem}
                planets={filteredPlanets}
                selectedPlanet={selectedPlanet}
                onSelectPlanet={handleSelectPlanet}
                onSelectChild={handleSelectChild}
                selectedChild={selectedChild}
                jumpPoints={activeJumpPoints}
                starColor={activeSistema.color_estrella}
                starLabel={activeSistema.estrella}
                activeFilter={activeFilter}
              />
              {/* Legend — hide on mobile when panel open to save space */}
              {!isMobile && (
                <div style={{
                  position: 'absolute', bottom: '1rem', left: '1rem',
                  display: 'flex', flexDirection: 'column', gap: '0.3rem',
                  background: 'rgba(5,1,1,0.85)', padding: '0.6rem 0.8rem',
                  border: '1px solid rgba(212,175,55,0.15)', borderRadius: '3px',
                  backdropFilter: 'blur(8px)', zIndex: 2,
                }}>
                  {Object.entries(TYPE_CONFIG).filter(([k]) => k !== 'lagrange').map(([key, conf]) => (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ color: conf.color, fontSize: '0.7rem', width: 14 }}>{conf.icon}</span>
                      <span style={{ fontSize: '0.55rem', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.4)', fontFamily: 'Cinzel, serif' }}>{conf.label}</span>
                    </div>
                  ))}
                </div>
              )}
              {/* Interaction hint */}
              {!selectedPlanet && (
                <div style={{
                  position: 'absolute', top: '0.6rem', right: '0.6rem',
                  background: 'rgba(5,1,1,0.7)', padding: '0.3rem 0.6rem',
                  border: '1px solid rgba(212,175,55,0.2)', borderRadius: '2px',
                  backdropFilter: 'blur(8px)', zIndex: 2,
                }}>
                  <p style={{ margin: 0, fontSize: isMobile ? '0.5rem' : '0.6rem', color: 'var(--text-muted)', fontFamily: 'var(--cinzel-font)', letterSpacing: '1px' }}>
                    {isMobile ? 'TAP PLANETA' : '← SELECCIONA UN PLANETA'}
                  </p>
                </div>
              )}
              {/* ORBITAL MODE: Detail panel — overlay on desktop, below map on mobile */}
              {selectedPlanet && !isMobile && (
                <div style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  width: isTablet ? '260px' : '300px',
                  maxHeight: 'calc(100% - 2rem)',
                  zIndex: 10,
                  overflowY: 'auto',
                }}>
                  <DetailPanel
                    systemName={activeSistema.nombre}
                    selected={selectedChild ? { planet: selectedPlanet, child: selectedChild } : { planet: selectedPlanet }}
                    onClose={handleClose}
                  />
                </div>
              )}
            </>
          ) : (
            <GridView
              key={selectedSystem}
              planets={filteredPlanets}
              onSelect={handleGridSelect}
              selectedPlanet={selectedPlanet}
              selectedChild={selectedChild}
              activeFilter={activeFilter}
              jumpPoints={activeJumpPoints}
            />
          )}
        </div>

        {/* Detail panel — below map on mobile orbital, beside list on tablet+desktop */}
        {selectedPlanet && (viewMode === 'grid' ? !isMobile : isMobile) && (
          <DetailPanel
            systemName={activeSistema.nombre}
            selected={selectedChild ? { planet: selectedPlanet, child: selectedChild } : { planet: selectedPlanet }}
            onClose={handleClose}
          />
        )}

        {/* Mobile orbital: detail panel below the map as a full-width card */}
        {selectedPlanet && viewMode === 'orbital' && isMobile && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            style={{ marginTop: '0.8rem' }}
          >
            <DetailPanel
              systemName={activeSistema.nombre}
              selected={selectedChild ? { planet: selectedPlanet, child: selectedChild } : { planet: selectedPlanet }}
              onClose={handleClose}
            />
          </motion.div>
        )}
      </motion.div>


      {/* ── STATS BAR ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '0.6rem',
          marginTop: '1rem',
        }}
      >
        {[
          { label: 'PLANETAS', value: '4', icon: '🪐', color: 'var(--secondary)' },
          { label: 'LUNAS', value: '11', icon: '◐', color: '#a18a8a' },
          { label: 'ESTACIONES', value: '4+', icon: '⬡', color: '#4FC3F7' },
          { label: 'PUNTOS DE SALTO', value: '4', icon: '⬡', color: '#c41e3a' },
          { label: 'CINTURONES', value: '1', icon: '◌', color: '#8B7355' },
        ].map(stat => (
          <div key={stat.label} style={{
            padding: '0.8rem', textAlign: 'center',
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '3px',
          }}>
            <p style={{ margin: '0 0 0.2rem', fontSize: '1.2rem' }}>{stat.icon}</p>
            <p style={{ margin: '0 0 0.1rem', fontFamily: 'var(--cinzel-font)', fontSize: '1.1rem', color: stat.color, fontWeight: 700 }}>{stat.value}</p>
            <p style={{ margin: 0, fontSize: '0.5rem', letterSpacing: '2px', color: 'var(--text-muted)', fontFamily: 'var(--cinzel-font)' }}>{stat.label}</p>
          </div>
        ))}
      </motion.div>
    </div>
  );
};

export default StarMap;

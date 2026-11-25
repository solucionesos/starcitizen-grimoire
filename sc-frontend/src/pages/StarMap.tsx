import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Building2,
  Compass,
  Globe,
  Hexagon,
  LayoutList,
  Minus,
  Moon,
  Orbit,
  Plus,
  Radar,
  RotateCcw,
  Search,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';
import { getResources } from '../api/client';
import DualLabel from '../components/DualLabel';
import { TERMINOLOGY } from '../constants/terminology';
import STARMAP_JSON from '../data/starmap.json';
import type { Resource } from '../types';

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
  nodeType: 'planet' | 'belt';
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

interface RawSubLocationJson {
  nombre: string;
  tipo?: string;
  descripcion: string;
  faction?: string;
  afiliacion?: string;
  threat?: string;
  amenaza?: string;
  servicios?: string[];
}

interface RawJumpPointJson {
  nombre: string;
  descripcion: string;
  threat?: string;
}

interface RawPlanetJson {
  id: string;
  nombre: string;
  tipo?: string;
  descripcion: string;
  faction?: string;
  ciudad_lz?: string;
  color: string;
  glowColor: string;
  threat?: string;
  orbitRadius: number;
  orbitAngle: number;
  lunas?: RawSubLocationJson[];
  estaciones?: RawSubLocationJson[];
  lagrange?: string[];
  hijos?: RawSubLocationJson[];
}

interface RawSystemJson {
  id: string;
  nombre: string;
  estrella: string;
  afiliacion: string;
  descripcion: string;
  color_estrella?: string;
  planetas?: RawPlanetJson[];
  jump_points?: RawJumpPointJson[];
}

const RAW_SISTEMAS = (STARMAP_JSON as { sistemas: RawSystemJson[] }).sistemas;

// ─── JSON → INTERNAL TYPE MAPPER ─────────────────────────────────────────────
function mapPlanet(p: RawPlanetJson): Planet {
  const lunas: SubLocation[] = (p.lunas ?? []).map((l) => ({
    name: l.nombre,
    type: (l.tipo ?? 'moon') as LocationType,
    description: l.descripcion,
    faction: l.faction ?? (l.tipo === 'moon' ? 'No controlada' : undefined),
    threat: (l.threat ?? 'BAJO') as ThreatLevel,
    services: l.servicios ?? [],
  }));

  const estaciones: SubLocation[] = (p.estaciones ?? []).map((e) => ({
    name: e.nombre,
    type: (e.tipo ?? 'station') as LocationType,
    description: e.descripcion,
    faction: e.faction,
    threat: (e.threat ?? 'BAJO') as ThreatLevel,
    services: e.servicios ?? [],
  }));

  const lagrange: SubLocation[] = (p.lagrange ?? []).map((tag) => ({
    name: `Lagrange ${tag}`,
    type: 'lagrange' as LocationType,
    description: `Punto de equilibrio gravitacional ${tag} de ${p.nombre}.`,
    threat: 'BAJO' as ThreatLevel,
    services: ['Navegación'],
  }));

  const ciudades: SubLocation[] = (p.hijos ?? [])
    .filter((h) => h.tipo === 'city' || h.tipo === 'ciudad')
    .map((c) => ({
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
    faction: p.faction ?? (p.ciudad_lz ? `${p.nombre} (${p.ciudad_lz})` : p.nombre),
    color: p.color,
    glowColor: p.glowColor,
    threat: (p.threat ?? 'BAJO') as ThreatLevel,
    orbitRadius: p.orbitRadius,
    orbitAngle: p.orbitAngle,
    children: [...lunas, ...estaciones, ...lagrange, ...ciudades],
  };
}

function mapJumpPoints(jps: RawJumpPointJson[]): SubLocation[] {
  return (jps ?? []).map((jp) => ({
    name: jp.nombre,
    type: 'jumppoint' as LocationType,
    description: jp.descripcion,
    threat: (jp.threat ?? 'MEDIO') as ThreatLevel,
    services: ['Tránsito'],
  }));
}

// ─── DATA ACCESS HELPERS ──────────────────────────────────────────────────────
const SISTEMAS: StarSystem[] = RAW_SISTEMAS.map((s) => ({
  id: s.id,
  nombre: s.nombre,
  estrella: s.estrella,
  afiliacion: s.afiliacion,
  descripcion: s.descripcion,
  color_estrella: s.color_estrella ?? '#FFD54F',
}));

function getPlanetsForSystem(systemId: string): Planet[] {
  const sys = RAW_SISTEMAS.find((s) => s.id === systemId);
  if (!sys) return [];
  return (sys.planetas ?? []).map(mapPlanet);
}

function getJumpPointsForSystem(systemId: string): SubLocation[] {
  const sys = RAW_SISTEMAS.find((s) => s.id === systemId);
  if (!sys) return [];
  return mapJumpPoints(sys.jump_points ?? []);
}

// ─── TYPE CONFIGURATION ────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<LocationType, { label: string; color: string; bgColor: string }> = {
  star: { label: 'ESTRELLA', color: '#FFD700', bgColor: 'rgba(255, 215, 0, 0.15)' },
  planet: { label: 'PLANETA', color: '#d4af37', bgColor: 'rgba(212, 175, 55, 0.15)' },
  moon: { label: 'LUNA', color: '#a18a8a', bgColor: 'rgba(161, 138, 138, 0.15)' },
  station: { label: 'ESTACIÓN', color: '#38bdf8', bgColor: 'rgba(56, 189, 248, 0.15)' },
  city: { label: 'CIUDAD', color: '#B39DDB', bgColor: 'rgba(179, 157, 219, 0.15)' },
  lagrange: { label: 'LAGRANGE', color: 'rgba(212, 175, 55, 0.65)', bgColor: 'rgba(212, 175, 55, 0.05)' },
  belt: { label: 'CINTURÓN', color: '#8B7355', bgColor: 'rgba(139, 115, 85, 0.15)' },
  jumppoint: { label: 'SALTO', color: '#c41e3a', bgColor: 'rgba(196, 30, 58, 0.15)' },
};

function renderTypeIcon(type: LocationType, size = 14, color?: string): React.ReactNode {
  const iconColor = color ?? TYPE_CONFIG[type].color;
  switch (type) {
    case 'star':
      return <Sun size={size} aria-hidden="true" style={{ color: iconColor, flexShrink: 0 }} />;
    case 'planet':
      return <Globe size={size} aria-hidden="true" style={{ color: iconColor, flexShrink: 0 }} />;
    case 'moon':
      return <Moon size={size} aria-hidden="true" style={{ color: iconColor, flexShrink: 0 }} />;
    case 'station':
      return <Hexagon size={size} aria-hidden="true" style={{ color: iconColor, flexShrink: 0 }} />;
    case 'city':
      return <Building2 size={size} aria-hidden="true" style={{ color: iconColor, flexShrink: 0 }} />;
    case 'lagrange':
      return <Sparkles size={size} aria-hidden="true" style={{ color: iconColor, flexShrink: 0 }} />;
    case 'belt':
      return <Orbit size={size} aria-hidden="true" style={{ color: iconColor, flexShrink: 0 }} />;
    case 'jumppoint':
      return <Compass size={size} aria-hidden="true" style={{ color: iconColor, flexShrink: 0 }} />;
  }
}

const THREAT_CONFIG: Record<ThreatLevel, { color: string; label: string }> = {
  BAJO: { color: 'var(--status-ok)', label: 'BAJO' },
  MEDIO: { color: 'var(--status-warn)', label: 'MEDIO' },
  ALTO: { color: 'var(--status-danger)', label: 'ALTO' },
  EXTREMO: { color: 'var(--accent-conclave)', label: 'EXTREMO' },
};

const VALID_FILTERS = new Set<LocationType | 'all'>([
  'all',
  'planet',
  'moon',
  'city',
  'station',
  'belt',
  'jumppoint',
]);

function svgActivateKeyDown(handler: () => void) {
  return (e: React.KeyboardEvent<SVGElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      handler();
    }
  };
}

// ─── DETAIL PANEL COMPONENT ───────────────────────────────────────────────────
const DetailPanel: React.FC<{
  selected: { planet: Planet; child?: SubLocation } | null;
  systemName: string;
  resources: Resource[];
  onClose: () => void;
}> = ({ selected, systemName, resources, onClose }) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!selected) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [selected, onClose]);

  if (!selected) return null;
  const item = selected.child ?? selected.planet;
  const itemType = selected.child ? selected.child.type : selected.planet.type;
  const typeConf = TYPE_CONFIG[itemType];
  const threat = item.threat ?? 'BAJO';
  const threatConf = THREAT_CONFIG[threat];
  const faction = selected.child?.faction ?? selected.planet.faction;
  const services = selected.child?.services ?? [];

  const notableChildren = selected.planet.children.filter((c) => c.type !== 'lagrange' && !selected.child);

  const searchBodyStr = `${systemName}: ${item.name}`;
  const matchingResources = resources.filter((r) => {
    const cleanItemName = item.name.toLowerCase().split('(')[0].trim();
    const cleanSys = systemName.toLowerCase().trim();

    return r.locationsDetail?.some((l) => {
      const lName = l.name?.toLowerCase() || '';
      const lSystem = l.system?.toLowerCase() || '';
      return lSystem.includes(cleanSys) && (lName.includes(cleanItemName) || cleanItemName.includes(lName));
    });
  });

  return (
    <AnimatePresence>
      <motion.div
        key={selected.planet.id + (selected.child?.name ?? '')}
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 30 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        role="region"
        aria-label={`Detalles de ${item.name}`}
        style={{
          position: 'relative',
          background: 'rgba(10, 3, 3, 0.97)',
          border: `1px solid ${selected.planet.color}50`,
          borderLeft: `3px solid ${selected.planet.color}`,
          borderRadius: '4px',
          padding: '1.5rem',
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          maxHeight: '80vh',
          backdropFilter: 'blur(20px)',
          boxShadow: `0 0 40px ${selected.planet.glowColor ?? 'rgba(196,30,58,0.2)'}`,
        }}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar panel de detalles"
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'none',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            borderRadius: '2px',
            width: 30,
            height: 30,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'border-color 0.2s ease, color 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--primary)';
            e.currentTarget.style.color = '#fff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
            e.currentTarget.style.color = 'var(--text-muted)';
          }}
        >
          <X size={16} aria-hidden="true" />
        </button>

        {/* Type badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: typeConf.bgColor,
            border: `1px solid ${typeConf.color}40`,
            padding: '0.25rem 0.6rem',
            borderRadius: '2px',
            marginBottom: '1rem',
          }}
        >
          {renderTypeIcon(itemType, 13, typeConf.color)}
          <span style={{ fontFamily: 'var(--cinzel-font)', fontSize: '0.6rem', letterSpacing: '3px', color: typeConf.color }}>
            {typeConf.label}
          </span>
        </div>

        {/* Name */}
        <h2
          style={{
            fontFamily: 'var(--cinzel-font)',
            color: selected.planet.color,
            fontSize: '1.3rem',
            letterSpacing: '4px',
            margin: '0 0 0.3rem',
            textShadow: `0 0 20px ${selected.planet.glowColor}`,
          }}
        >
          {item.name}
        </h2>

        {/* Planet name if sub-location */}
        {selected.child && (
          <p
            style={{
              margin: '0 0 0.8rem',
              fontSize: '0.7rem',
              color: 'var(--text-muted)',
              letterSpacing: '2px',
              fontFamily: 'var(--cinzel-font)',
            }}
          >
            ÓRBITA DE {selected.planet.name.toUpperCase()}
          </p>
        )}

        <div style={{ height: '1px', background: `linear-gradient(to right, ${selected.planet.color}60, transparent)`, margin: '0.8rem 0' }} />

        {/* Description */}
        <p className="prose-grimoire" style={{ color: 'var(--text-main)', lineHeight: 1.75, fontSize: '0.88rem', margin: '0 0 1.2rem' }}>
          {item.description}
        </p>

        {/* Metadata grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
          {faction && (
            <div style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '2px' }}>
              <p style={{ margin: 0, fontSize: '0.55rem', letterSpacing: '2px', color: 'var(--text-muted)', fontFamily: 'var(--cinzel-font)' }}>
                FACCIÓN
              </p>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: 'var(--text-main)', fontWeight: 700 }}>{faction}</p>
            </div>
          )}
          <div style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '2px' }}>
            <p style={{ margin: 0, fontSize: '0.55rem', letterSpacing: '2px', color: 'var(--text-muted)', fontFamily: 'var(--cinzel-font)' }}>
              AMENAZA
            </p>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: threatConf.color, fontWeight: 700 }}>
              <span aria-hidden="true">● </span>
              {threatConf.label}
            </p>
          </div>
        </div>

        {/* Services */}
        {services.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <p style={{ margin: '0 0 0.5rem', fontSize: '0.55rem', letterSpacing: '3px', color: 'var(--text-muted)', fontFamily: 'var(--cinzel-font)' }}>
              SERVICIOS DISPONIBLES
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
              {services.map((s) => (
                <span
                  key={s}
                  style={{
                    padding: '0.2rem 0.5rem',
                    fontSize: '0.65rem',
                    letterSpacing: '1px',
                    background: 'rgba(56, 189, 248, 0.08)',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                    borderRadius: '2px',
                    color: 'var(--accent-rsi)',
                    fontWeight: 700,
                  }}
                >
                  {s}
                </span>
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
              {notableChildren.map((c) => (
                <div
                  key={c.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.4rem 0.6rem',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '2px',
                  }}
                >
                  {renderTypeIcon(c.type, 13)}
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
              {matchingResources.map((res) => (
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
                    transition: 'background-color 0.2s ease, border-color 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(212, 175, 55, 0.15)';
                    e.currentTarget.style.borderColor = 'var(--secondary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(212, 175, 55, 0.05)';
                    e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.3)';
                  }}
                >
                  {res.name}
                </Link>
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                navigate(
                  `/codice/ofrendas?system=${encodeURIComponent(systemName)}&body=${encodeURIComponent(`${searchBodyStr} (${itemType})`)}`,
                )
              }
              style={{
                width: '100%',
                padding: '0.8rem',
                background: 'linear-gradient(90deg, rgba(212, 175, 55, 0.12), rgba(212, 175, 55, 0.05))',
                border: '1px solid rgba(212, 175, 55, 0.4)',
                color: 'var(--secondary)',
                fontFamily: 'var(--cinzel-font)',
                letterSpacing: '2px',
                fontSize: '0.75rem',
                cursor: 'pointer',
                transition: 'border-color 0.2s ease, background-color 0.2s ease',
                marginTop: '0.8rem',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--secondary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.4)';
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
}> = ({
  planets,
  selectedPlanet,
  onSelectPlanet,
  onSelectChild,
  selectedChild,
  jumpPoints,
  starColor = '#FFD54F',
  starLabel = 'STANTON',
  activeFilter = 'all',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [animAngles, setAnimAngles] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    planets.forEach((p) => {
      init[p.id] = p.orbitAngle;
    });
    return init;
  });

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragInfo = useRef({ active: false, startX: 0, startY: 0, panX: 0, panY: 0, moved: false });

  // Orbital animation — gated by prefers-reduced-motion
  useEffect(() => {
    const mediaQuery =
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;

    if (mediaQuery?.matches) {
      return;
    }

    let frame = 0;
    let active = true;

    const animate = () => {
      if (!active) return;
      setAnimAngles((prev) => {
        const next: Record<string, number> = { ...prev };
        planets.forEach((p) => {
          const base = prev[p.id] ?? p.orbitAngle;
          const speed = Math.max(0.003, 1.2 / p.orbitRadius);
          next[p.id] = (base + speed) % 360;
        });
        return next;
      });
      frame = window.requestAnimationFrame(animate);
    };

    frame = window.requestAnimationFrame(animate);

    const handleMotionChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        active = false;
        window.cancelAnimationFrame(frame);
      } else if (!active) {
        active = true;
        frame = window.requestAnimationFrame(animate);
      }
    };

    mediaQuery?.addEventListener('change', handleMotionChange);
    return () => {
      active = false;
      window.cancelAnimationFrame(frame);
      mediaQuery?.removeEventListener('change', handleMotionChange);
    };
  }, [planets]);

  // Non-passive wheel zoom centered on cursor
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      const mx = ((e.clientX - rect.left) / rect.width) * 840;
      const my = ((e.clientY - rect.top) / rect.height) * 680;
      const factor = e.deltaY < 0 ? 1.18 : 0.85;
      setZoom((z) => {
        const nz = Math.min(Math.max(z * factor, 0.35), 6);
        const ratio = nz / z;
        setPan((p) => ({
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
    const cx2 = 420;
    const cy2 = 390;
    setZoom((z) => {
      const nz = Math.min(Math.max(z * factor, 0.35), 6);
      const ratio = nz / z;
      setPan((p) => ({ x: cx2 - (cx2 - p.x) * ratio, y: cy2 - (cy2 - p.y) * ratio }));
      return nz;
    });
  };
  const handleZoomReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const cx = 420;
  const cy = 390;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg
        ref={svgRef}
        role="img"
        aria-label={`Mapa orbital interactivo del sistema ${starLabel}`}
        viewBox="0 0 840 680"
        style={{
          height: '100%',
          maxWidth: '100%',
          maxHeight: '100%',
          aspectRatio: '840 / 680',
          display: 'block',
          cursor: isDragging ? 'grabbing' : 'grab',
          touchAction: 'none',
        }}
        xmlns="http://www.w3.org/2000/svg"
        onMouseDown={handleDragStart}
        onMouseMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
      >
        <defs>
          <radialGradient id="bgGrad" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="rgba(30,5,5,0.8)" />
            <stop offset="100%" stopColor="rgba(5,1,1,0.98)" />
          </radialGradient>

          {planets.map((p) => (
            <radialGradient key={p.id} id={`grad-${p.id}`} cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor={p.color + 'ff'} />
              <stop offset="60%" stopColor={p.color + 'bb'} />
              <stop offset="100%" stopColor={p.color + '33'} />
            </radialGradient>
          ))}

          <radialGradient id="starGrad" cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#FFFDE7" />
            <stop offset="50%" stopColor={starColor} />
            <stop offset="100%" stopColor={starColor + '88'} />
          </radialGradient>

          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="starGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width="840" height="680" fill="url(#bgGrad)" style={{ cursor: isDragging ? 'grabbing' : 'grab' }} />

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

          {/* Orbit rings */}
          {planets.map((p) =>
            p.nodeType === 'belt' ? null : (
              <circle
                key={`orbit-${p.id}`}
                cx={cx}
                cy={cy}
                r={p.orbitRadius}
                fill="none"
                stroke={selectedPlanet?.id === p.id ? `${p.color}40` : 'rgba(212,175,55,0.08)'}
                strokeWidth={selectedPlanet?.id === p.id ? 1.5 : 0.8}
                strokeDasharray={selectedPlanet?.id === p.id ? '0' : '4 6'}
              />
            ),
          )}

          {/* Central Star */}
          <g filter="url(#starGlow)">
            <circle
              cx={cx}
              cy={cy}
              r={34}
              fill="url(#starGrad)"
              role="button"
              tabIndex={0}
              aria-label={`Estrella central ${starLabel}, limpiar selección`}
              onClick={() => onSelectPlanet(null)}
              onKeyDown={svgActivateKeyDown(() => onSelectPlanet(null))}
              style={{ cursor: 'pointer' }}
            />
            <circle cx={cx} cy={cy} r={38} fill="none" stroke={starColor} strokeWidth="1" opacity="0.3" />
            <circle cx={cx} cy={cy} r={44} fill="none" stroke={starColor} strokeWidth="0.5" opacity="0.15" />
            <text
              x={cx}
              y={cy + 54}
              textAnchor="middle"
              fill={starColor}
              fontSize="9"
              fontFamily="Cinzel, serif"
              letterSpacing="2"
              opacity="0.9"
            >
              {starLabel}
            </text>
          </g>

          {/* Planets & Belts */}
          {planets.map((p) => {
            const angleDeg = animAngles[p.id] ?? p.orbitAngle;
            const rad = (angleDeg * Math.PI) / 180;
            const px = cx + p.orbitRadius * Math.cos(rad);
            const py = cy + p.orbitRadius * Math.sin(rad);
            const isSelected = selectedPlanet?.id === p.id;

            if (p.nodeType === 'belt') {
              const isBeltSelected = isSelected;
              const beltStations = p.children.filter((c) => c.type === 'station');
              const beltW = isBeltSelected ? 22 : 16;
              const halfW = beltW / 2;
              const ROCKS = 72;

              const rocks = Array.from({ length: ROCKS }, (_, i) => {
                const seed = (i * 137.508 + p.orbitRadius * 1.3) % 360;
                const angle = (i / ROCKS) * Math.PI * 2 + (seed * Math.PI) / 540;
                const spread = ((seed * 7.3) % beltW) - halfW;
                const r = p.orbitRadius + spread;
                const size = 0.6 + ((seed * 3.1) % 2.2);
                const opa = 0.35 + ((seed * 5.7) % 0.5);
                return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle), size, opa };
              });

              const stCount = beltStations.length;
              const showBelt = activeFilter === 'all' || activeFilter === 'belt';
              const beltOpacity = showBelt || isBeltSelected ? 1 : 0.15;

              return (
                <g key={p.id}>
                  <g style={{ opacity: beltOpacity, transition: 'opacity 0.3s ease' }}>
                    <circle
                      cx={cx}
                      cy={cy}
                      r={p.orbitRadius}
                      fill="none"
                      stroke={`${p.color}18`}
                      strokeWidth={beltW + 8}
                      style={{ pointerEvents: 'none' }}
                    />
                    <circle
                      cx={cx}
                      cy={cy}
                      r={p.orbitRadius}
                      fill="none"
                      stroke={isBeltSelected ? `${p.color}55` : `${p.color}30`}
                      strokeWidth={beltW}
                      style={{ pointerEvents: 'none' }}
                    />
                    <circle
                      cx={cx}
                      cy={cy}
                      r={p.orbitRadius}
                      fill="none"
                      stroke={isBeltSelected ? `${p.color}99` : `${p.color}55`}
                      strokeWidth="0.8"
                      strokeDasharray="3 5"
                      style={{ pointerEvents: 'none' }}
                    />

                    {rocks.map((rock, ri) => (
                      <circle
                        key={`${p.id}-rock-${ri}`}
                        cx={rock.x}
                        cy={rock.y}
                        r={rock.size}
                        fill={p.color}
                        opacity={rock.opa}
                        style={{ pointerEvents: 'none' }}
                      />
                    ))}

                    <text
                      x={cx}
                      y={cy - p.orbitRadius - (halfW + 6)}
                      textAnchor="middle"
                      fill={isBeltSelected ? p.color : `${p.color}bb`}
                      fontSize="7"
                      fontFamily="Cinzel, serif"
                      letterSpacing="2"
                      style={{ pointerEvents: 'none' }}
                    >
                      {p.name.toUpperCase()}
                    </text>

                    <circle
                      cx={cx}
                      cy={cy}
                      r={p.orbitRadius}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={beltW + 10}
                      role="button"
                      tabIndex={0}
                      aria-label={`Seleccionar cinturón ${p.name}`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => onSelectPlanet(isBeltSelected ? null : p)}
                      onKeyDown={svgActivateKeyDown(() => onSelectPlanet(isBeltSelected ? null : p))}
                    />
                  </g>

                  {beltStations.map((station, si) => {
                    const stAngle = -Math.PI / 2 + (si / Math.max(stCount, 1)) * Math.PI * 2;
                    const sx = cx + p.orbitRadius * Math.cos(stAngle);
                    const sy = cy + p.orbitRadius * Math.sin(stAngle);
                    const isStSel = selectedChild?.name === station.name;
                    const R = 7;
                    const hex = Array.from({ length: 6 }, (_, k) => {
                      const a = (k * Math.PI) / 3 - Math.PI / 6;
                      return `${sx + R * Math.cos(a)},${sy + R * Math.sin(a)}`;
                    }).join(' ');
                    const shortLabel = station.name.replace("People's Service Station ", 'PSS-').split(' ')[0];

                    const showSt = activeFilter === 'all' || activeFilter === 'station' || activeFilter === 'belt';
                    const stOpacity = showSt || isStSel ? 1 : 0.15;

                    return (
                      <g
                        key={station.name}
                        role="button"
                        tabIndex={0}
                        aria-label={`Estación ${station.name}`}
                        style={{ cursor: 'pointer', opacity: stOpacity, transition: 'opacity 0.3s ease' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectChild(p, station);
                        }}
                        onKeyDown={svgActivateKeyDown(() => onSelectChild(p, station))}
                      >
                        {isStSel && (
                          <circle
                            cx={sx}
                            cy={sy}
                            r={R + 5}
                            fill="rgba(56,189,248,0.12)"
                            stroke="rgba(56,189,248,0.35)"
                            strokeWidth="0.8"
                            style={{ pointerEvents: 'none' }}
                          />
                        )}
                        <polygon
                          points={hex}
                          fill={isStSel ? 'rgba(56,189,248,0.4)' : 'rgba(56,189,248,0.08)'}
                          stroke="#38bdf8"
                          strokeWidth={isStSel ? 1.8 : 0.9}
                          opacity={isStSel ? 1 : 0.8}
                          style={{ pointerEvents: 'none' }}
                        />
                        <circle cx={sx} cy={sy} r={1.8} fill="#38bdf8" opacity={0.95} style={{ pointerEvents: 'none' }} />
                        <text
                          x={sx}
                          y={sy + R + 9}
                          textAnchor="middle"
                          fill={isStSel ? '#38bdf8' : 'rgba(56,189,248,0.75)'}
                          fontSize="5.5"
                          fontFamily="Cinzel, serif"
                          letterSpacing="0.3"
                          style={{ pointerEvents: 'none' }}
                        >
                          {shortLabel}
                        </text>
                        <circle cx={sx} cy={sy} r={16} fill="transparent" />
                      </g>
                    );
                  })}
                </g>
              );
            }

            const planetR = 24;
            const hitR = planetR + 16;
            const moons = p.children.filter((c) => c.type === 'moon');
            const showPlanet = activeFilter === 'all' || activeFilter === 'planet' || activeFilter === p.type;
            const pOpacity = showPlanet || isSelected ? 1 : 0.15;

            return (
              <g key={p.id} filter={isSelected ? 'url(#glow)' : undefined}>
                <g
                  role="button"
                  tabIndex={0}
                  aria-label={`Planeta ${p.name}`}
                  style={{ cursor: 'pointer', opacity: pOpacity, transition: 'opacity 0.3s ease' }}
                  onClick={() => onSelectPlanet(isSelected ? null : p)}
                  onKeyDown={svgActivateKeyDown(() => onSelectPlanet(isSelected ? null : p))}
                >
                  {isSelected && (
                    <circle
                      cx={px}
                      cy={py}
                      r={planetR + 8}
                      fill="none"
                      stroke={p.color}
                      strokeWidth="1.5"
                      opacity="0.7"
                      style={{ pointerEvents: 'none' }}
                    />
                  )}
                  <circle
                    cx={px}
                    cy={py}
                    r={planetR}
                    fill={`url(#grad-${p.id})`}
                    stroke={isSelected ? p.color : 'rgba(255,255,255,0.12)'}
                    strokeWidth={isSelected ? 2 : 1}
                    style={{ pointerEvents: 'none' }}
                  />
                  <ellipse
                    cx={px + planetR * 0.25}
                    cy={py - planetR * 0.2}
                    rx={planetR * 0.5}
                    ry={planetR * 0.35}
                    fill="rgba(255,255,255,0.06)"
                    style={{ pointerEvents: 'none' }}
                  />
                  <ellipse
                    cx={px + planetR * 0.1}
                    cy={py + planetR * 0.4}
                    rx={planetR * 0.65}
                    ry={planetR * 0.2}
                    fill="rgba(0,0,0,0.25)"
                    style={{ pointerEvents: 'none' }}
                  />
                  <text
                    x={px}
                    y={py + planetR + 15}
                    textAnchor="middle"
                    fill={isSelected ? p.color : 'rgba(255,255,255,0.65)'}
                    fontSize="8"
                    fontFamily="Cinzel, serif"
                    letterSpacing="1.5"
                    style={{ pointerEvents: 'none' }}
                  >
                    {p.name.toUpperCase()}
                  </text>
                  <circle cx={px} cy={py} r={hitR} fill="transparent" />
                </g>

                {!isSelected &&
                  moons.map((moon, mi) => {
                    const showMoon = activeFilter === 'all' || activeFilter === 'moon' || activeFilter === 'planet';
                    const mRad = rad + (mi + 1) * ((Math.PI * 2) / (moons.length + 1));
                    const moonOr = 42;
                    const mx2 = px + moonOr * Math.cos(mRad);
                    const my2 = py + moonOr * Math.sin(mRad);
                    return (
                      <circle
                        key={moon.name}
                        cx={mx2}
                        cy={my2}
                        r={4}
                        fill="rgba(161,138,138,0.35)"
                        stroke="rgba(161,138,138,0.5)"
                        strokeWidth="0.5"
                        style={{ opacity: showMoon ? 1 : 0.1, transition: 'opacity 0.3s ease', pointerEvents: 'none' }}
                      />
                    );
                  })}

                {isSelected &&
                  p.children
                    .filter((c) => c.type !== 'lagrange')
                    .map((child, ci, arr) => {
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
                        <g
                          key={child.name}
                          role="button"
                          tabIndex={0}
                          aria-label={`${tc.label} ${child.name}`}
                          style={{ cursor: 'pointer', opacity: childOpacity, transition: 'opacity 0.3s ease' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectChild(p, child);
                          }}
                          onKeyDown={svgActivateKeyDown(() => onSelectChild(p, child))}
                        >
                          <line
                            x1={px}
                            y1={py}
                            x2={cxCoord}
                            y2={cyCoord}
                            stroke={tc.color}
                            strokeWidth="0.5"
                            opacity="0.25"
                            strokeDasharray="2 3"
                            style={{ pointerEvents: 'none' }}
                          />
                          {child.type === 'station' ? (
                            <polygon
                              points={`${cxCoord},${cyCoord - cR * 1.5} ${cxCoord + cR * 1.3},${cyCoord + cR * 0.8} ${cxCoord - cR * 1.3},${cyCoord + cR * 0.8}`}
                              fill={tc.color}
                              stroke={isChildSelected ? '#fff' : 'none'}
                              strokeWidth="1.5"
                              opacity={isChildSelected ? 1 : 0.8}
                              style={{ pointerEvents: 'none' }}
                            />
                          ) : child.type === 'city' ? (
                            <polygon
                              points={Array.from({ length: 5 }, (_, k) => {
                                const a = (k * Math.PI * 2) / 5 - Math.PI / 2;
                                return `${cxCoord + cR * 1.3 * Math.cos(a)},${cyCoord + cR * 1.3 * Math.sin(a)}`;
                              }).join(' ')}
                              fill={tc.color}
                              stroke={isChildSelected ? '#fff' : 'none'}
                              strokeWidth="1.5"
                              opacity={isChildSelected ? 1 : 0.8}
                              style={{ pointerEvents: 'none' }}
                            />
                          ) : child.type === 'belt' ? (
                            <circle
                              cx={cxCoord}
                              cy={cyCoord}
                              r={cR}
                              fill="none"
                              stroke={tc.color}
                              strokeWidth="2.5"
                              strokeDasharray="2 2"
                              opacity="0.7"
                              style={{ pointerEvents: 'none' }}
                            />
                          ) : (
                            <circle
                              cx={cxCoord}
                              cy={cyCoord}
                              r={cR}
                              fill={isChildSelected ? tc.color : tc.bgColor}
                              stroke={isChildSelected ? '#fff' : tc.color}
                              strokeWidth={isChildSelected ? 2 : 1.2}
                              opacity={isChildSelected ? 1 : 0.85}
                              style={{ pointerEvents: 'none' }}
                            />
                          )}
                          <text
                            x={cxCoord}
                            y={cyCoord + cR + 11}
                            textAnchor="middle"
                            fill={isChildSelected ? '#fff' : 'rgba(255,255,255,0.6)'}
                            fontSize="6.5"
                            fontFamily="Cinzel, serif"
                            letterSpacing="0.5"
                            style={{ pointerEvents: 'none' }}
                          >
                            {child.name.replace('Lagrange ', 'L')}
                          </text>
                          <circle cx={cxCoord} cy={cyCoord} r={hitChild} fill="transparent" />
                        </g>
                      );
                    })}
              </g>
            );
          })}

          {/* Permanent station & city icons */}
          {planets.map((p) => {
            const angleDeg = animAngles[p.id] ?? p.orbitAngle;
            const rad = (angleDeg * Math.PI) / 180;
            const px = cx + p.orbitRadius * Math.cos(rad);
            const py = cy + p.orbitRadius * Math.sin(rad);
            const stations = p.children.filter(
              (c) => (c.type === 'station' || c.type === 'city') && !c.name.startsWith('Lagrange'),
            );
            const isParentSelected = selectedPlanet?.id === p.id;

            if (p.nodeType === 'belt' || (isParentSelected && p.nodeType === 'planet') || stations.length === 0) {
              return null;
            }

            return stations.map((station, si) => {
              const isCity = station.type === 'city';
              const ringR = isCity ? 28 : 44;
              const sAngle = rad + si * ((Math.PI * 2) / Math.max(stations.length, 1)) + Math.PI * 0.3;
              const sx = px + ringR * Math.cos(sAngle);
              const sy = py + ringR * Math.sin(sAngle);
              const isSelected = selectedChild?.name === station.name;
              const showSt = activeFilter === 'all' || activeFilter === station.type || activeFilter === 'planet';
              const stOpacity = showSt || isSelected ? 1 : 0.15;
              const R = isCity ? 6 : 7;
              const points = Array.from({ length: isCity ? 5 : 6 }, (_, k) => {
                const a = (k * Math.PI * 2) / (isCity ? 5 : 6) + (isCity ? -Math.PI / 2 : -Math.PI / 6);
                return `${sx + R * Math.cos(a)},${sy + R * Math.sin(a)}`;
              }).join(' ');

              return (
                <g
                  key={station.name}
                  role="button"
                  tabIndex={0}
                  aria-label={`${isCity ? 'Ciudad' : 'Estación'} ${station.name}`}
                  style={{ cursor: 'pointer', opacity: stOpacity, transition: 'opacity 0.3s ease' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectChild(p, station);
                  }}
                  onKeyDown={svgActivateKeyDown(() => onSelectChild(p, station))}
                >
                  <line
                    x1={px}
                    y1={py}
                    x2={sx}
                    y2={sy}
                    stroke={isCity ? '#B39DDB' : '#38bdf8'}
                    strokeWidth="0.4"
                    opacity="0.2"
                    strokeDasharray="2 3"
                    style={{ pointerEvents: 'none' }}
                  />
                  <polygon
                    points={points}
                    fill={
                      isSelected
                        ? isCity
                          ? 'rgba(179,157,219,0.4)'
                          : 'rgba(56,189,248,0.4)'
                        : isCity
                          ? 'rgba(179,157,219,0.1)'
                          : 'rgba(56,189,248,0.1)'
                    }
                    stroke={isCity ? '#B39DDB' : '#38bdf8'}
                    strokeWidth={isSelected ? 1.5 : 0.8}
                    opacity={isSelected ? 1 : 0.75}
                    style={{ pointerEvents: 'none' }}
                  />
                  <circle
                    cx={sx}
                    cy={sy}
                    r={1.5}
                    fill={isCity ? '#B39DDB' : '#38bdf8'}
                    opacity="0.9"
                    style={{ pointerEvents: 'none' }}
                  />
                  <text
                    x={sx}
                    y={sy + R + 9}
                    textAnchor="middle"
                    fill={
                      isSelected
                        ? isCity
                          ? '#B39DDB'
                          : '#38bdf8'
                        : isCity
                          ? 'rgba(179,157,219,0.7)'
                          : 'rgba(56,189,248,0.7)'
                    }
                    fontSize="5.5"
                    fontFamily="Cinzel, serif"
                    letterSpacing="0.3"
                    style={{ pointerEvents: 'none' }}
                  >
                    {station.name.split(' ')[0].toUpperCase()}
                  </text>
                  <circle cx={sx} cy={sy} r={14} fill="transparent" />
                </g>
              );
            });
          })}

          {/* Jump points on outer edge */}
          {jumpPoints.map((jp, i) => {
            const jRad = (i / Math.max(jumpPoints.length, 1)) * Math.PI * 2 - Math.PI * 0.3;
            const jR = 650;
            const jx = Math.min(Math.max(cx + jR * 0.5 * Math.cos(jRad), 30), 810);
            const jy = Math.min(Math.max(cy + jR * 0.5 * Math.sin(jRad), 20), 660);
            const showJP = activeFilter === 'all' || activeFilter === 'jumppoint';

            return (
              <g key={jp.name} style={{ cursor: 'default', opacity: showJP ? 1 : 0.15, transition: 'opacity 0.3s ease' }}>
                <polygon
                  points={`${jx},${jy - 11} ${jx + 10},${jy - 5} ${jx + 10},${jy + 5} ${jx},${jy + 11} ${jx - 10},${jy + 5} ${jx - 10},${jy - 5}`}
                  fill="rgba(196, 30, 58, 0.12)"
                  stroke="#c41e3a"
                  strokeWidth="1.2"
                  opacity="0.9"
                  style={{ pointerEvents: 'none' }}
                />
                <circle cx={jx} cy={jy} r={2.2} fill="#c41e3a" opacity="0.9" style={{ pointerEvents: 'none' }} />
                <text
                  x={jx}
                  y={jy + 21}
                  textAnchor="middle"
                  fill="rgba(196,30,58,0.8)"
                  fontSize="6"
                  fontFamily="Cinzel, serif"
                  letterSpacing="0.5"
                  style={{ pointerEvents: 'none' }}
                >
                  {jp.name.replace('Punto de Salto → ', '→ ')}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* ── ZOOM CONTROLS OVERLAY ── */}
      <div
        style={{
          position: 'absolute',
          bottom: '1rem',
          right: '1rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.25rem',
          zIndex: 15,
          userSelect: 'none',
        }}
      >
        <div
          className="tabular-nums"
          style={{
            padding: '0.2rem 0.5rem',
            background: 'rgba(5,1,1,0.9)',
            border: '1px solid rgba(212,175,55,0.3)',
            borderRadius: '2px',
            backdropFilter: 'blur(8px)',
            fontFamily: 'Cinzel, serif',
            fontSize: '0.55rem',
            letterSpacing: '2px',
            color: 'rgba(212,175,55,0.85)',
            textAlign: 'center',
            minWidth: '44px',
          }}
        >
          {Math.round(zoom * 100)}%
        </div>

        <button
          type="button"
          onClick={() => handleZoomBtn(1.25)}
          aria-label="Acercar mapa"
          title="Acercar"
          style={{
            width: 30,
            height: 30,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(5,1,1,0.9)',
            border: '1px solid rgba(212,175,55,0.3)',
            borderRadius: '2px',
            cursor: 'pointer',
            color: 'rgba(212,175,55,0.85)',
            backdropFilter: 'blur(8px)',
            transition: 'border-color 0.15s ease, color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--secondary)';
            e.currentTarget.style.color = 'var(--secondary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(212,175,55,0.3)';
            e.currentTarget.style.color = 'rgba(212,175,55,0.85)';
          }}
        >
          <Plus size={14} aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={() => handleZoomBtn(0.8)}
          aria-label="Alejar mapa"
          title="Alejar"
          style={{
            width: 30,
            height: 30,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(5,1,1,0.9)',
            border: '1px solid rgba(212,175,55,0.3)',
            borderRadius: '2px',
            cursor: 'pointer',
            color: 'rgba(212,175,55,0.85)',
            backdropFilter: 'blur(8px)',
            transition: 'border-color 0.15s ease, color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--secondary)';
            e.currentTarget.style.color = 'var(--secondary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(212,175,55,0.3)';
            e.currentTarget.style.color = 'rgba(212,175,55,0.85)';
          }}
        >
          <Minus size={14} aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={handleZoomReset}
          aria-label="Restablecer vista del mapa"
          title="Restablecer vista"
          style={{
            width: 30,
            height: 30,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(196,30,58,0.12)',
            border: '1px solid rgba(196,30,58,0.35)',
            borderRadius: '2px',
            cursor: 'pointer',
            color: 'rgba(196,30,58,0.9)',
            backdropFilter: 'blur(8px)',
            transition: 'border-color 0.15s ease, color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#c41e3a';
            e.currentTarget.style.color = '#c41e3a';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(196,30,58,0.35)';
            e.currentTarget.style.color = 'rgba(196,30,58,0.9)';
          }}
        >
          <RotateCcw size={13} aria-hidden="true" />
        </button>
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
      {planets.map((planet) => {
        const visibleChildren = planet.children.filter((c) => activeFilter === 'all' || c.type === activeFilter);
        const showPlanet = activeFilter === 'all' || activeFilter === 'planet' || activeFilter === planet.type;

        if (!showPlanet && visibleChildren.length === 0) return null;

        const isPlanetActive = selectedPlanet?.id === planet.id && !selectedChild;

        return (
          <div key={planet.id}>
            {showPlanet && (
              <motion.button
                type="button"
                aria-pressed={isPlanetActive}
                onClick={() => onSelect(planet)}
                whileHover={{ x: 4 }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '0.8rem 1rem',
                  cursor: 'pointer',
                  background: isPlanetActive ? `${planet.color}18` : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isPlanetActive ? `${planet.color}60` : 'rgba(255,255,255,0.07)'}`,
                  borderLeft: `3px solid ${planet.color}`,
                  borderRadius: '3px',
                  marginBottom: '0.4rem',
                  transition: 'background-color 0.2s ease, border-color 0.2s ease',
                }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    flexShrink: 0,
                    background: `radial-gradient(circle at 35% 30%, ${planet.color}ff, ${planet.color}44)`,
                    boxShadow: `0 0 12px ${planet.glowColor}`,
                    border: `1.5px solid ${planet.color}60`,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontFamily: 'var(--cinzel-font)', fontSize: '0.85rem', letterSpacing: '3px', color: planet.color }}>
                    {planet.name}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '1px' }}>
                    {planet.faction}
                  </p>
                </div>
                <div
                  style={{
                    fontSize: '0.55rem',
                    letterSpacing: '2px',
                    padding: '0.15rem 0.4rem',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: THREAT_CONFIG[planet.threat].color,
                    fontFamily: 'var(--cinzel-font)',
                    borderRadius: '2px',
                  }}
                >
                  <span aria-hidden="true">● </span>
                  {planet.threat}
                </div>
              </motion.button>
            )}

            <div style={{ paddingLeft: '2rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {visibleChildren.map((child) => {
                const tc = TYPE_CONFIG[child.type];
                const isSelected = selectedChild?.name === child.name && selectedPlanet?.id === planet.id;
                return (
                  <motion.button
                    key={child.name}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => onSelect(planet, child)}
                    whileHover={{ x: 4 }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.7rem',
                      padding: '0.5rem 0.8rem',
                      cursor: 'pointer',
                      background: isSelected ? `${tc.color}15` : 'transparent',
                      border: `1px solid ${isSelected ? `${tc.color}50` : 'rgba(255,255,255,0.04)'}`,
                      borderLeft: `2px solid ${tc.color}60`,
                      borderRadius: '2px',
                      transition: 'background-color 0.2s ease, border-color 0.2s ease',
                    }}
                  >
                    <span style={{ width: 16, display: 'inline-flex', justifyContent: 'center' }}>
                      {renderTypeIcon(child.type, 13)}
                    </span>
                    <span style={{ flex: 1, fontSize: '0.78rem', color: isSelected ? 'var(--text-main)' : 'var(--text-muted)' }}>
                      {child.name}
                    </span>
                    <span style={{ fontSize: '0.55rem', letterSpacing: '2px', color: tc.color, fontFamily: 'var(--cinzel-font)' }}>
                      {tc.label}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        );
      })}

      {(activeFilter === 'all' || activeFilter === 'jumppoint') && (
        <div>
          <p style={{ margin: '0 0 0.4rem', fontSize: '0.6rem', letterSpacing: '3px', color: 'var(--text-muted)', fontFamily: 'var(--cinzel-font)' }}>
            ── PUNTOS DE SALTO ──
          </p>
          {jumpPoints.map((jp) => (
            <div
              key={jp.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.7rem',
                padding: '0.5rem 0.8rem',
                cursor: 'default',
                border: '1px solid rgba(196,30,58,0.15)',
                borderLeft: '2px solid rgba(196,30,58,0.5)',
                borderRadius: '2px',
                marginBottom: '0.25rem',
              }}
            >
              <Compass size={13} aria-hidden="true" style={{ color: 'var(--primary)' }} />
              <span style={{ flex: 1, fontSize: '0.78rem', color: 'var(--text-muted)' }}>{jp.name}</span>
              <span style={{ fontSize: '0.55rem', letterSpacing: '2px', color: 'var(--primary)', fontFamily: 'var(--cinzel-font)' }}>
                SALTO
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── MAIN PAGE COMPONENT ───────────────────────────────────────────────────────
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
  const [searchParams, setSearchParams] = useSearchParams();
  const searchInputId = useId();
  const [resources, setResources] = useState<Resource[]>([]);
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < 640;
  const isTablet = windowWidth < 1024;
  const numberFormatter = useMemo(() => new Intl.NumberFormat('es-ES'), []);

  const rawSystem = (searchParams.get('system') || 'STANTON').toUpperCase();
  const activeSistema = useMemo(
    () => SISTEMAS.find((s) => s.id === rawSystem) ?? SISTEMAS[0],
    [rawSystem],
  );
  const selectedSystem = activeSistema.id;
  const viewMode = searchParams.get('view') === 'grid' ? 'grid' : 'orbital';
  const rawFilter = searchParams.get('filter') as LocationType | 'all' | null;
  const activeFilter: LocationType | 'all' = rawFilter && VALID_FILTERS.has(rawFilter) ? rawFilter : 'all';
  const searchQuery = searchParams.get('search') ?? '';
  const planetParam = searchParams.get('planet');
  const locParam = searchParams.get('loc');

  const allPlanets = useMemo(() => getPlanetsForSystem(selectedSystem), [selectedSystem]);
  const activeJumpPoints = useMemo(() => getJumpPointsForSystem(selectedSystem), [selectedSystem]);

  const selectedPlanet = useMemo(
    () => (planetParam ? allPlanets.find((p) => p.id === planetParam) ?? null : null),
    [allPlanets, planetParam],
  );
  const selectedChild = useMemo(
    () => (selectedPlanet && locParam ? selectedPlanet.children.find((c) => c.name === locParam) ?? null : null),
    [selectedPlanet, locParam],
  );

  useEffect(() => {
    getResources()
      .then((data) => setResources(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    document.title = `Nexo Estelar · ${activeSistema.nombre} | Star Grimoire`;
  }, [activeSistema.nombre]);

  const updateParams = useCallback(
    (updates: Record<string, string | null>, replace = false) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(updates)) {
            if (value === null || value === '') {
              next.delete(key);
            } else {
              next.set(key, value);
            }
          }
          return next;
        },
        { replace },
      );
    },
    [setSearchParams],
  );

  const handleSelectPlanet = useCallback(
    (p: Planet | null) => {
      updateParams({ planet: p ? p.id : null, loc: null });
    },
    [updateParams],
  );

  const handleSelectChild = useCallback(
    (p: Planet, c: SubLocation) => {
      updateParams({ planet: p.id, loc: c.name });
    },
    [updateParams],
  );

  const handleClose = useCallback(() => {
    updateParams({ planet: null, loc: null });
  }, [updateParams]);

  const handleGridSelect = useCallback(
    (p: Planet, c?: SubLocation) => {
      if (c) {
        handleSelectChild(p, c);
      } else {
        const alreadyOpen = selectedPlanet?.id === p.id && !selectedChild;
        updateParams({ planet: alreadyOpen ? null : p.id, loc: null });
      }
    },
    [handleSelectChild, selectedChild, selectedPlanet?.id, updateParams],
  );

  const handleSelectSystem = useCallback(
    (sysId: string) => {
      updateParams({ system: sysId, planet: null, loc: null });
    },
    [updateParams],
  );

  const filteredPlanets = useMemo(() => {
    if (!searchQuery) return allPlanets;
    const q = searchQuery.toLowerCase();
    return allPlanets.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.children.some((c) => c.name.toLowerCase().includes(q)) ||
        p.faction.toLowerCase().includes(q),
    );
  }, [allPlanets, searchQuery]);

  const systemStats = useMemo(() => {
    const planetCount = allPlanets.filter((p) => p.nodeType === 'planet').length;
    const beltCount = allPlanets.filter((p) => p.nodeType === 'belt').length;
    const moonCount = allPlanets.reduce(
      (acc, p) => acc + p.children.filter((c) => c.type === 'moon').length,
      0,
    );
    const stationCount = allPlanets.reduce(
      (acc, p) => acc + p.children.filter((c) => c.type === 'station').length,
      0,
    );
    return [
      { label: 'PLANETAS', value: planetCount, type: 'planet' as LocationType, color: 'var(--secondary)' },
      { label: 'LUNAS', value: moonCount, type: 'moon' as LocationType, color: 'var(--text-muted)' },
      { label: 'ESTACIONES', value: stationCount, type: 'station' as LocationType, color: 'var(--accent-rsi)' },
      { label: 'PUNTOS DE SALTO', value: activeJumpPoints.length, type: 'jumppoint' as LocationType, color: 'var(--primary)' },
      { label: 'CINTURONES', value: beltCount, type: 'belt' as LocationType, color: '#8B7355' },
    ];
  }, [allPlanets, activeJumpPoints]);

  const FILTERS: { id: LocationType | 'all'; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'TODOS', icon: <Radar size={13} aria-hidden="true" /> },
    { id: 'planet', label: 'PLANETAS', icon: <Globe size={13} aria-hidden="true" /> },
    { id: 'moon', label: 'LUNAS', icon: <Moon size={13} aria-hidden="true" /> },
    { id: 'city', label: 'CIUDADES', icon: <Building2 size={13} aria-hidden="true" /> },
    { id: 'station', label: 'ESTACIONES', icon: <Hexagon size={13} aria-hidden="true" /> },
    { id: 'belt', label: 'CINTURONES', icon: <Orbit size={13} aria-hidden="true" /> },
    { id: 'jumppoint', label: 'SALTOS', icon: <Compass size={13} aria-hidden="true" /> },
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
        <p style={{ fontFamily: 'var(--cinzel-font)', fontSize: '0.65rem', letterSpacing: '6px', color: 'var(--text-muted)', margin: '0 0 0.5rem' }}>
          <span aria-hidden="true">☩ </span>CARTOGRAFÍA DEL VACÍO<span aria-hidden="true"> ☩</span>
        </p>
        <h1 style={{ margin: '0 0 0.65rem' }}>
          <DualLabel
            sacred={TERMINOLOGY.nexo.sacred}
            tactical={TERMINOLOGY.nexo.tactical}
            size="lg"
            align="center"
            sacredColor="var(--secondary)"
          />
        </h1>
        <h2 className="sr-only">
          Cartografía y Regiones Estelares de {activeSistema.nombre}
        </h2>
        <p
          className="prose-grimoire"
          style={{
            color: 'var(--text-muted)',
            fontSize: isMobile ? '0.8rem' : '0.9rem',
            letterSpacing: '0.5px',
            margin: '0 auto',
          }}
        >
          {isMobile ? activeSistema.nombre : activeSistema.descripcion}
        </p>
        {!isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginTop: '1rem', opacity: 0.5 }}>
            <div style={{ width: '60px', height: '1px', background: 'linear-gradient(to right, transparent, var(--secondary))' }} />
            <span translate="no" style={{ color: 'var(--secondary)', fontFamily: 'var(--cinzel-font)', fontSize: '0.6rem', letterSpacing: '4px' }}>
              IN NOMINI OBLIVIONIS
            </span>
            <div style={{ width: '60px', height: '1px', background: 'linear-gradient(to left, transparent, var(--secondary))' }} />
          </div>
        )}

        {/* ── SYSTEM SELECTOR ── */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem', marginTop: '1.2rem', flexWrap: 'wrap' }}>
          {SISTEMAS.map((sys) => (
            <button
              key={sys.id}
              type="button"
              aria-pressed={selectedSystem === sys.id}
              onClick={() => handleSelectSystem(sys.id)}
              style={{
                padding: isMobile ? '0.35rem 0.7rem' : '0.45rem 1rem',
                fontFamily: 'var(--cinzel-font)',
                fontSize: isMobile ? '0.6rem' : '0.7rem',
                letterSpacing: '2px',
                border: `1px solid ${selectedSystem === sys.id ? 'var(--secondary)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: '2px',
                background: selectedSystem === sys.id ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.02)',
                color: selectedSystem === sys.id ? 'var(--secondary)' : 'var(--text-muted)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                transition: 'border-color 0.2s ease, background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease',
                boxShadow: selectedSystem === sys.id ? '0 0 12px rgba(212,175,55,0.2)' : 'none',
              }}
            >
              <Hexagon size={12} aria-hidden="true" style={{ opacity: 0.8 }} />
              <span>{sys.nombre.toUpperCase()}</span>
              <span style={{ marginLeft: '0.2rem', fontSize: '0.55rem', opacity: 0.7, letterSpacing: '1px' }}>
                {sys.afiliacion.split('/')[0].trim().toUpperCase()}
              </span>
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
        <div style={{ position: 'relative', flex: isMobile ? '1 1 100%' : '1 1 200px', maxWidth: isMobile ? '100%' : 280 }}>
          <label htmlFor={searchInputId} className="sr-only">
            Buscar ubicación en el sistema
          </label>
          <Search
            size={15}
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: '0.8rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              pointerEvents: 'none',
            }}
          />
          <input
            id={searchInputId}
            name="starmap-search"
            type="text"
            autoComplete="off"
            placeholder="Buscar ubicación…"
            value={searchQuery}
            onChange={(e) => updateParams({ search: e.target.value || null }, true)}
            className="search-input"
            style={{ paddingLeft: '2.2rem', width: '100%', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', flex: '1 1 auto' }}>
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={activeFilter === f.id}
              aria-label={f.label}
              className={`filter-btn ${activeFilter === f.id ? 'active' : ''}`}
              onClick={() => updateParams({ filter: f.id === 'all' ? null : f.id })}
              title={f.label}
              style={{
                padding: isMobile ? '0.45rem 0.55rem' : undefined,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              {f.icon}
              {!isMobile && <span>{f.label}</span>}
            </button>
          ))}
        </div>

        {/* View toggle */}
        <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: '3px', overflow: 'hidden', flexShrink: 0 }}>
          <button
            type="button"
            aria-pressed={viewMode === 'orbital'}
            aria-label="Vista orbital"
            onClick={() => updateParams({ view: null })}
            style={{
              padding: '0.45rem 0.75rem',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.7rem',
              fontFamily: 'var(--cinzel-font)',
              letterSpacing: '1px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              transition: 'background-color 0.2s ease, color 0.2s ease',
              background: viewMode === 'orbital' ? 'var(--primary)' : 'rgba(255,255,255,0.03)',
              color: viewMode === 'orbital' ? '#fff' : 'var(--text-muted)',
            }}
          >
            <Radar size={14} aria-hidden="true" />
            {!isMobile && <span>ORBITAL</span>}
          </button>
          <button
            type="button"
            aria-pressed={viewMode === 'grid'}
            aria-label="Vista de lista"
            onClick={() => updateParams({ view: 'grid' })}
            style={{
              padding: '0.45rem 0.75rem',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.7rem',
              fontFamily: 'var(--cinzel-font)',
              letterSpacing: '1px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              transition: 'background-color 0.2s ease, color 0.2s ease',
              background: viewMode === 'grid' ? 'var(--primary)' : 'rgba(255,255,255,0.03)',
              color: viewMode === 'grid' ? '#fff' : 'var(--text-muted)',
              borderLeft: '1px solid var(--border)',
            }}
          >
            <LayoutList size={14} aria-hidden="true" />
            {!isMobile && <span>LISTA</span>}
          </button>
        </div>
      </motion.div>

      {/* ── MAIN LAYOUT ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        style={{
          display: viewMode === 'grid' && !isMobile ? 'grid' : 'block',
          gridTemplateColumns: selectedPlanet && viewMode === 'grid' && !isMobile ? '1fr 320px' : '1fr',
          gap: '1rem',
          alignItems: 'start',
        }}
      >
        <div
          className="surface-monolith"
          style={{
            padding: viewMode === 'orbital' ? '0' : '1rem',
            overflow: 'hidden',
            aspectRatio: viewMode === 'orbital' && !isMobile ? '16/10' : undefined,
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
              {!isMobile && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '1rem',
                    left: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.3rem',
                    background: 'rgba(5,1,1,0.85)',
                    padding: '0.6rem 0.8rem',
                    border: '1px solid rgba(212,175,55,0.15)',
                    borderRadius: '3px',
                    backdropFilter: 'blur(8px)',
                    zIndex: 2,
                  }}
                >
                  {(Object.entries(TYPE_CONFIG) as [LocationType, { label: string; color: string }][])
                    .filter(([k]) => k !== 'lagrange')
                    .map(([key, conf]) => (
                      <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <span style={{ width: 14, display: 'inline-flex', justifyContent: 'center' }}>
                          {renderTypeIcon(key, 11, conf.color)}
                        </span>
                        <span style={{ fontSize: '0.55rem', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.55)', fontFamily: 'Cinzel, serif' }}>
                          {conf.label}
                        </span>
                      </div>
                    ))}
                </div>
              )}
              {!selectedPlanet && (
                <div
                  style={{
                    position: 'absolute',
                    top: '0.6rem',
                    right: '0.6rem',
                    background: 'rgba(5,1,1,0.7)',
                    padding: '0.3rem 0.6rem',
                    border: '1px solid rgba(212,175,55,0.2)',
                    borderRadius: '2px',
                    backdropFilter: 'blur(8px)',
                    zIndex: 2,
                  }}
                >
                  <p style={{ margin: 0, fontSize: isMobile ? '0.55rem' : '0.6rem', color: 'var(--text-muted)', fontFamily: 'var(--cinzel-font)', letterSpacing: '1px' }}>
                    {isMobile ? 'TAP PLANETA' : '← SELECCIONA UN PLANETA'}
                  </p>
                </div>
              )}
              {selectedPlanet && !isMobile && (
                <div
                  style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    width: isTablet ? '260px' : '300px',
                    maxHeight: 'calc(100% - 2rem)',
                    zIndex: 10,
                    overflowY: 'auto',
                  }}
                >
                  <DetailPanel
                    systemName={activeSistema.nombre}
                    resources={resources}
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

        {/* Desktop/Tablet Grid side panel */}
        {selectedPlanet && viewMode === 'grid' && !isMobile && (
          <DetailPanel
            systemName={activeSistema.nombre}
            resources={resources}
            selected={selectedChild ? { planet: selectedPlanet, child: selectedChild } : { planet: selectedPlanet }}
            onClose={handleClose}
          />
        )}

        {/* Mobile bottom detail panel (orbital & grid) */}
        {selectedPlanet && isMobile && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            style={{ marginTop: '0.8rem' }}
          >
            <DetailPanel
              systemName={activeSistema.nombre}
              resources={resources}
              selected={selectedChild ? { planet: selectedPlanet, child: selectedChild } : { planet: selectedPlanet }}
              onClose={handleClose}
            />
          </motion.div>
        )}
      </motion.div>

      {/* ── STATS BAR (Dynamic per selected system) ── */}
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
        {systemStats.map((stat) => (
          <div
            key={stat.label}
            style={{
              padding: '0.8rem',
              textAlign: 'center',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '3px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.35rem' }}>
              {renderTypeIcon(stat.type, 18, stat.color)}
            </div>
            <p
              className="tabular-nums"
              style={{
                margin: '0 0 0.1rem',
                fontFamily: 'var(--cinzel-font)',
                fontSize: '1.1rem',
                color: stat.color,
                fontWeight: 700,
              }}
            >
              {numberFormatter.format(stat.value)}
            </p>
            <p style={{ margin: 0, fontSize: '0.55rem', letterSpacing: '2px', color: 'var(--text-muted)', fontFamily: 'var(--cinzel-font)' }}>
              {stat.label}
            </p>
          </div>
        ))}
      </motion.div>
    </div>
  );
};

export default StarMap;

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { Activity, History, Map as MapIcon, Timer, Play, Pause, RotateCcw, AlertTriangle, Plus, Minus } from 'lucide-react';
import { TERMINOLOGY } from '../constants/terminology';
import DualLabel from '../components/DualLabel';
import { toAbyssalYear } from '../utils/abyssalDate';

type BovedasTab = 'horario' | 'timers' | 'mapas';

interface VaultSettings {
  initialOpenTime: Date;
  openDurationMs: number;
  closeDurationMs: number;
  cycleNumberOffset: number;
}

const DEFAULT_SETTINGS: VaultSettings = {
  initialOpenTime: new Date('2026-07-01T09:42:31.076-04:00'),
  openDurationMs: 3900094,
  closeDurationMs: 7200172,
  cycleNumberOffset: 36,
};

const TIMER_CATEGORIES = [
  {
    id: 'checkmate',
    title: 'Checkmate',
    groups: [
      { title: 'Blue Keycards (15m)', minutes: 15, timers: ['Terminal 1', 'Terminal 2', 'Terminal 3'] },
      { title: 'Comboards (30m)', minutes: 30, timers: ['Tablet 1', 'Tablet 2', 'Tablet 3'] },
    ],
  },
  {
    id: 'orbituary',
    title: 'Orbituary',
    groups: [
      { title: 'Blue Keycards (15m)', minutes: 15, timers: ['Terminal 1', 'Terminal 2'] },
      { title: 'Comboards (30m)', minutes: 30, timers: ['Tablet 4', 'Tablet 7'] },
    ],
  },
  {
    id: 'ruin',
    title: 'Ruin Station',
    groups: [
      { title: 'Keycards (15m)', minutes: 15, timers: ['The Crypt', 'The Last Resort', 'The Wasteland'] },
      { title: 'Comboards (30m)', minutes: 30, timers: ['Tablet 5', 'Tablet 6'] },
    ],
  },
  {
    id: 'pyam',
    title: 'Sector de Supervisor (PYAM)',
    groups: [
      { title: 'Red Keycards (30m)', minutes: 30, timers: ['Terminal 3-4', 'Terminal 3-5'] },
    ],
  },
];

const MAPS_DATA = [
  { id: 'checkmate', src: '/assets/maps/Checkmate Map.webp', title: 'Checkmate', desc: 'Rutas de tarjetas electromagnéticas y consolas C-Board por el hangar y ala de seguridad.' },
  { id: 'orbituary', src: '/assets/maps/Orbituary Map.webp', title: 'Orbituary', desc: 'Estaciones de tabletas C-Board en entresuelo y túneles de acceso auxiliares.' },
  { id: 'ruin', src: '/assets/maps/Ruin Map.webp', title: 'Ruin Station', desc: 'Rutas hacia The Crypt, Last Resort y Wasteland.' },
  { id: 'pyam-exhang', src: '/assets/maps/Executive Hangar Map.webp', title: 'PYAM-EXHANG-0-1', desc: 'Checkpoints de vestíbulo y mostradores ejecutivos.' },
  { id: 'pyam-sup', src: '/assets/maps/Supervisor Map.webp', title: 'PYAM-SUPVISR-3-4/5', desc: 'Sector de tarjeta roja y oficina de seguridad principal.' },
];

const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'] as const;

function formatAbyssalUtc(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = MONTHS_ES[date.getUTCMonth()] ?? 'Ene';
  const year = toAbyssalYear(date.getUTCFullYear());
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const mins = String(date.getUTCMinutes()).padStart(2, '0');
  return `${day} ${month} Ciclo ${year} · ${hours}:${mins} UTC`;
}

function getCycleDuration(settings: VaultSettings) {
  return settings.openDurationMs + settings.closeDurationMs;
}

function getElapsedTime(atTime: Date, settings: VaultSettings) {
  return atTime.getTime() - settings.initialOpenTime.getTime();
}

function getTimeInCycle(atTime: Date, settings: VaultSettings) {
  const cd = getCycleDuration(settings);
  return ((getElapsedTime(atTime, settings) % cd) + cd) % cd;
}

function getCycleNumber(atTime: Date, settings: VaultSettings) {
  return Math.floor(getElapsedTime(atTime, settings) / getCycleDuration(settings)) + settings.cycleNumberOffset;
}

function getNextStatusChange(currentTime: Date, settings: VaultSettings) {
  const cd = getCycleDuration(settings);
  const timeInCurrentCycle = getTimeInCycle(currentTime, settings);

  if (timeInCurrentCycle < settings.openDurationMs) {
    return {
      status: 'ABIERTA' as const,
      nextChangeTime: new Date(currentTime.getTime() + (settings.openDurationMs - timeInCurrentCycle)),
    };
  }
  return {
    status: 'CERRADA' as const,
    nextChangeTime: new Date(currentTime.getTime() + (cd - timeInCurrentCycle)),
  };
}

function formatTimeLeftString(ms: number) {
  const minutes = Math.floor(ms / 1000 / 60);
  const seconds = Math.floor((ms / 1000) % 60);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function parseTab(raw: string | null): BovedasTab {
  if (raw === 'timers' || raw === 'mapas') return raw;
  return 'horario';
}

const CountDownTimerCard: React.FC<{ label: string; defaultMins: number }> = ({ label, defaultMins }) => {
  const defaultMs = defaultMins * 60 * 1000;
  const [remainingMs, setRemainingMs] = useState(defaultMs);
  const [isRunning, setIsRunning] = useState(false);
  const targetTimeRef = useRef(0);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const left = Math.max(0, targetTimeRef.current - now);
      setRemainingMs(left);

      if (left <= 0) {
        setIsRunning(false);
        try {
          const w = window as unknown as {
            AudioContext?: typeof AudioContext;
            webkitAudioContext?: typeof AudioContext;
          };
          const Ctx = w.AudioContext || w.webkitAudioContext;
          if (Ctx) {
            const audioCtx = new Ctx();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            const time = audioCtx.currentTime;
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, time);
            gain.gain.setValueAtTime(0.0001, time);
            gain.gain.exponentialRampToValueAtTime(0.3, time + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.5);
            osc.connect(gain).connect(audioCtx.destination);
            osc.start(time);
            osc.stop(time + 0.55);
          }
        } catch {
          // Ignore WebAudio restrictions
        }

        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Timer Finalizado', { body: `${label} completado.`, tag: label });
        }
      }
    }, 200);
    return () => clearInterval(interval);
  }, [isRunning, label]);

  const toggle = () => {
    if ('Notification' in window && Notification.permission === 'default') {
      void Notification.requestPermission();
    }
    if (isRunning) {
      setIsRunning(false);
    } else {
      if (remainingMs <= 0) setRemainingMs(defaultMs);
      targetTimeRef.current = Date.now() + (remainingMs <= 0 ? defaultMs : remainingMs);
      setIsRunning(true);
    }
  };

  const reset = () => {
    setRemainingMs(defaultMs);
    if (isRunning) targetTimeRef.current = Date.now() + defaultMs;
  };

  const adjust = (deltaMs: number) => {
    const nextValue = Math.max(0, remainingMs + deltaMs);
    setRemainingMs(nextValue);
    if (isRunning) targetTimeRef.current = Date.now() + nextValue;
  };

  const isWarn = remainingMs > 0 && remainingMs <= 60000;
  const isDone = remainingMs <= 0;

  return (
    <div
      style={{
        background: isDone ? 'rgba(255, 62, 62, 0.15)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${isDone ? 'rgba(255, 62, 62, 0.5)' : isWarn ? 'rgba(212,175,55,0.5)' : 'rgba(255,255,255,0.1)'}`,
        padding: '1rem',
        borderRadius: '6px',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.8rem',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong style={{ color: 'var(--text-main)' }}>{label}</strong>
        <span className="tabular-nums" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          {defaultMins}m Preset
        </span>
      </div>

      <div
        className="tabular-nums"
        style={{
          fontSize: '2.2rem',
          fontFamily: 'var(--space-font)',
          textAlign: 'center',
          color: isDone ? 'var(--status-danger)' : isWarn ? 'var(--primary)' : 'var(--text-main)',
        }}
      >
        {formatTimeLeftString(remainingMs)}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          type="button"
          onClick={() => adjust(-60000)}
          aria-label={`Restar 1 minuto a ${label}`}
          style={{
            flex: 1,
            padding: '0.45rem',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'white',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <Minus size={14} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => adjust(60000)}
          aria-label={`Sumar 1 minuto a ${label}`}
          style={{
            flex: 1,
            padding: '0.45rem',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'white',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <Plus size={14} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={reset}
          aria-label={`Reiniciar ${label}`}
          style={{
            flex: 1,
            padding: '0.45rem',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'var(--text-muted)',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <RotateCcw size={14} aria-hidden="true" />
        </button>
      </div>
      <button
        type="button"
        aria-pressed={isRunning}
        onClick={toggle}
        style={{
          padding: '0.6rem',
          background: isRunning ? 'var(--secondary)' : 'var(--primary)',
          color: 'black',
          fontWeight: 'bold',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        {isRunning ? (
          <>
            <Pause size={16} aria-hidden="true" /> PAUSAR
          </>
        ) : (
          <>
            <Play size={16} aria-hidden="true" /> INICIAR
          </>
        )}
      </button>
    </div>
  );
};

const Bovedas: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [settings] = useState(DEFAULT_SETTINGS);
  const [configMeta] = useState('Versión Local / Xyxyll Sync (Patch 4.8.3-LIVE)');

  const tabKey = embedded ? 'subtab' : 'tab';
  const activeTab = parseTab(searchParams.get(tabKey));
  const mapParam = searchParams.get('map');
  const selectedMap = MAPS_DATA.find((m) => m.id === mapParam) ?? MAPS_DATA[0];

  const setActiveTab = (tab: BovedasTab) => {
    const next = new URLSearchParams(searchParams);
    next.set(tabKey, tab);
    if (tab !== 'mapas') next.delete('map');
    setSearchParams(next, { replace: true });
  };

  const setSelectedMapId = (mapId: string) => {
    const next = new URLSearchParams(searchParams);
    next.set(tabKey, 'mapas');
    next.set('map', mapId);
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    if (!embedded) {
      document.title = 'Star Grimoire | Bóvedas del Vacío';
    }
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, [embedded]);

  const { status, nextChangeTime } = getNextStatusChange(currentTime, settings);
  const cycleNumber = getCycleNumber(currentTime, settings);
  const remainingTimeMs = Math.max(0, nextChangeTime.getTime() - currentTime.getTime());
  const isOnline = status === 'ABIERTA';

  const schedule = useMemo(() => {
    const events: Array<{ type: string; time: Date; isOnline: boolean }> = [];
    let cursorTime = nextChangeTime;
    let cursorStatus: 'ABIERTA' | 'CERRADA' = status;
    const windowEnd = new Date(currentTime.getTime() + 3 * 24 * 60 * 60 * 1000);

    while (cursorTime <= windowEnd) {
      if (cursorStatus === 'ABIERTA') {
        events.push({ type: 'CIERRE', time: cursorTime, isOnline: false });
        cursorStatus = 'CERRADA';
        cursorTime = new Date(cursorTime.getTime() + settings.closeDurationMs);
      } else {
        events.push({ type: 'APERTURA', time: cursorTime, isOnline: true });
        cursorStatus = 'ABIERTA';
        cursorTime = new Date(cursorTime.getTime() + settings.openDurationMs);
      }
    }

    const grouped = new Map<number, typeof events>();
    events.forEach((event) => {
      const cycleNum = getCycleNumber(event.time, settings);
      if (!grouped.has(cycleNum)) grouped.set(cycleNum, []);
      grouped.get(cycleNum)!.push(event);
    });

    return Array.from(grouped.entries()).sort(([a], [b]) => a - b).slice(0, 5);
  }, [nextChangeTime, status, currentTime, settings]);

  const tabIdPrefix = useId();
  const HeadingTag = embedded ? 'h2' : 'h1';
  const SubHeadingTag = embedded ? 'h3' : 'h2';
  const GroupHeadingTag = embedded ? 'h4' : 'h3';

  return (
    <div style={{ padding: '0 2rem' }}>
      <HeadingTag style={{ margin: '0 0 0.5rem' }}>
        <DualLabel
          sacred={TERMINOLOGY.bovedas.sacred}
          tactical={TERMINOLOGY.bovedas.tactical}
          size={embedded ? 'md' : 'lg'}
          sacredColor="var(--secondary)"
        />
      </HeadingTag>
      <p style={{ color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
        Centro de Logística e Infiltración Estelar de la Flota.
      </p>
      <p style={{ color: 'var(--primary)', fontSize: '0.8rem', marginBottom: '2rem' }}>
        Sincronización: {configMeta}
      </p>

      <div
        role="tablist"
        aria-label="Subsecciones de Bóvedas del Vacío"
        style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          paddingBottom: '0.5rem',
        }}
      >
        <button
          id={`${tabIdPrefix}-tab-horario`}
          type="button"
          role="tab"
          aria-selected={activeTab === 'horario'}
          aria-controls={activeTab === 'horario' ? `${tabIdPrefix}-panel-horario` : undefined}
          onClick={() => setActiveTab('horario')}
          style={{
            background: 'none',
            border: 'none',
            color: activeTab === 'horario' ? 'var(--primary)' : 'var(--text-muted)',
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            borderBottom: activeTab === 'horario' ? '2px solid var(--primary)' : '2px solid transparent',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.55rem',
          }}
        >
          <Activity size={18} aria-hidden="true" />
          <DualLabel sacred="CRONOGRAMA" tactical="Ciclo Executive Hangar" size="sm" />
        </button>

        <button
          id={`${tabIdPrefix}-tab-timers`}
          type="button"
          role="tab"
          aria-selected={activeTab === 'timers'}
          aria-controls={activeTab === 'timers' ? `${tabIdPrefix}-panel-timers` : undefined}
          onClick={() => setActiveTab('timers')}
          style={{
            background: 'none',
            border: 'none',
            color: activeTab === 'timers' ? 'var(--primary)' : 'var(--text-muted)',
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            borderBottom: activeTab === 'timers' ? '2px solid var(--primary)' : '2px solid transparent',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.55rem',
          }}
        >
          <Timer size={18} aria-hidden="true" />
          <DualLabel sacred="TEMPORIZADORES LOCALES" tactical="Keycards & Comboards" size="sm" />
        </button>

        <button
          id={`${tabIdPrefix}-tab-mapas`}
          type="button"
          role="tab"
          aria-selected={activeTab === 'mapas'}
          aria-controls={activeTab === 'mapas' ? `${tabIdPrefix}-panel-mapas` : undefined}
          onClick={() => setActiveTab('mapas')}
          style={{
            background: 'none',
            border: 'none',
            color: activeTab === 'mapas' ? 'var(--primary)' : 'var(--text-muted)',
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            borderBottom: activeTab === 'mapas' ? '2px solid var(--primary)' : '2px solid transparent',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.55rem',
          }}
        >
          <MapIcon size={18} aria-hidden="true" />
          <DualLabel sacred="MAPAS DEL SECTOR" tactical="Contested Zones & PYAM" size="sm" />
        </button>
      </div>

      {activeTab === 'horario' && (
        <motion.div
          key="horario"
          id={`${tabIdPrefix}-panel-horario`}
          role="tabpanel"
          aria-labelledby={`${tabIdPrefix}-tab-horario`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
            <div
              className="surface-monolith"
              style={{
                marginBottom: '2rem',
                padding: '2rem',
                borderLeft: `6px solid ${isOnline ? 'var(--status-ok)' : 'var(--primary)'}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
                textAlign: 'center',
              }}
            >
              <div>
                <SubHeadingTag style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  ESTADO ACTUAL DE BÓVEDA
                </SubHeadingTag>
                <div
                  style={{
                    fontSize: '3rem',
                    fontFamily: 'var(--cinzel-font)',
                    color: isOnline ? 'var(--status-ok)' : 'var(--primary)',
                    textShadow: isOnline ? '0 0 10px rgba(16, 185, 129, 0.4)' : '0 0 10px rgba(196, 30, 58, 0.4)',
                    fontWeight: 'bold',
                  }}
                >
                  {status}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1rem', background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>TIEMPO RESTANTE</div>
                  <div className="tabular-nums" style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', fontFamily: 'var(--space-font)' }}>
                    {formatTimeLeftString(remainingTimeMs)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>CICLO ACTUAL</div>
                  <div className="tabular-nums" style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', fontFamily: 'var(--space-font)' }}>
                    #{cycleNumber}
                  </div>
                </div>
              </div>
            </div>

            <div className="surface-monolith" style={{ padding: '1.5rem' }}>
              <SubHeadingTag style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <History size={18} className="accent-rsi" aria-hidden="true" /> PRÓXIMOS EVENTOS (3 DÍAS · UTC)
              </SubHeadingTag>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {schedule.map(([cycleNum, cycleEvents]) => (
                  <div key={cycleNum}>
                    <GroupHeadingTag className="tabular-nums" style={{ color: 'var(--secondary)', marginBottom: '0.5rem', fontSize: '0.9rem', fontFamily: 'var(--cinzel-font)', textTransform: 'uppercase', letterSpacing: '3px' }}>
                      Ciclo de Bóveda #{cycleNum}
                    </GroupHeadingTag>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {cycleEvents.map((ev, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '1rem',
                            flexWrap: 'wrap',
                            background: 'rgba(255,255,255,0.03)',
                            padding: '0.8rem 1rem',
                            borderRadius: '4px',
                            borderLeft: `3px solid ${ev.isOnline ? 'var(--status-ok)' : 'var(--primary)'}`,
                          }}
                        >
                          <span style={{ fontWeight: 'bold', color: ev.isOnline ? 'var(--status-ok)' : 'var(--primary)' }}>
                            {ev.type}
                          </span>
                          <span className="tabular-nums" style={{ fontFamily: 'var(--space-font)', fontSize: '0.85rem' }}>
                            {formatAbyssalUtc(ev.time)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
          </div>
        </motion.div>
      )}

      {activeTab === 'timers' && (
        <motion.div
          key="timers"
          id={`${tabIdPrefix}-panel-timers`}
          role="tabpanel"
          aria-labelledby={`${tabIdPrefix}-tab-timers`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
            <div style={{ background: 'rgba(212,175,55,0.1)', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid var(--primary)', marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <AlertTriangle size={24} className="accent-gold" aria-hidden="true" style={{ flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                Los temporizadores se ejecutan localmente en tu cliente web. Si pausas o cierras la pestaña, el tiempo podría detenerse. Se emitirá una notificación de SO y un sonido al agotarse el tiempo si das permisos.
              </p>
            </div>

            {TIMER_CATEGORIES.map((category) => (
              <div key={category.id} className="surface-monolith" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
                <SubHeadingTag style={{ color: 'var(--secondary)', marginBottom: '1.5rem', fontSize: '1.35rem' }}>{category.title}</SubHeadingTag>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  {category.groups.map((group, idx) => (
                    <div key={idx}>
                      <GroupHeadingTag style={{ color: 'var(--primary)', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', fontFamily: 'var(--cinzel-font)', textTransform: 'uppercase', letterSpacing: '3px' }}>
                        {group.title}
                      </GroupHeadingTag>
                      <div className="responsive-grid" style={{ gap: '1rem' }}>
                        {group.timers.map((tLabel, i2) => (
                          <CountDownTimerCard key={`${category.id}-${idx}-${i2}`} label={tLabel} defaultMins={group.minutes} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
          ))}
        </motion.div>
      )}

      {activeTab === 'mapas' && (
        <motion.div
          key="mapas"
          id={`${tabIdPrefix}-panel-mapas`}
          role="tabpanel"
          aria-labelledby={`${tabIdPrefix}-tab-mapas`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {MAPS_DATA.map((mapItem) => {
                  const isActive = selectedMap.id === mapItem.id;
                  return (
                    <button
                      key={mapItem.id}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => setSelectedMapId(mapItem.id)}
                      className={`filter-btn ${isActive ? 'active' : ''}`}
                      style={{ padding: '0.55rem 1rem', fontSize: '0.85rem' }}
                    >
                      {mapItem.title}
                    </button>
                  );
                })}
              </div>

              <div className="surface-monolith" style={{ padding: '1.25rem' }}>
                <SubHeadingTag style={{ color: 'var(--secondary)', marginBottom: '0.5rem' }}>{selectedMap.title}</SubHeadingTag>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>{selectedMap.desc}</p>

                <a
                  href={selectedMap.src}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Abrir mapa táctico de ${selectedMap.title} en nueva pestaña`}
                  style={{ display: 'block', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <img
                    src={selectedMap.src}
                    alt={`Mapa táctico de ${selectedMap.title}`}
                    width={1200}
                    height={800}
                    style={{ width: '100%', height: 'auto', display: 'block', cursor: 'zoom-in' }}
                    loading="lazy"
                  />
                </a>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Bovedas;

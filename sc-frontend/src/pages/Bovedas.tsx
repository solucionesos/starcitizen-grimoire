import React, { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, History, Map as MapIcon, Timer, Play, Pause, RotateCcw, AlertTriangle, Plus, Minus } from 'lucide-react';

// SETTINGS & LOGIC
const SETTINGS = {
  initialOpenTime: new Date("2026-03-26T05:11:56.500000Z"),
  openDurationMs: 3900362,
  closeDurationMs: 7200667,
  cycleNumberOffset: 1,
};

const TIMER_CATEGORIES = [
  {
    id: "checkmate",
    title: "Checkmate",
    groups: [
      { title: "Blue Keycards (15m)", minutes: 15, timers: ["Terminal 1", "Terminal 2", "Terminal 3"] },
      { title: "Comboards (30m)", minutes: 30, timers: ["Tablet 1", "Tablet 2", "Tablet 3"] },
    ]
  },
  {
    id: "orbituary",
    title: "Orbituary",
    groups: [
      { title: "Blue Keycards (15m)", minutes: 15, timers: ["Terminal 1", "Terminal 2"] },
      { title: "Comboards (30m)", minutes: 30, timers: ["Tablet 4", "Tablet 7"] },
    ]
  },
  {
    id: "ruin",
    title: "Ruin Station",
    groups: [
      { title: "Keycards (15m)", minutes: 15, timers: ["The Crypt", "The Last Resort", "The Wasteland"] },
      { title: "Comboards (30m)", minutes: 30, timers: ["Tablet 5", "Tablet 6"] },
    ]
  },
  {
    id: "pyam",
    title: "Sector de Supervisor (PYAM)",
    groups: [
      { title: "Red Keycards (30m)", minutes: 30, timers: ["Terminal 3-4", "Terminal 3-5"] },
    ]
  }
];

const MAPS_DATA = [
    { id: "checkmate", src: "/assets/maps/Checkmate Map.webp", title: "Checkmate", desc: "Rutas de tarjetas electromagnéticas y consolas C-Board por el hangar y ala de seguridad." },
    { id: "orbituary", src: "/assets/maps/Orbituary Map.webp", title: "Orbituary", desc: "Estaciones de tabletas C-Board en entresuelo y túneles de acceso auxiliares." },
    { id: "ruin", src: "/assets/maps/Ruin Map.webp", title: "Ruin Station", desc: "Rutas hacia The Crypt, Last Resort y Wasteland." },
    { id: "pyam-exhang", src: "/assets/maps/Executive Hangar Map.webp", title: "PYAM-EXHANG-0-1", desc: "Checkpoints de vestíbulo y mostradores ejecutivos." },
    { id: "pyam-sup", src: "/assets/maps/Supervisor Map.webp", title: "PYAM-SUPVISR-3-4/5", desc: "Sector de tarjeta roja y oficina de seguridad principal." }
];

function getCycleDuration() { return SETTINGS.openDurationMs + SETTINGS.closeDurationMs; }
function getElapsedTime(atTime: Date) { return atTime.getTime() - SETTINGS.initialOpenTime.getTime(); }
function getTimeInCycle(atTime: Date) {
  const cd = getCycleDuration();
  return ((getElapsedTime(atTime) % cd) + cd) % cd;
}
function getCycleNumber(atTime: Date) {
  return Math.floor(getElapsedTime(atTime) / getCycleDuration()) + 1 + SETTINGS.cycleNumberOffset;
}

function getNextStatusChange(currentTime: Date) {
  const cd = getCycleDuration();
  const timeInCurrentCycle = getTimeInCycle(currentTime);

  if (timeInCurrentCycle < SETTINGS.openDurationMs) {
    return {
      status: "ABIERTA",
      nextChangeTime: new Date(currentTime.getTime() + (SETTINGS.openDurationMs - timeInCurrentCycle)),
    };
  } else {
    return {
      status: "CERRADA",
      nextChangeTime: new Date(currentTime.getTime() + (cd - timeInCurrentCycle)),
    };
  }
}

function formatTimeLeftString(ms: number) {
  let minutes = Math.floor(ms / 1000 / 60);
  let seconds = Math.floor((ms / 1000) % 60);
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
});

// COMPONENT: TIMER CARD
const CountDownTimerCard: React.FC<{ label: string; defaultMins: number }> = ({ label, defaultMins }) => {
    const defaultMs = defaultMins * 60 * 1000;
    const [remainingMs, setRemainingMs] = useState(defaultMs);
    const [isRunning, setIsRunning] = useState(false);
    const targetTimeRef = useRef(0);

    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (isRunning) {
            interval = setInterval(() => {
                const now = Date.now();
                const left = Math.max(0, targetTimeRef.current - now);
                setRemainingMs(left);
                
                if (left <= 0) {
                    setIsRunning(false);
                    // Native chime on complete
                    try {
                        const Ctx = window.AudioContext || (window as any).webkitAudioContext;
                        if (Ctx) {
                            const audioCtx = new Ctx();
                            const osc = audioCtx.createOscillator();
                            const gain = audioCtx.createGain();
                            const time = audioCtx.currentTime;
                            osc.type = "sine";
                            osc.frequency.setValueAtTime(880, time);
                            gain.gain.setValueAtTime(0.0001, time);
                            gain.gain.exponentialRampToValueAtTime(0.3, time + 0.01);
                            gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.5);
                            osc.connect(gain).connect(audioCtx.destination);
                            osc.start(time);
                            osc.stop(time + 0.55);
                        }
                    } catch (e) {}
                    
                    if ("Notification" in window && Notification.permission === "granted") {
                        new Notification("Timer Finalizado", { body: `${label} completado.`, tag: label } as any);
                    }
                }
            }, 200);
        }
        return () => clearInterval(interval);
    }, [isRunning, label]);

    const toggle = () => {
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
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
        <div style={{
            background: isDone ? 'rgba(255, 62, 62, 0.15)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${isDone ? 'rgba(255, 62, 62, 0.5)' : isWarn ? 'rgba(212,175,55,0.5)' : 'rgba(255,255,255,0.1)'}`,
            padding: '1rem',
            borderRadius: '6px',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.8rem'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ color: 'var(--text-main)' }}>{label}</strong>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{defaultMins}m Preset</span>
            </div>
            
            <div style={{
                fontSize: '2.2rem', 
                fontFamily: 'var(--space-font)', 
                textAlign: 'center',
                color: isDone ? '#ff4444' : isWarn ? 'var(--primary)' : 'var(--text-main)'
            }}>
                {formatTimeLeftString(remainingMs)}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                    onClick={() => adjust(-60000)}
                    style={{ flex: 1, padding: '0.4rem', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer' }}
                ><Minus size={14} style={{ margin: 'auto' }} /></button>
                <button 
                    onClick={() => adjust(60000)}
                    style={{ flex: 1, padding: '0.4rem', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer' }}
                ><Plus size={14} style={{ margin: 'auto' }} /></button>
                <button 
                    onClick={reset}
                    style={{ flex: 1, padding: '0.4rem', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'var(--text-muted)', borderRadius: '4px', cursor: 'pointer' }}
                ><RotateCcw size={14} style={{ margin: 'auto' }} /></button>
            </div>
            <button 
                onClick={toggle}
                style={{ 
                    padding: '0.6rem', 
                    background: isRunning ? 'var(--secondary)' : 'var(--primary)', 
                    color: 'black', fontWeight: 'bold', 
                    border: 'none', borderRadius: '4px', cursor: 'pointer',
                    display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem'
                }}
            >
                {isRunning ? <><Pause size={16}/> PAUSAR</> : <><Play size={16}/> INICIAR</>}
            </button>
        </div>
    );
};

// COMPONENT: MAIN
const Bovedas: React.FC = () => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [activeTab, setActiveTab] = useState<'horario' | 'timers' | 'mapas'>('horario');
    const [selectedMap, setSelectedMap] = useState(MAPS_DATA[0]);

    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    const { status, nextChangeTime } = getNextStatusChange(currentTime);
    const cycleNumber = getCycleNumber(currentTime);
    const remainingTimeMs = Math.max(0, nextChangeTime.getTime() - currentTime.getTime());
    const isOnline = status === "ABIERTA";

    const schedule = useMemo(() => {
        const events = [];
        let cursorTime = nextChangeTime;
        let cursorStatus = status;
        const windowEnd = new Date(currentTime.getTime() + 3 * 24 * 60 * 60 * 1000);

        while (cursorTime <= windowEnd) {
            if (cursorStatus === "ABIERTA") {
                events.push({ type: "CIERRE", time: cursorTime, isOnline: false });
                cursorStatus = "CERRADA";
                cursorTime = new Date(cursorTime.getTime() + SETTINGS.closeDurationMs);
            } else {
                events.push({ type: "APERTURA", time: cursorTime, isOnline: true });
                cursorStatus = "ABIERTA";
                cursorTime = new Date(cursorTime.getTime() + SETTINGS.openDurationMs);
            }
        }

        const grouped = new Map<number, typeof events>();
        events.forEach(event => {
            const cycleNum = getCycleNumber(event.time);
            if (!grouped.has(cycleNum)) grouped.set(cycleNum, []);
            grouped.get(cycleNum)!.push(event);
        });

        return Array.from(grouped.entries()).sort(([a], [b]) => a - b).slice(0, 5);
    }, [nextChangeTime, status, currentTime]);


    return (
        <div style={{ padding: '0 2rem' }}>
            <h1 style={{ color: 'var(--secondary)' }}>Bóvedas del Vacío</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Centro de Logística e Infiltración Estelar de la Flota.</p>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                <button 
                    onClick={() => setActiveTab('horario')} 
                    style={{ background: 'none', border: 'none', color: activeTab === 'horario' ? 'var(--primary)' : 'var(--text-muted)', padding: '0.5rem 1rem', cursor: 'pointer', fontFamily: 'var(--cinzel-font)', letterSpacing: '2px', fontWeight: 'bold', borderBottom: activeTab === 'horario' ? '2px solid var(--primary)' : '2px solid transparent', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                ><Activity size={18} /> CRONOGRAMA</button>

                <button 
                    onClick={() => setActiveTab('timers')} 
                    style={{ background: 'none', border: 'none', color: activeTab === 'timers' ? 'var(--primary)' : 'var(--text-muted)', padding: '0.5rem 1rem', cursor: 'pointer', fontFamily: 'var(--cinzel-font)', letterSpacing: '2px', fontWeight: 'bold', borderBottom: activeTab === 'timers' ? '2px solid var(--primary)' : '2px solid transparent', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                ><Timer size={18} /> TEMPORIZADORES LOCALES</button>

                <button 
                    onClick={() => setActiveTab('mapas')} 
                    style={{ background: 'none', border: 'none', color: activeTab === 'mapas' ? 'var(--primary)' : 'var(--text-muted)', padding: '0.5rem 1rem', cursor: 'pointer', fontFamily: 'var(--cinzel-font)', letterSpacing: '2px', fontWeight: 'bold', borderBottom: activeTab === 'mapas' ? '2px solid var(--primary)' : '2px solid transparent', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                ><MapIcon size={18} /> MAPAS DEL SECTOR</button>
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'horario' && (
                    <motion.div key="horario" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                        <div className="glass-card" style={{ marginBottom: '2rem', padding: '2rem', borderLeft: `6px solid ${isOnline ? 'var(--primary)' : 'rgba(255, 62, 62, 0.8)'}`, display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'center' }}>
                            <div>
                                <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                    ESTADO ACTUAL DE BÓVEDA
                                </h3>
                                <div style={{ fontSize: '3rem', fontFamily: 'var(--cinzel-font)', color: isOnline ? 'var(--primary)' : 'rgba(255, 62, 62, 1)', textShadow: isOnline ? '0 0 10px rgba(212,175,55,0.4)' : '0 0 10px rgba(255,62,62,0.4)', fontWeight: 'bold' }}>
                                    {status}
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1rem', background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '8px' }}>
                                <div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>TIEMPO RESTANTE</div>
                                    <div style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', fontFamily: 'var(--space-font)' }}>{formatTimeLeftString(remainingTimeMs)}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>CICLO ACTUAL</div>
                                    <div style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', fontFamily: 'var(--space-font)' }}>#{cycleNumber}</div>
                                </div>
                            </div>
                        </div>

                        <div className="glass-card" style={{ padding: '1.5rem' }}>
                            <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <History size={18} className="accent-cyan" /> PRÓXIMOS EVENTOS (3 DÍAS)
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                {schedule.map(([cycleNum, cycleEvents]) => (
                                    <div key={cycleNum}>
                                        <h4 style={{ color: 'var(--primary)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Ciclo #{cycleNum}</h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            {cycleEvents.map((ev, idx) => (
                                                <div key={idx} style={{ 
                                                    display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: '0.8rem 1rem', borderRadius: '4px', borderLeft: `3px solid ${ev.isOnline ? 'var(--primary)' : 'rgba(255, 62, 62, 0.6)'}`
                                                }}>
                                                    <span style={{ fontWeight: 'bold', color: ev.isOnline ? 'var(--primary)' : 'rgba(255, 62, 62, 0.9)' }}>{ev.type}</span>
                                                    <span style={{ fontFamily: 'var(--space-font)' }}>{dateTimeFormatter.format(ev.time)}</span>
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
                    <motion.div key="timers" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                        
                        <div style={{ background: 'rgba(212,175,55,0.1)', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid var(--primary)', marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <AlertTriangle size={24} className="accent-gold" />
                            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-main)' }}>Los temporizadores se ejecutan localmente en tu cliente web. Si pausas o cierras la pestaña, el tiempo podría detenerse. Se emitirá una notificación de SO y un sonido al agotarse el tiempo si das permisos.</p>
                        </div>

                        {TIMER_CATEGORIES.map(category => (
                            <div key={category.id} className="glass-card" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
                                <h2 style={{ color: 'var(--secondary)', marginBottom: '1.5rem', fontSize: '1.4rem' }}>{category.title}</h2>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                    {category.groups.map((group, idx) => (
                                        <div key={idx}>
                                            <h4 style={{ color: 'var(--primary)', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                                                {group.title}
                                            </h4>
                                            <div className="responsive-grid" style={{ gap: '1rem' }}>
                                                {group.timers.map((tLabel, i2) => (
                                                    <CountDownTimerCard 
                                                        key={`${category.id}-${idx}-${i2}`} 
                                                        label={tLabel} 
                                                        defaultMins={group.minutes} 
                                                    />
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
                    <motion.div key="mapas" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {MAPS_DATA.map(mapItem => (
                                    <button 
                                        key={mapItem.id}
                                        onClick={() => setSelectedMap(mapItem)}
                                        style={{ 
                                            background: selectedMap.id === mapItem.id ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                            color: selectedMap.id === mapItem.id ? 'black' : 'var(--text-main)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            padding: '0.5rem 1rem',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontWeight: selectedMap.id === mapItem.id ? 'bold' : 'normal'
                                        }}
                                    >
                                        {mapItem.title}
                                    </button>
                                ))}
                            </div>
                            
                            <div className="glass-card" style={{ padding: '1rem' }}>
                                <h2 style={{ color: 'var(--secondary)', marginBottom: '0.5rem' }}>{selectedMap.title}</h2>
                                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>{selectedMap.desc}</p>
                                
                                <a href={selectedMap.src} target="_blank" rel="noreferrer" style={{ display: 'block', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    <img 
                                        src={selectedMap.src} 
                                        alt={selectedMap.title} 
                                        style={{ width: '100%', height: 'auto', display: 'block', cursor: 'zoom-in' }}
                                        loading="lazy"
                                    />
                                </a>
                            </div>
                        </div>
                    </motion.div>
                )}

            </AnimatePresence>
        </div>
    );
};

export default Bovedas;

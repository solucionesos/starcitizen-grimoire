import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getShips, getWeapons } from '../api/client';
import type { Ship, VehicleWeapon } from '../types';
import { Shield, BookOpen, ExternalLink } from 'lucide-react';

const CodexShips: React.FC = () => {
    const [ships, setShips] = useState<Ship[]>([]);
    const [weapons, setWeapons] = useState<VehicleWeapon[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedShip, setSelectedShip] = useState<string>('');
    const [weaponSearch, setWeaponSearch] = useState<string>('');
    const [shipListSearch, setShipListSearch] = useState<string>('');

    const location = useLocation();

    useEffect(() => {
        Promise.all([getShips(), getWeapons()])
            .then(([s, w]) => {
                setShips(s);
                setWeapons(w);

                const params = new URLSearchParams(location.search);
                const idParam = params.get('id');
                if (idParam && s.find(ship => ship.id === idParam)) {
                    setSelectedShip(idParam);
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [location.search]);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [selectedShip]);

    if (loading) return <div style={{ textAlign: 'center', padding: '5rem', fontFamily: 'var(--cinzel-font)' }}>Sincronizando Archivos de Arcas Estelares...</div>;

    const currentShip = ships.find(s => s.id === selectedShip);

    const piercingWeapons = currentShip ? weapons.filter(w => {
        if (!currentShip.deflection) return false;
        
        let piercing = false;
        if (w.alpha.physical > 0 && currentShip.deflection.physical < w.alpha.physical) piercing = true;
        if (w.alpha.energy > 0 && currentShip.deflection.energy < w.alpha.energy) piercing = true;
        
        if (!piercing) return false;
        if (weaponSearch && !w.name.toLowerCase().includes(weaponSearch.toLowerCase())) return false;
        return true;
    }) : [];

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Cabecera */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-gold)', margin: 0, fontFamily: 'var(--cinzel-font)' }}>
                    <Shield size={32} /> ARCAS ESTELARES
                </h1>
                {currentShip && (
                    <button onClick={() => setSelectedShip('')} className="btn" style={{ background: 'transparent', border: '1px solid var(--accent-gold)', color: 'var(--accent-gold)' }}>
                        Volver al Índice
                    </button>
                )}
            </div>

            {!currentShip && (
                <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                        <p style={{ color: 'var(--text-muted)', margin: 0 }}>
                            Registro de todos los navíos conocidos. Selecciona un arca para acceder a sus especificaciones técnicas y su vulnerabilidad balística.
                        </p>
                        <input 
                            type="text" 
                            placeholder="Buscar nave o fabricante..." 
                            value={shipListSearch}
                            onChange={e => setShipListSearch(e.target.value)}
                            style={{ padding: '0.8rem', borderRadius: '4px', border: '1px solid var(--accent-gold)', background: 'rgba(0,0,0,0.3)', color: 'white', maxWidth: '400px' }}
                        />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                        {ships.filter(s => {
                            if (!shipListSearch) return true;
                            const search = shipListSearch.toLowerCase();
                            return s.name.toLowerCase().includes(search) || (s.manufacturer && s.manufacturer.toLowerCase().includes(search));
                        }).map(s => {
                            const minUecPrice = s.uex_prices && s.uex_prices.length > 0 
                                ? Math.min(...s.uex_prices.map(p => p.price_buy || Infinity))
                                : null;

                            return (
                                <div key={s.id} className="glass-card hover-primary" onClick={() => setSelectedShip(s.id)} style={{ cursor: 'pointer', padding: 0, overflow: 'hidden', borderTop: '2px solid var(--accent-gold)', display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ width: '100%', height: '150px', background: 'rgba(0,0,0,0.5)', overflow: 'hidden' }}>
                                        {s.image ? (
                                            <img src={s.image} alt={s.name} referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s ease' }} />
                                        ) : (
                                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Sin Imagen</div>
                                        )}
                                    </div>
                                    <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                                        <div>
                                            <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--text-main)' }}>{s.name}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--accent-silver)', textTransform: 'uppercase', letterSpacing: '1px' }}>{s.manufacturer || 'Desconocido'}</div>
                                        </div>
                                        
                                        <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                            <div>
                                                <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Valor USD</div>
                                                <div style={{ color: 'var(--accent-gold)' }}>{s.msrp ? `$${s.msrp}` : 'N/A'}</div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Valor aUEC</div>
                                                <div style={{ color: '#ffd700' }}>{minUecPrice && minUecPrice !== Infinity ? minUecPrice.toLocaleString() : 'N/A'}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {currentShip && (
                <div className="glass-card">
                    {currentShip.image && (
                        <div style={{ width: '100%', height: '300px', marginBottom: '1.5rem', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--accent-gold)' }}>
                            <img src={currentShip.image} alt={currentShip.name} referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                    )}
                    <h2 style={{ color: 'var(--accent-gold)', marginBottom: '0.2rem' }}>{currentShip.name}</h2>
                    <h3 style={{ color: 'var(--accent-silver)', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '1.5rem' }}>{currentShip.manufacturer || 'Desconocido'}</h3>
                    {currentShip.description_lore && (
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '1.5rem', borderLeft: '2px solid var(--accent-gold)', paddingLeft: '1rem' }}>
                            {currentShip.description_lore}
                        </p>
                    )}

                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                        {/* BOTÓN HACIA TECNOMILAGRO */}
                        <Link to={`/codice/tecnomilagros?search=${encodeURIComponent(currentShip.name)}`} className="btn" style={{ background: 'var(--secondary)', color: '#000', fontSize: '0.8rem', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <BookOpen size={16} /> Buscar Tecnomilagro
                        </Link>
                        {/* BOTÓN HACIA ERKUL CALCULATOR */}
                        <a href="https://erkul.games/calculator" target="_blank" rel="noopener noreferrer" className="btn" style={{ background: 'rgba(255, 255, 255, 0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', fontSize: '0.8rem', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
                            <ExternalLink size={16} /> Erkul Calculator
                        </a>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>DEFLEXIÓN FÍSICA</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ff8a65' }}>{currentShip.deflection?.physical || 0}</div>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>DEFLEXIÓN LÁSER</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4fc3f7' }}>{currentShip.deflection?.energy || 0}</div>
                        </div>
                    </div>

                    {currentShip.msrp && (
                        <div style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                            Valor Pledge: <span className="accent-gold">${currentShip.msrp} USD</span>
                        </div>
                    )}
                    {currentShip.uex_prices && currentShip.uex_prices.length > 0 && (
                        <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem', marginBottom: '1.5rem' }}>
                            <h4 style={{ color: 'var(--text-color)', marginBottom: '0.5rem' }}>Disponibilidad In-Game (LIVE):</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {currentShip.uex_prices.map((price, idx) => (
                                    <div key={idx} style={{ background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '4px' }}>
                                        <p style={{ margin: '0', fontSize: '0.9rem' }}><strong>Lugar:</strong> {price.terminal_name} {price.starmap_location ? `(${price.starmap_location.name}, ${price.starmap_location.star_system_name})` : ''}</p>
                                        <p style={{ margin: '0', fontSize: '0.9rem', color: '#ffd700' }}><strong>Costo:</strong> {price.price_buy?.toLocaleString()} aUEC</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem', fontSize: '0.8rem' }}>
                        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.8rem', borderRadius: '4px' }}>
                            <div style={{ color: 'var(--text-muted)' }}>Carga (SCU)</div>
                            <div>{currentShip.cargo_capacity || 0}</div>
                        </div>
                        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.8rem', borderRadius: '4px' }}>
                            <div style={{ color: 'var(--text-muted)' }}>Velocidad (SCM / MAX)</div>
                            <div>{currentShip.speed?.scm || 0} / {currentShip.speed?.max || 0} m/s</div>
                        </div>
                        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.8rem', borderRadius: '4px' }}>
                            <div style={{ color: 'var(--text-muted)' }}>Tanques (Q / H)</div>
                            <div>{currentShip.fuel?.quantum || 0} / {currentShip.fuel?.hydrogen || 0}</div>
                        </div>
                        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.8rem', borderRadius: '4px' }}>
                            <div style={{ color: 'var(--text-muted)' }}>Dimensiones (L x W x H)</div>
                            <div>{currentShip.dimensions?.length || 0} x {currentShip.dimensions?.width || 0} x {currentShip.dimensions?.height || 0} m</div>
                        </div>
                        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.8rem', borderRadius: '4px' }}>
                            <div style={{ color: 'var(--text-muted)' }}>Armas y Torretas</div>
                            <div>{currentShip.component_sizes?.weapon ? String(currentShip.component_sizes.weapon).split(',').map((s: string) => {
                                const parts = s.trim().split('x');
                                if (parts.length === 3) return `${parts[0]}x${parts[1]} Size ${parts[2]}`;
                                if (parts.length === 2) return `${parts[0]} Size ${parts[1]}`;
                                return s;
                            }).join(', ') : '?'}</div>
                        </div>
                        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.8rem', borderRadius: '4px' }}>
                            <div style={{ color: 'var(--text-muted)' }}>Tamaño Máx Escudos</div>
                            <div>{currentShip.component_sizes?.shield || '?'}</div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #ff4444', paddingBottom: '0.5rem' }}>
                        <h4 style={{ color: '#ff4444', margin: 0, fontSize: '1rem' }}>ARMAS QUE PERFORAN ESTE BLINDAJE</h4>
                        <input 
                            type="text" 
                            placeholder="Buscar arma..." 
                            value={weaponSearch}
                            onChange={e => setWeaponSearch(e.target.value)}
                            style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid rgba(255,68,68,0.5)', background: 'rgba(0,0,0,0.3)', color: 'white' }}
                        />
                    </div>
                    {currentShip.deflection ? (
                        <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {piercingWeapons.slice(0, 50).map(w => (
                                <Link to={`/codice/armamentos?id=${w.id}`} key={w.id} style={{ background: 'rgba(255,68,68,0.1)', padding: '0.5rem 1rem', borderRadius: '4px', borderLeft: '3px solid #ff4444', textDecoration: 'none', color: 'white', display: 'flex', justifyContent: 'space-between' }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{w.name} (S{w.size})</div>
                                    <div style={{ fontSize: '0.8rem', color: '#ff8a65' }}>
                                        Alpha: {w.alpha.physical > 0 ? `${w.alpha.physical} Fis` : `${w.alpha.energy} Ene`}
                                    </div>
                                </Link>
                            ))}
                            {piercingWeapons.length > 50 && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>Y {piercingWeapons.length - 50} armas más...</div>}
                            {piercingWeapons.length === 0 && <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', padding: '1rem' }}>El blindaje resiste todo el arsenal conocido en la base de datos.</div>}
                        </div>
                    ) : (
                        <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Este arca no cuenta con estadísticas de deflexión (probablemente carece de escudos o blindaje registrado).</div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CodexShips;

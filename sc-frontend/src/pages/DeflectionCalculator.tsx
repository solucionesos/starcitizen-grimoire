import React, { useState, useEffect } from 'react';
import { getShips, getWeapons } from '../api/client';
import type { Ship, VehicleWeapon } from '../types';
import { Crosshair, Shield } from 'lucide-react';

const DeflectionCalculator: React.FC = () => {
    const [ships, setShips] = useState<Ship[]>([]);
    const [weapons, setWeapons] = useState<VehicleWeapon[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedShip, setSelectedShip] = useState<string>('');
    const [selectedWeapon, setSelectedWeapon] = useState<string>('');

    useEffect(() => {
        Promise.all([getShips(), getWeapons()])
            .then(([s, w]) => {
                setShips(s);
                setWeapons(w);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div style={{ textAlign: 'center', padding: '5rem', fontFamily: 'var(--cinzel-font)' }}>Sincronizando modelos balísticos...</div>;

    const currentShip = ships.find(s => s.id === selectedShip);
    const currentWeapon = weapons.find(w => w.id === selectedWeapon);

    // Calc vulnerable ships for selected weapon
    const vulnerableShips = currentWeapon ? ships.filter(s => {
        if (!s.deflection) return false;
        // Weapon physical alpha vs ship physical deflection
        if (currentWeapon.alpha.physical > 0 && s.deflection.physical < currentWeapon.alpha.physical) return true;
        // Weapon energy alpha vs ship energy deflection
        if (currentWeapon.alpha.energy > 0 && s.deflection.energy < currentWeapon.alpha.energy) return true;
        return false;
    }) : [];

    // Calc piercing weapons for selected ship
    const piercingWeapons = currentShip ? weapons.filter(w => {
        if (!currentShip.deflection) return false;
        if (w.alpha.physical > 0 && currentShip.deflection.physical < w.alpha.physical) return true;
        if (w.alpha.energy > 0 && currentShip.deflection.energy < w.alpha.energy) return true;
        return false;
    }) : [];

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', padding: '1rem' }}>
            {/* VISTA NAVE */}
            <div className="glass-card">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-silver)', marginBottom: '1rem' }}>
                    <Shield size={24} /> ANÁLISIS DE BLINDAJE
                </h2>
                
                <select 
                    value={selectedShip} 
                    onChange={e => setSelectedShip(e.target.value)}
                    style={{ width: '100%', padding: '0.8rem', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--accent-silver)', color: 'white', marginBottom: '1.5rem', borderRadius: '4px' }}
                >
                    <option value="">Selecciona una nave...</option>
                    {ships.filter(s => s.deflection).map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>

                {currentShip && currentShip.deflection && (
                    <div>
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                            <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>DEFLEXIÓN FÍSICA</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ff8a65' }}>{currentShip.deflection.physical}</div>
                            </div>
                            <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>DEFLEXIÓN LÁSER</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4fc3f7' }}>{currentShip.deflection.energy}</div>
                            </div>
                        </div>

                        {currentShip.msrp && (
                            <div style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                                Valor Pledge: <span className="accent-gold">${currentShip.msrp} USD</span>
                            </div>
                        )}
                        {currentShip.uex_prices && currentShip.uex_prices.length > 0 && (
                            <div style={{ marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                                Valor aUEC: <span className="accent-cyan">{currentShip.uex_prices[0].price_buy} aUEC</span> ({currentShip.uex_prices[0].terminal_name})
                            </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem', fontSize: '0.8rem' }}>
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
                                <div>{currentShip.dimensions?.length} x {currentShip.dimensions?.width} x {currentShip.dimensions?.height} m</div>
                            </div>
                            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.8rem', borderRadius: '4px' }}>
                                <div style={{ color: 'var(--text-muted)' }}>Tamaño Máx Armas</div>
                                <div>S{currentShip.component_sizes?.weapon || '?'}</div>
                            </div>
                            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.8rem', borderRadius: '4px' }}>
                                <div style={{ color: 'var(--text-muted)' }}>Tamaño Máx Escudos</div>
                                <div>S{currentShip.component_sizes?.shield || '?'}</div>
                            </div>
                        </div>

                        <h4 style={{ color: '#ff4444', marginBottom: '1rem', fontSize: '0.9rem' }}>ARMAS QUE PERFORAN ESTE BLINDAJE:</h4>
                        <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {piercingWeapons.slice(0, 50).map(w => (
                                <div key={w.id} style={{ background: 'rgba(255,68,68,0.1)', padding: '0.5rem', borderRadius: '4px', borderLeft: '3px solid #ff4444' }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{w.name} (S{w.size})</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                        Alpha: {w.alpha.physical > 0 ? `${w.alpha.physical} Fis` : `${w.alpha.energy} Ene`}
                                    </div>
                                </div>
                            ))}
                            {piercingWeapons.length > 50 && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>Y {piercingWeapons.length - 50} más...</div>}
                            {piercingWeapons.length === 0 && <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>El blindaje resiste todo el arsenal conocido.</div>}
                        </div>
                    </div>
                )}
            </div>

            {/* VISTA ARMA */}
            <div className="glass-card">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ff4444', marginBottom: '1rem' }}>
                    <Crosshair size={24} /> POTENCIA DE FUEGO
                </h2>

                <select 
                    value={selectedWeapon} 
                    onChange={e => setSelectedWeapon(e.target.value)}
                    style={{ width: '100%', padding: '0.8rem', background: 'rgba(0,0,0,0.5)', border: '1px solid #ff4444', color: 'white', marginBottom: '1.5rem', borderRadius: '4px' }}
                >
                    <option value="">Selecciona un arma...</option>
                    {weapons.map(w => (
                        <option key={w.id} value={w.id}>[S{w.size}] {w.name}</option>
                    ))}
                </select>

                {currentWeapon && (
                    <div>
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                            <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>DAÑO ALPHA FÍSICO</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ff8a65' }}>{currentWeapon.alpha.physical}</div>
                            </div>
                            <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>DAÑO ALPHA LÁSER</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4fc3f7' }}>{currentWeapon.alpha.energy}</div>
                            </div>
                        </div>

                        {currentWeapon.uex_prices && currentWeapon.uex_prices.length > 0 && (
                            <div style={{ marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                                Valor aUEC: <span className="accent-cyan">{currentWeapon.uex_prices[0].price_buy} aUEC</span> ({currentWeapon.uex_prices[0].terminal_name})
                            </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem', fontSize: '0.8rem' }}>
                            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.8rem', borderRadius: '4px' }}>
                                <div style={{ color: 'var(--text-muted)' }}>Tipo de Arma</div>
                                <div>{currentWeapon.type || 'Desconocido'}</div>
                            </div>
                            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.8rem', borderRadius: '4px' }}>
                                <div style={{ color: 'var(--text-muted)' }}>Daño por Segundo (DPS)</div>
                                <div>{currentWeapon.dps || 0}</div>
                            </div>
                            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.8rem', borderRadius: '4px' }}>
                                <div style={{ color: 'var(--text-muted)' }}>Cadencia (RPM)</div>
                                <div>{currentWeapon.fire_rate || 0}</div>
                            </div>
                            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.8rem', borderRadius: '4px' }}>
                                <div style={{ color: 'var(--text-muted)' }}>Velocidad del Proyectil</div>
                                <div>{currentWeapon.projectile_speed || 0} m/s</div>
                            </div>
                            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.8rem', borderRadius: '4px', gridColumn: '1 / -1' }}>
                                <div style={{ color: 'var(--text-muted)' }}>Alcance Máximo</div>
                                <div>{currentWeapon.range || 0} m</div>
                            </div>
                        </div>

                        <h4 style={{ color: 'var(--accent-silver)', marginBottom: '1rem', fontSize: '0.9rem' }}>NAVES VULNERABLES A ESTE ARMA:</h4>
                        <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {vulnerableShips.slice(0, 50).map(s => (
                                <div key={s.id} style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '4px', borderLeft: '3px solid var(--accent-silver)' }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{s.name}</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                        Deflexión: {currentWeapon.alpha.physical > 0 ? s.deflection?.physical : s.deflection?.energy}
                                    </div>
                                </div>
                            ))}
                            {vulnerableShips.length > 50 && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>Y {vulnerableShips.length - 50} más...</div>}
                            {vulnerableShips.length === 0 && <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>No penetra el blindaje de ninguna nave registrada.</div>}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DeflectionCalculator;

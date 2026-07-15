import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getShips, getWeapons } from '../api/client';
import type { Ship, VehicleWeapon } from '../types';
import { Crosshair, BookOpen } from 'lucide-react';

const CodexWeapons: React.FC = () => {
    const [ships, setShips] = useState<Ship[]>([]);
    const [weapons, setWeapons] = useState<VehicleWeapon[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedWeapon, setSelectedWeapon] = useState<string>('');
    const [shipSearch, setShipSearch] = useState<string>('');
    const [weaponSearch, setWeaponSearch] = useState<string>('');
    const [typeFilter, setTypeFilter] = useState<string>('');
    const [sizeFilter, setSizeFilter] = useState<string>('');
    
    const location = useLocation();

    useEffect(() => {
        Promise.all([getShips(), getWeapons()])
            .then(([s, w]) => {
                setShips(s);
                setWeapons(w);
                
                // If ID is in URL params, select it
                const params = new URLSearchParams(location.search);
                const idParam = params.get('id');
                if (idParam && w.find(weapon => weapon.id === idParam)) {
                    setSelectedWeapon(idParam);
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [location.search]);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [selectedWeapon]);

    if (loading) return <div style={{ textAlign: 'center', padding: '5rem', fontFamily: 'var(--cinzel-font)' }}>Sincronizando Balística...</div>;

    const currentWeapon = weapons.find(w => w.id === selectedWeapon);

    const vulnerableShips = currentWeapon ? ships.filter(s => {
        if (!s.deflection) return false;
        
        let vulnerable = false;
        if (currentWeapon.alpha.physical > 0 && s.deflection.physical < currentWeapon.alpha.physical) vulnerable = true;
        if (currentWeapon.alpha.energy > 0 && s.deflection.energy < currentWeapon.alpha.energy) vulnerable = true;
        
        if (!vulnerable) return false;
        if (shipSearch && !s.name.toLowerCase().includes(shipSearch.toLowerCase())) return false;
        return true;
    }) : [];

    const uniqueTypes = Array.from(new Set(weapons.map(w => w.type).filter(Boolean) as string[])).sort();
    const uniqueSizes = Array.from(new Set(weapons.map(w => w.size).filter(s => s > 0))).sort((a,b) => a - b);

    const filteredWeapons = weapons.filter(w => {
        if (weaponSearch && !w.name.toLowerCase().includes(weaponSearch.toLowerCase())) return false;
        if (typeFilter && w.type !== typeFilter) return false;
        if (sizeFilter && w.size.toString() !== sizeFilter) return false;
        return true;
    });

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Cabecera */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ff4444', margin: 0, fontFamily: 'var(--cinzel-font)' }}>
                    <Crosshair size={32} /> ARMAMENTOS DEL VACÍO
                </h1>
                {currentWeapon && (
                    <button onClick={() => setSelectedWeapon('')} className="btn" style={{ background: 'transparent', border: '1px solid #ff4444', color: '#ff4444' }}>
                        Volver al Índice
                    </button>
                )}
            </div>

            {!currentWeapon && (
                <>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
                        Registro del poder de fuego vehicular. Selecciona un armamento para visualizar sus estadísticas de daño y qué navíos puede perforar.
                    </p>

                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                        <input 
                            type="text" 
                            placeholder="Buscar arma por nombre..." 
                            value={weaponSearch} 
                            onChange={e => setWeaponSearch(e.target.value)}
                            style={{ flex: '1 1 250px', padding: '0.8rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'rgba(0,0,0,0.5)', color: 'var(--text-main)', fontFamily: 'var(--body-font)' }}
                        />
                        <select 
                            value={typeFilter}
                            onChange={e => setTypeFilter(e.target.value)}
                            style={{ padding: '0.8rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'rgba(0,0,0,0.5)', color: 'var(--text-main)', fontFamily: 'var(--body-font)' }}
                        >
                            <option value="">Cualquier Tipo</option>
                            {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <select 
                            value={sizeFilter}
                            onChange={e => setSizeFilter(e.target.value)}
                            style={{ padding: '0.8rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'rgba(0,0,0,0.5)', color: 'var(--text-main)', fontFamily: 'var(--body-font)' }}
                        >
                            <option value="">Cualquier Tamaño</option>
                            {uniqueSizes.map(s => <option key={s} value={s.toString()}>Tamaño {s}</option>)}
                        </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
                        {filteredWeapons.map(w => (
                            <div key={w.id} className="glass-card hover-primary" onClick={() => setSelectedWeapon(w.id)} style={{ cursor: 'pointer', padding: '1rem', borderTop: '2px solid #ff4444' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>[S{w.size}] {w.name}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{w.type || 'Arma'}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    Alpha: {w.alpha.physical > 0 ? `${w.alpha.physical} Fis` : `${w.alpha.energy} Ene`}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    DPS: {w.dps || 0}
                                </div>
                            </div>
                        ))}
                        {filteredWeapons.length === 0 && (
                            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                No se encontraron armas con esos filtros.
                            </div>
                        )}
                    </div>
                </>
            )}

            {currentWeapon && (
                <div className="glass-card">
                    <h2 style={{ color: '#ff4444', marginBottom: '0.5rem' }}>{currentWeapon.name} (S{currentWeapon.size})</h2>
                    {currentWeapon.description_lore && (
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '1.5rem', borderLeft: '2px solid #ff4444', paddingLeft: '1rem' }}>
                            {currentWeapon.description_lore}
                        </p>
                    )}

                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                        <Link to={`/codice/tecnomilagros?search=${encodeURIComponent(currentWeapon.name)}`} className="btn" style={{ background: 'var(--secondary)', color: '#000', fontSize: '0.8rem', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <BookOpen size={16} /> Buscar Tecnomilagro
                        </Link>
                    </div>

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
                        <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem', marginBottom: '1.5rem' }}>
                            <h4 style={{ color: 'var(--text-color)', marginBottom: '0.5rem' }}>Disponibilidad In-Game (LIVE):</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {currentWeapon.uex_prices.map((price, idx) => (
                                    <div key={idx} style={{ background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '4px' }}>
                                        <p style={{ margin: '0', fontSize: '0.9rem' }}><strong>Lugar:</strong> {price.terminal_name} {price.starmap_location ? `(${price.starmap_location.name}, ${price.starmap_location.star_system_name})` : ''}</p>
                                        <p style={{ margin: '0', fontSize: '0.9rem', color: '#ffd700' }}><strong>Costo:</strong> {price.price_buy?.toLocaleString()} aUEC</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem', fontSize: '0.8rem' }}>
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
                        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.8rem', borderRadius: '4px' }}>
                            <div style={{ color: 'var(--text-muted)' }}>Alcance Máximo</div>
                            <div>{currentWeapon.range || 0} m</div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--accent-silver)', paddingBottom: '0.5rem' }}>
                        <h4 style={{ color: 'var(--accent-silver)', margin: 0, fontSize: '1rem' }}>NAVES VULNERABLES (Pérdida de Integridad)</h4>
                        <input 
                            type="text" 
                            placeholder="Buscar nave..." 
                            value={shipSearch}
                            onChange={e => setShipSearch(e.target.value)}
                            style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid rgba(200,200,200,0.5)', background: 'rgba(0,0,0,0.3)', color: 'white' }}
                        />
                    </div>
                    <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {vulnerableShips.slice(0, 50).map(s => (
                            <Link to={`/codice/arcas-estelares?id=${s.id}`} key={s.id} style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: '4px', borderLeft: '3px solid var(--accent-silver)', display: 'flex', justifyContent: 'space-between', textDecoration: 'none', color: 'white' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{s.name}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    Deflexión: {currentWeapon.alpha.physical > 0 ? s.deflection?.physical : s.deflection?.energy}
                                </div>
                            </Link>
                        ))}
                        {vulnerableShips.length > 50 && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>Y {vulnerableShips.length - 50} navíos más...</div>}
                        {vulnerableShips.length === 0 && <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', padding: '1rem' }}>La potencia de este armamento no es suficiente para atravesar el blindaje de las naves registradas.</div>}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CodexWeapons;

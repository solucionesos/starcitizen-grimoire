import React, { useEffect, useId, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getShips, getWeapons } from '../api/client';
import type { Ship, UexPrice, VehicleWeapon } from '../types';
import { BookOpen, ExternalLink, Search, Shield } from 'lucide-react';
import DualLabel from '../components/DualLabel';
import Pagination from '../components/Pagination';
import { TERMINOLOGY } from '../constants/terminology';

function collectPurchasePrices(ship: Ship): UexPrice[] {
  const prices: UexPrice[] = [];
  if (Array.isArray(ship.prices)) prices.push(...ship.prices);
  if (Array.isArray(ship.uex_prices)) {
    prices.push(...ship.uex_prices);
  } else if (ship.uex_prices?.purchase) {
    prices.push(...ship.uex_prices.purchase);
  }
  return prices;
}

const CodexShips: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const baseId = useId();
  const shipSearchInputId = `${baseId}-ship-search`;
  const weaponSearchInputId = `${baseId}-weapon-search`;

  const [ships, setShips] = useState<Ship[]>([]);
  const [weapons, setWeapons] = useState<VehicleWeapon[]>([]);
  const [loading, setLoading] = useState(true);
  const [weaponSearch, setWeaponSearch] = useState('');

  const itemsPerPage = 24;
  const selectedShip = searchParams.get('id') ?? '';
  const shipListSearch = searchParams.get('search') ?? '';
  const rawPage = Number.parseInt(searchParams.get('page') ?? '1', 10);
  const requestedPage = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  const numberFormatter = useMemo(() => new Intl.NumberFormat('es-ES'), []);

  useEffect(() => {
    Promise.all([getShips(), getWeapons()])
      .then(([s, w]) => {
        setShips(s);
        setWeapons(w);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const currentShip = useMemo(
    () => ships.find((s) => s.id === selectedShip) ?? null,
    [ships, selectedShip],
  );

  useEffect(() => {
    document.title = currentShip
      ? `Star Grimoire | ${currentShip.name} · Arcas Estelares`
      : 'Star Grimoire | Arcas Estelares';
  }, [currentShip]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [selectedShip]);

  const updateParams = (
    updates: Record<string, string | null>,
    options: { resetPage?: boolean; replace?: boolean } = {},
  ) => {
    const { resetPage = false, replace = false } = options;
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
        if (resetPage) {
          next.delete('page');
        }
        return next;
      },
      { replace },
    );
  };

  const filteredShips = useMemo(() => {
    if (!shipListSearch.trim()) return ships;
    const search = shipListSearch.toLowerCase();
    return ships.filter((s) => {
      const mfgName = typeof s.manufacturer === 'object' ? s.manufacturer?.name : s.manufacturer;
      return s.name.toLowerCase().includes(search) || Boolean(mfgName && mfgName.toLowerCase().includes(search));
    });
  }, [ships, shipListSearch]);

  const totalPages = Math.ceil(filteredShips.length / itemsPerPage);
  const currentPage = totalPages > 0 ? Math.min(requestedPage, totalPages) : 1;

  const paginatedShips = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredShips.slice(start, start + itemsPerPage);
  }, [filteredShips, currentPage]);

  const currentPurchasePrices = useMemo(
    () => (currentShip ? collectPurchasePrices(currentShip) : []),
    [currentShip],
  );

  const piercingWeapons = useMemo(() => {
    if (!currentShip?.deflection) return [];
    const deflection = currentShip.deflection;
    return weapons.filter((w) => {
      let piercing = false;
      if (w.alpha.physical > 0 && deflection.physical < w.alpha.physical) piercing = true;
      if (w.alpha.energy > 0 && deflection.energy < w.alpha.energy) piercing = true;
      if (!piercing) return false;
      if (weaponSearch && !w.name.toLowerCase().includes(weaponSearch.toLowerCase())) return false;
      return true;
    });
  }, [currentShip, weapons, weaponSearch]);

  const buildShipLink = (shipId: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('id', shipId);
    return `?${next.toString()}`;
  };

  if (loading) {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{ textAlign: 'center', padding: '5rem', fontFamily: 'var(--cinzel-font)', color: 'var(--secondary)' }}
      >
        Sincronizando Archivos de Arcas Estelares…
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Cabecera */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
          marginBottom: '1.5rem',
        }}
      >
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
          <Shield size={32} aria-hidden="true" style={{ color: 'var(--secondary)', flexShrink: 0 }} />
          <DualLabel
            sacred={TERMINOLOGY.arcasEstelares.sacred}
            tactical={TERMINOLOGY.arcasEstelares.tactical}
            size="lg"
            sacredColor="var(--secondary)"
          />
        </h1>
        {currentShip && (
          <button
            type="button"
            onClick={() => updateParams({ id: null })}
            className="btn-secondary"
          >
            Volver al Índice
          </button>
        )}
      </div>

      {!currentShip && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
            <p className="prose-grimoire" style={{ color: 'var(--text-muted)', margin: 0 }}>
              Registro de todos los navíos conocidos. Selecciona un arca para acceder a sus especificaciones técnicas y su vulnerabilidad balística.
            </p>
            <div style={{ position: 'relative', maxWidth: '420px' }}>
              <label htmlFor={shipSearchInputId} className="sr-only">
                Buscar nave o fabricante
              </label>
              <Search
                size={16}
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  left: '0.85rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  pointerEvents: 'none',
                }}
              />
              <input
                id={shipSearchInputId}
                name="ship-search"
                type="text"
                autoComplete="off"
                placeholder="Buscar nave o fabricante…"
                value={shipListSearch}
                onChange={(e) =>
                  updateParams({ search: e.target.value || null }, { resetPage: true, replace: true })
                }
                className="search-input"
                style={{ paddingLeft: '2.4rem' }}
              />
            </div>
          </div>

          {filteredShips.length === 0 ? (
            <div className="surface-monolith" style={{ textAlign: 'center', padding: '3rem' }}>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
                No se hallaron arcas estelares que coincidan con tu búsqueda.
              </p>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => updateParams({ search: null }, { resetPage: true })}
              >
                LIMPIAR BÚSQUEDA
              </button>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                {paginatedShips.map((s) => {
                  const purchasePrices = collectPurchasePrices(s);
                  const validPrices = purchasePrices
                    .map((p) => p.price_buy)
                    .filter((v): v is number => typeof v === 'number' && v > 0);
                  const minUecPrice = validPrices.length > 0 ? Math.min(...validPrices) : null;
                  const imageUrl = s.images?.[0]?.thumbnail_url || s.images?.[0]?.original_url || s.image;
                  const manufacturerName =
                    typeof s.manufacturer === 'object' ? s.manufacturer?.name : s.manufacturer || 'Desconocido';

                  return (
                    <Link
                      key={s.id}
                      to={buildShipLink(s.id)}
                      className="surface-interactive cv-auto hover-primary"
                      style={{
                        padding: 0,
                        overflow: 'hidden',
                        borderTop: '2px solid var(--secondary)',
                        display: 'flex',
                        flexDirection: 'column',
                        textDecoration: 'none',
                        color: 'inherit',
                      }}
                    >
                      <div style={{ width: '100%', height: '150px', background: 'rgba(0,0,0,0.5)', overflow: 'hidden' }}>
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={s.name}
                            width={400}
                            height={225}
                            loading="lazy"
                            decoding="async"
                            referrerPolicy="no-referrer"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '100%',
                              height: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--text-muted)',
                            }}
                          >
                            Sin Imagen
                          </div>
                        )}
                      </div>
                      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                        <div>
                          <h2
                            style={{
                              margin: 0,
                              fontWeight: 'bold',
                              fontSize: '1.15rem',
                              color: 'var(--text-main)',
                              letterSpacing: '1px',
                            }}
                          >
                            {s.name}
                          </h2>
                          <div
                            style={{
                              fontSize: '0.8rem',
                              color: 'var(--accent-silver)',
                              textTransform: 'uppercase',
                              letterSpacing: '1px',
                              marginTop: '0.2rem',
                            }}
                          >
                            {manufacturerName}
                          </div>
                        </div>

                        <div
                          style={{
                            marginTop: 'auto',
                            paddingTop: '1rem',
                            borderTop: '1px solid rgba(255,255,255,0.1)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '0.9rem',
                          }}
                        >
                          <div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Valor USD</div>
                            <div className="accent-gold tabular-nums">
                              {s.msrp ? `$${numberFormatter.format(s.msrp)}` : 'N/A'}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Valor aUEC</div>
                            <div className="tabular-nums" style={{ color: 'var(--secondary)' }}>
                              {minUecPrice !== null ? numberFormatter.format(minUecPrice) : 'N/A'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>

              <nav aria-label="Paginación de Arcas Estelares">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={(page) =>
                    updateParams({ page: page > 1 ? String(page) : null }, { resetPage: false })
                  }
                />
              </nav>
            </>
          )}
        </>
      )}

      {currentShip && (
        <div className="surface-monolith">
          {(currentShip.images?.[0]?.original_url || currentShip.image) && (
            <div
              style={{
                width: '100%',
                height: '300px',
                marginBottom: '1.5rem',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '1px solid var(--secondary)',
              }}
            >
              <img
                src={currentShip.images?.[0]?.original_url || currentShip.image}
                alt={currentShip.name}
                width={800}
                height={400}
                fetchPriority="high"
                referrerPolicy="no-referrer"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          )}
          <h2 style={{ color: 'var(--secondary)', marginBottom: '0.2rem' }}>{currentShip.name}</h2>
          <p
            style={{
              color: 'var(--accent-silver)',
              fontSize: '0.95rem',
              fontFamily: 'var(--cinzel-font)',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              margin: '0 0 1.5rem',
            }}
          >
            {typeof currentShip.manufacturer === 'object'
              ? currentShip.manufacturer?.name
              : currentShip.manufacturer || 'Desconocido'}
          </p>
          {currentShip.description_lore && (
            <p
              className="prose-grimoire"
              style={{
                fontSize: '0.95rem',
                color: 'var(--text-muted)',
                fontStyle: 'italic',
                marginBottom: '1.5rem',
                borderLeft: '2px solid var(--secondary)',
                paddingLeft: '1rem',
              }}
            >
              {currentShip.description_lore}
            </p>
          )}

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <Link
              to={`/codice/tecnomilagros?search=${encodeURIComponent(currentShip.name)}`}
              className="btn-primary"
              style={{
                background: 'var(--secondary)',
                color: '#0a0303',
                fontSize: '0.8rem',
                padding: '0.55rem 1rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <BookOpen size={16} aria-hidden="true" /> Buscar Tecnomilagro
            </Link>
            <a
              href={`https://erkul.games/ship/${(currentShip.className || currentShip.name).toLowerCase().replace(/[^a-z0-9]+/g, '_')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
              style={{
                fontSize: '0.8rem',
                padding: '0.55rem 1rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <ExternalLink size={16} aria-hidden="true" /> Simular Equipamiento en Erkul
            </a>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>DEFLEXIÓN FÍSICA</div>
              <div className="tabular-nums" style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--status-warn)' }}>
                {numberFormatter.format(currentShip.deflection?.physical || 0)}
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>DEFLEXIÓN LÁSER</div>
              <div className="accent-rsi tabular-nums" style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                {numberFormatter.format(currentShip.deflection?.energy || 0)}
              </div>
            </div>
          </div>

          {currentShip.msrp && (
            <div style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>
              Valor Pledge:{' '}
              <span className="accent-gold tabular-nums">${numberFormatter.format(currentShip.msrp)} USD</span>
            </div>
          )}

          {currentPurchasePrices.length > 0 && (
            <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem', marginBottom: '1.5rem' }}>
              <h3 style={{ color: 'var(--text-main)', marginBottom: '0.6rem', fontSize: '0.95rem' }}>
                Disponibilidad In-Game (LIVE):
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {currentPurchasePrices.map((price, idx) => (
                  <div key={`${price.terminal_name}-${idx}`} style={{ background: 'rgba(0,0,0,0.2)', padding: '0.5rem 0.75rem', borderRadius: '4px' }}>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>
                      <strong>Lugar:</strong> {price.terminal_name}{' '}
                      {price.starmap_location
                        ? `(${price.starmap_location.name}, ${price.starmap_location.star_system_name})`
                        : ''}
                    </p>
                    <p className="tabular-nums" style={{ margin: 0, fontSize: '0.9rem', color: 'var(--secondary)' }}>
                      <strong>Costo:</strong>{' '}
                      {price.price_buy !== null ? `${numberFormatter.format(price.price_buy)} aUEC` : 'N/A'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              marginBottom: '2rem',
              fontSize: '0.85rem',
            }}
          >
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.8rem', borderRadius: '4px' }}>
              <div style={{ color: 'var(--text-muted)' }}>Carga (SCU)</div>
              <div className="tabular-nums">{numberFormatter.format(currentShip.cargo_capacity || 0)}</div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.8rem', borderRadius: '4px' }}>
              <div style={{ color: 'var(--text-muted)' }}>Velocidad (SCM / MAX)</div>
              <div className="tabular-nums">
                {currentShip.speed?.scm || 0} / {currentShip.speed?.max || 0} m/s
              </div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.8rem', borderRadius: '4px' }}>
              <div style={{ color: 'var(--text-muted)' }}>Tanques (Q / H)</div>
              <div className="tabular-nums">
                {currentShip.fuel?.quantum || 0} / {currentShip.fuel?.hydrogen || 0}
              </div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.8rem', borderRadius: '4px' }}>
              <div style={{ color: 'var(--text-muted)' }}>Dimensiones (L × W × H)</div>
              <div className="tabular-nums">
                {currentShip.dimensions?.length || 0} × {currentShip.dimensions?.width || 0} ×{' '}
                {currentShip.dimensions?.height || 0} m
              </div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.8rem', borderRadius: '4px' }}>
              <div style={{ color: 'var(--text-muted)' }}>Armas y Torretas</div>
              <div className="tabular-nums">
                {currentShip.component_sizes?.weapon
                  ? String(currentShip.component_sizes.weapon)
                      .split(',')
                      .map((s: string) => {
                        const parts = s.trim().split('x');
                        if (parts.length === 3) return `${parts[0]}×${parts[1]} Size ${parts[2]}`;
                        if (parts.length === 2) return `${parts[0]} Size ${parts[1]}`;
                        return s;
                      })
                      .join(', ')
                  : '?'}
              </div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.8rem', borderRadius: '4px' }}>
              <div style={{ color: 'var(--text-muted)' }}>Tamaño Máx Escudos</div>
              <div className="tabular-nums">{currentShip.component_sizes?.shield || '?'}</div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap',
              marginBottom: '1rem',
              borderBottom: '1px solid var(--primary)',
              paddingBottom: '0.5rem',
            }}
          >
            <h3 style={{ color: 'var(--primary)', margin: 0, fontSize: '1rem' }}>
              ARMAS QUE PERFORAN ESTE BLINDAJE
            </h3>
            <div>
              <label htmlFor={weaponSearchInputId} className="sr-only">
                Filtrar armas perforantes por nombre
              </label>
              <input
                id={weaponSearchInputId}
                name="piercing-weapon-search"
                type="text"
                autoComplete="off"
                placeholder="Buscar arma…"
                value={weaponSearch}
                onChange={(e) => setWeaponSearch(e.target.value)}
                className="search-input"
                style={{ padding: '0.45rem 0.75rem', width: '220px' }}
              />
            </div>
          </div>
          {currentShip.deflection ? (
            <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {piercingWeapons.slice(0, 50).map((w) => (
                <Link
                  to={`/codice/armamentos?id=${w.id}`}
                  key={w.id}
                  style={{
                    background: 'rgba(196,30,58,0.1)',
                    padding: '0.5rem 1rem',
                    borderRadius: '4px',
                    borderLeft: '3px solid var(--primary)',
                    textDecoration: 'none',
                    color: '#fff',
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '1rem',
                  }}
                >
                  <div className="tabular-nums" style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                    {w.name} (S{w.size})
                  </div>
                  <div className="tabular-nums" style={{ fontSize: '0.8rem', color: 'var(--status-warn)', flexShrink: 0 }}>
                    Alpha:{' '}
                    {w.alpha.physical > 0
                      ? `${numberFormatter.format(w.alpha.physical)} Fis`
                      : `${numberFormatter.format(w.alpha.energy)} Ene`}
                  </div>
                </Link>
              ))}
              {piercingWeapons.length > 50 && (
                <div className="tabular-nums" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>
                  Y {piercingWeapons.length - 50} armas más…
                </div>
              )}
              {piercingWeapons.length === 0 && (
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', padding: '1rem' }}>
                  El blindaje resiste todo el arsenal conocido en la base de datos.
                </div>
              )}
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Esta arca no cuenta con estadísticas de deflexión (probablemente carece de escudos o blindaje registrado).
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CodexShips;

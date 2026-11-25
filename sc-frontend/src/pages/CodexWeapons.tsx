import React, { useEffect, useId, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getShips, getWeapons } from '../api/client';
import type { Ship, VehicleWeapon } from '../types';
import { BookOpen, Crosshair, Search } from 'lucide-react';
import DualLabel from '../components/DualLabel';
import Pagination from '../components/Pagination';
import { TERMINOLOGY } from '../constants/terminology';

const CodexWeapons: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const baseId = useId();
  const weaponSearchId = `${baseId}-weapon-search`;
  const typeSelectId = `${baseId}-weapon-type`;
  const sizeSelectId = `${baseId}-weapon-size`;
  const shipSearchId = `${baseId}-ship-search`;

  const [ships, setShips] = useState<Ship[]>([]);
  const [weapons, setWeapons] = useState<VehicleWeapon[]>([]);
  const [loading, setLoading] = useState(true);
  const [shipSearch, setShipSearch] = useState('');

  const itemsPerPage = 24;
  const selectedWeapon = searchParams.get('id') ?? '';
  const weaponSearch = searchParams.get('search') ?? '';
  const typeFilter = searchParams.get('type') ?? '';
  const sizeFilter = searchParams.get('size') ?? '';
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

  const currentWeapon = useMemo(
    () => weapons.find((w) => w.id === selectedWeapon) ?? null,
    [weapons, selectedWeapon],
  );

  useEffect(() => {
    document.title = currentWeapon
      ? `Star Grimoire | ${currentWeapon.name} · Armamentos`
      : 'Star Grimoire | Armamentos';
  }, [currentWeapon]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [selectedWeapon]);

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

  const uniqueTypes = useMemo(
    () => Array.from(new Set(weapons.map((w) => w.type).filter((t): t is string => Boolean(t)))).sort(),
    [weapons],
  );

  const uniqueSizes = useMemo(
    () => Array.from(new Set(weapons.map((w) => w.size).filter((s) => s > 0))).sort((a, b) => a - b),
    [weapons],
  );

  const filteredWeapons = useMemo(() => {
    const q = weaponSearch.toLowerCase();
    return weapons.filter((w) => {
      if (q && !w.name.toLowerCase().includes(q)) return false;
      if (typeFilter && w.type !== typeFilter) return false;
      if (sizeFilter && w.size.toString() !== sizeFilter) return false;
      return true;
    });
  }, [weapons, weaponSearch, typeFilter, sizeFilter]);

  const totalPages = Math.ceil(filteredWeapons.length / itemsPerPage);
  const currentPage = totalPages > 0 ? Math.min(requestedPage, totalPages) : 1;

  const paginatedWeapons = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredWeapons.slice(start, start + itemsPerPage);
  }, [filteredWeapons, currentPage]);

  const vulnerableShips = useMemo(() => {
    if (!currentWeapon) return [];
    const q = shipSearch.toLowerCase();
    return ships.filter((s) => {
      if (!s.deflection) return false;
      let vulnerable = false;
      if (currentWeapon.alpha.physical > 0 && s.deflection.physical < currentWeapon.alpha.physical) {
        vulnerable = true;
      }
      if (currentWeapon.alpha.energy > 0 && s.deflection.energy < currentWeapon.alpha.energy) {
        vulnerable = true;
      }
      if (!vulnerable) return false;
      if (q && !s.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [currentWeapon, ships, shipSearch]);

  const buildWeaponLink = (weaponId: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('id', weaponId);
    return `?${next.toString()}`;
  };

  if (loading) {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{ textAlign: 'center', padding: '5rem', fontFamily: 'var(--cinzel-font)', color: 'var(--secondary)' }}
      >
        Sincronizando Balística…
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
          <Crosshair size={32} aria-hidden="true" style={{ color: 'var(--primary)', flexShrink: 0 }} />
          <DualLabel
            sacred={TERMINOLOGY.armamentos.sacred}
            tactical={TERMINOLOGY.armamentos.tactical}
            size="lg"
            sacredColor="var(--primary)"
          />
        </h1>
        {currentWeapon && (
          <button
            type="button"
            onClick={() => updateParams({ id: null })}
            className="btn-secondary"
            style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
          >
            Volver al Índice
          </button>
        )}
      </div>

      {!currentWeapon && (
        <>
          <p className="prose-grimoire" style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
            Registro del poder de fuego vehicular. Selecciona un armamento para visualizar sus estadísticas de daño y qué navíos puede perforar.
          </p>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 250px', position: 'relative' }}>
              <label htmlFor={weaponSearchId} className="sr-only">
                Buscar arma por nombre
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
                id={weaponSearchId}
                name="weapon-search"
                type="text"
                autoComplete="off"
                placeholder="Buscar arma por nombre…"
                value={weaponSearch}
                onChange={(e) =>
                  updateParams({ search: e.target.value || null }, { resetPage: true, replace: true })
                }
                className="search-input"
                style={{ paddingLeft: '2.4rem' }}
              />
            </div>

            <div style={{ minWidth: '180px' }}>
              <label htmlFor={typeSelectId} className="sr-only">
                Filtrar por tipo de arma
              </label>
              <select
                id={typeSelectId}
                name="weapon-type"
                value={typeFilter}
                onChange={(e) => updateParams({ type: e.target.value || null }, { resetPage: true })}
                className="select-filter"
              >
                <option value="">Cualquier Tipo</option>
                {uniqueTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ minWidth: '180px' }}>
              <label htmlFor={sizeSelectId} className="sr-only">
                Filtrar por tamaño de arma
              </label>
              <select
                id={sizeSelectId}
                name="weapon-size"
                value={sizeFilter}
                onChange={(e) => updateParams({ size: e.target.value || null }, { resetPage: true })}
                className="select-filter"
              >
                <option value="">Cualquier Tamaño</option>
                {uniqueSizes.map((s) => (
                  <option key={s} value={s.toString()}>
                    Tamaño {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {filteredWeapons.length === 0 ? (
            <div className="surface-monolith" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <p style={{ marginBottom: '1rem' }}>No se encontraron armas con esos filtros.</p>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => updateParams({ search: null, type: null, size: null }, { resetPage: true })}
              >
                LIMPIAR FILTROS
              </button>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
                {paginatedWeapons.map((w) => (
                  <Link
                    key={w.id}
                    to={buildWeaponLink(w.id)}
                    className="surface-interactive cv-auto hover-primary"
                    style={{
                      display: 'block',
                      textDecoration: 'none',
                      color: 'inherit',
                      padding: '1rem',
                      borderTop: '2px solid var(--primary)',
                    }}
                  >
                    <h2
                      className="tabular-nums"
                      style={{
                        margin: '0 0 0.5rem',
                        fontWeight: 'bold',
                        fontSize: '1.05rem',
                        color: 'var(--text-main)',
                        letterSpacing: '1px',
                      }}
                    >
                      [S{w.size}] {w.name}
                    </h2>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                      {w.type || 'Arma'}
                    </div>
                    <div className="tabular-nums" style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      Alpha:{' '}
                      {w.alpha.physical > 0
                        ? `${numberFormatter.format(w.alpha.physical)} Fis`
                        : `${numberFormatter.format(w.alpha.energy)} Ene`}
                    </div>
                    <div className="tabular-nums" style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      DPS: {numberFormatter.format(w.dps || 0)}
                    </div>
                  </Link>
                ))}
              </div>

              <nav aria-label="Paginación de Armamentos">
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

      {currentWeapon && (
        <div className="surface-monolith">
          <h2 className="tabular-nums" style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>
            {currentWeapon.name} (S{currentWeapon.size})
          </h2>
          {currentWeapon.description_lore && (
            <p
              className="prose-grimoire"
              style={{
                fontSize: '0.9rem',
                color: 'var(--text-muted)',
                fontStyle: 'italic',
                marginBottom: '1.5rem',
                borderLeft: '2px solid var(--primary)',
                paddingLeft: '1rem',
              }}
            >
              {currentWeapon.description_lore}
            </p>
          )}

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <Link
              to={`/codice/tecnomilagros?search=${encodeURIComponent(currentWeapon.name)}`}
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
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>DAÑO ALPHA FÍSICO</div>
              <div className="tabular-nums" style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--status-warn)' }}>
                {numberFormatter.format(currentWeapon.alpha.physical)}
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>DAÑO ALPHA LÁSER</div>
              <div className="accent-rsi tabular-nums" style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                {numberFormatter.format(currentWeapon.alpha.energy)}
              </div>
            </div>
          </div>

          {currentWeapon.uex_prices && currentWeapon.uex_prices.length > 0 && (
            <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem', marginBottom: '1.5rem' }}>
              <h3 style={{ color: 'var(--text-main)', marginBottom: '0.6rem', fontSize: '0.95rem' }}>
                Disponibilidad In-Game (LIVE):
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {currentWeapon.uex_prices.map((price, idx) => (
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
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '1rem',
              marginBottom: '2rem',
              fontSize: '0.85rem',
            }}
          >
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.8rem', borderRadius: '4px' }}>
              <div style={{ color: 'var(--text-muted)' }}>Tipo de Arma</div>
              <div>{currentWeapon.type || 'Desconocido'}</div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.8rem', borderRadius: '4px' }}>
              <div style={{ color: 'var(--text-muted)' }}>Daño por Segundo (DPS)</div>
              <div className="tabular-nums">{numberFormatter.format(currentWeapon.dps || 0)}</div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.8rem', borderRadius: '4px' }}>
              <div style={{ color: 'var(--text-muted)' }}>Cadencia (RPM)</div>
              <div className="tabular-nums">{numberFormatter.format(currentWeapon.fire_rate || 0)}</div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.8rem', borderRadius: '4px' }}>
              <div style={{ color: 'var(--text-muted)' }}>Velocidad del Proyectil</div>
              <div className="tabular-nums">{numberFormatter.format(currentWeapon.projectile_speed || 0)} m/s</div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.8rem', borderRadius: '4px' }}>
              <div style={{ color: 'var(--text-muted)' }}>Alcance Máximo</div>
              <div className="tabular-nums">{numberFormatter.format(currentWeapon.range || 0)} m</div>
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
              borderBottom: '1px solid var(--accent-silver)',
              paddingBottom: '0.5rem',
            }}
          >
            <h3 style={{ color: 'var(--accent-silver)', margin: 0, fontSize: '1rem' }}>
              NAVES VULNERABLES (Pérdida de Integridad)
            </h3>
            <div>
              <label htmlFor={shipSearchId} className="sr-only">
                Filtrar naves vulnerables por nombre
              </label>
              <input
                id={shipSearchId}
                name="vulnerable-ship-search"
                type="text"
                autoComplete="off"
                placeholder="Buscar nave…"
                value={shipSearch}
                onChange={(e) => setShipSearch(e.target.value)}
                className="search-input"
                style={{ padding: '0.45rem 0.75rem', width: '220px' }}
              />
            </div>
          </div>
          <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {vulnerableShips.slice(0, 50).map((s) => (
              <Link
                to={`/codice/arcas-estelares?id=${s.id}`}
                key={s.id}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  padding: '0.5rem 1rem',
                  borderRadius: '4px',
                  borderLeft: '3px solid var(--accent-silver)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  textDecoration: 'none',
                  color: '#fff',
                }}
              >
                <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{s.name}</div>
                <div className="tabular-nums" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                  Deflexión:{' '}
                  {numberFormatter.format(
                    (currentWeapon.alpha.physical > 0 ? s.deflection?.physical : s.deflection?.energy) ?? 0,
                  )}
                </div>
              </Link>
            ))}
            {vulnerableShips.length > 50 && (
              <div className="tabular-nums" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>
                Y {vulnerableShips.length - 50} navíos más…
              </div>
            )}
            {vulnerableShips.length === 0 && (
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', padding: '1rem' }}>
                La potencia de este armamento no es suficiente para atravesar el blindaje de las naves registradas.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CodexWeapons;

import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { getResources } from '../api/client';
import { ArrowLeft, Database, Locate } from 'lucide-react';
import DualLabel from '../components/DualLabel';
import Pagination from '../components/Pagination';
import type { Resource } from '../types';

function matchesLocation(locSystem: string | undefined, locName: string | undefined, systemParam: string, nameParam: string): boolean {
  const cleanName = nameParam.toLowerCase().split('(')[0].trim();
  const cleanSystem = systemParam.toLowerCase().trim();
  const lName = locName?.toLowerCase() || '';
  const lSystem = locSystem?.toLowerCase() || '';
  return lSystem.includes(cleanSystem) && (lName.includes(cleanName) || cleanName.includes(lName));
}

const LocationDetail: React.FC = () => {
  const { system, name } = useParams<{ system: string; name: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const itemsPerPage = 10;

  const rawPage = Number.parseInt(searchParams.get('page') ?? '1', 10);
  const requestedPage = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const numberFormatter = useMemo(() => new Intl.NumberFormat('es-ES'), []);

  useEffect(() => {
    getResources().then(setResources).finally(() => setLoading(false));
  }, []);

  const locationResources = useMemo(() => {
    if (!name || !system) return [];
    return resources.filter((r) =>
      r.locationsDetail?.some((l) => matchesLocation(l.system, l.name, system, name)),
    );
  }, [resources, system, name]);

  const locationInfo = useMemo(() => {
    if (!name || !system) return { system: system || '', name: name || '', type: 'N/A' };
    const sample = locationResources[0]?.locationsDetail?.find((l) =>
      matchesLocation(l.system, l.name, system, name),
    );
    return sample || { system, name, type: 'N/A' };
  }, [locationResources, system, name]);

  useEffect(() => {
    document.title = locationInfo.name
      ? `Star Grimoire | ${locationInfo.name} (${locationInfo.system})`
      : 'Star Grimoire | Ubicación';
  }, [locationInfo.name, locationInfo.system]);

  const totalPages = Math.ceil(locationResources.length / itemsPerPage);
  const currentPage = totalPages > 0 ? Math.min(requestedPage, totalPages) : 1;

  const paginatedResources = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return locationResources.slice(start, start + itemsPerPage);
  }, [locationResources, currentPage]);

  const handlePageChange = (page: number) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (page > 1) next.set('page', String(page));
      else next.delete('page');
      return next;
    });
  };

  if (loading) {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{ textAlign: 'center', padding: '5rem', fontFamily: 'var(--cinzel-font)', color: 'var(--secondary)' }}
      >
        CARGANDO UBICACIÓN…
      </div>
    );
  }

  if (locationResources.length === 0) {
    return <div style={{ textAlign: 'center', padding: '5rem' }}>UBICACIÓN O RECURSOS NO ENCONTRADOS</div>;
  }

  return (
    <div style={{ padding: '0 2rem' }}>
      <Link
        to="/codice/ofrendas"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', textDecoration: 'none', marginBottom: '2rem' }}
      >
        <ArrowLeft size={16} aria-hidden="true" /> VOLVER AL LOCALIZADOR
      </Link>

      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontSize: '0.95rem', color: 'var(--primary)', marginBottom: '0.5rem', fontFamily: 'var(--cinzel-font)', letterSpacing: '2px' }}>
          SISTEMA {locationInfo.system?.toUpperCase()}
        </div>
        <h1 style={{ margin: '0 0 0.75rem' }}>
          <DualLabel
            sacred={locationInfo.name || name || 'Ubicación'}
            tactical={`Sistema ${locationInfo.system} · ${locationInfo.type}`}
            size="lg"
            sacredColor="var(--accent-rsi)"
          />
        </h1>
        <span
          style={{
            fontSize: '0.8rem',
            background: 'rgba(212, 175, 55, 0.1)',
            color: 'var(--secondary)',
            padding: '0.4rem 1rem',
            borderRadius: '40px',
            border: '1px solid currentColor',
            display: 'inline-block',
          }}
        >
          TIPO: {locationInfo.type?.toUpperCase()}
        </span>
      </div>

      <div className="surface-monolith" style={{ marginTop: '2rem' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '2.5rem' }}>
          <Database className="accent-rsi" size={32} aria-hidden="true" />
          <span>
            RECURSOS DETECTADOS <span className="tabular-nums">({locationResources.length})</span>
          </span>
        </h2>

        <div className="grid-layout">
          {paginatedResources.map((resource, idx) => {
            const matchedLoc =
              system && name
                ? resource.locationsDetail?.find((l) => matchesLocation(l.system, l.name, system, name))
                : undefined;

            return (
              <Link
                key={resource.id || idx}
                to={`/recurso/${resource.id}`}
                className="surface-interactive cv-auto"
                style={{
                  textDecoration: 'none',
                  color: 'inherit',
                  borderLeft: '3px solid var(--primary)',
                  display: 'block',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <h3 className="accent-rsi" style={{ fontSize: '1.3rem', margin: 0 }}>
                    {resource.name}
                  </h3>
                  <span
                    style={{
                      fontSize: '0.65rem',
                      color: 'var(--primary)',
                      border: '1px solid currentColor',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      flexShrink: 0,
                    }}
                  >
                    {resource.type?.toUpperCase()}
                  </span>
                </div>
                <div
                  style={{
                    marginTop: '1.5rem',
                    padding: '0.8rem',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>EMISIÓN BASE</div>
                    <div className="accent-amber tabular-nums" style={{ fontWeight: 'bold' }}>
                      {numberFormatter.format(resource.baseEmission || 4000)} sc
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>RAREZA</div>
                    <div style={{ fontWeight: 'bold' }}>{resource.rarity?.toUpperCase() || 'COMMON'}</div>
                  </div>
                </div>
                <div
                  style={{
                    marginTop: '1rem',
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <Locate size={12} aria-hidden="true" />
                  <span>CLUMPING EN ESTA ZONA:</span>
                  <span className="tabular-nums" style={{ color: 'var(--primary)', marginLeft: '0.25rem' }}>
                    {matchedLoc?.clustering || '1 item'}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        <nav aria-label="Paginación de Recursos en Ubicación">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </nav>
      </div>
    </div>
  );
};

export default LocationDetail;

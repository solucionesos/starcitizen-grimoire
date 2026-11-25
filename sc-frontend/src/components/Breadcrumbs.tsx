import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home, Trash2 } from 'lucide-react';
import { PATH_LABELS, TERMINOLOGY } from '../constants/terminology';

interface BreadcrumbItem {
  label: string;
  path: string;
}

interface LocationBreadcrumbState {
  breadcrumbLabel?: string;
  name?: string;
}

function readStoredHistory(): BreadcrumbItem[] {
  try {
    const stored = sessionStorage.getItem('breadcrumbHistory');
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is BreadcrumbItem =>
        Boolean(item) &&
        typeof item === 'object' &&
        typeof (item as BreadcrumbItem).label === 'string' &&
        typeof (item as BreadcrumbItem).path === 'string',
    );
  } catch {
    return [];
  }
}

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function resolveLabel(pathname: string, search: string, state: unknown): string {
  const navState =
    state && typeof state === 'object' ? (state as LocationBreadcrumbState) : undefined;
  if (navState?.breadcrumbLabel) return navState.breadcrumbLabel;

  const params = new URLSearchParams(search);

  if (pathname.startsWith('/hermano/')) {
    const rawHandle = pathname.slice('/hermano/'.length);
    return `HERMANO: ${safeDecodeURIComponent(rawHandle)}`;
  }

  if (pathname.startsWith('/recurso/')) {
    const rawId = pathname.slice('/recurso/'.length);
    return `OFRENDA: ${safeDecodeURIComponent(rawId)}`;
  }

  if (pathname.startsWith('/locacion/')) {
    const parts = pathname.split('/');
    return `RITO: ${safeDecodeURIComponent(parts[3] || 'LOCALIZACIÓN')}`;
  }

  if (pathname === '/edictos') {
    const tab = params.get('tab');
    if (tab === 'designios') return TERMINOLOGY.designios.sacred.toUpperCase();
    if (tab === 'cruzadas') return TERMINOLOGY.cruzadas.sacred.toUpperCase();
    if (tab === 'calendario') return TERMINOLOGY.calendario.sacred.toUpperCase();
  }

  if (pathname === '/datavelo') {
    const tab = params.get('tab');
    if (tab === 'bovedas') return `DATAVELO · ${TERMINOLOGY.bovedas.sacred.toUpperCase()}`;
    if (tab === 'wikelo') return `DATAVELO · ${TERMINOLOGY.wikelo.sacred.toUpperCase()}`;
    if (tab === 'comunicaciones') return `DATAVELO · ${TERMINOLOGY.comunicaciones.sacred.toUpperCase()}`;
    if (tab === 'comercio') return `DATAVELO · ${TERMINOLOGY.comercio.sacred.toUpperCase()}`;
  }

  if (pathname === '/divinitatus') {
    const tab = params.get('tab');
    if (tab === 'rituales') return TERMINOLOGY.rituales.sacred.toUpperCase();
    if (tab === 'cronicas') return TERMINOLOGY.cronicas.sacred.toUpperCase();
  }

  if (params.get('id') && navState?.name) {
    return navState.name;
  }

  const termEntry = PATH_LABELS[pathname];
  if (termEntry) {
    return termEntry.sacred.toUpperCase();
  }

  return 'REGISTRO';
}

const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const [history, setHistory] = useState<BreadcrumbItem[]>([]);

  useEffect(() => {
    let active = true;
    const currentHistory = readStoredHistory();
    const path = location.pathname + location.search;
    const label = resolveLabel(location.pathname, location.search, location.state);

    const existingIndex = currentHistory.findIndex((item) => item.path === path);
    const nextHistory =
      existingIndex !== -1
        ? currentHistory.slice(0, existingIndex + 1)
        : [...currentHistory, { label, path }];

    while (nextHistory.length > 8) {
      nextHistory.shift();
    }

    try {
      sessionStorage.setItem('breadcrumbHistory', JSON.stringify(nextHistory));
    } catch {
      // Ignore storage quota / privacy mode errors
    }

    Promise.resolve().then(() => {
      if (active) {
        setHistory(nextHistory);
      }
    });

    return () => {
      active = false;
    };
  }, [location]);

  if (history.length <= 1 && location.pathname === '/') return null;

  const clearHistory = () => {
    const reset: BreadcrumbItem[] = [{ label: 'INICIO', path: '/' }];
    setHistory(reset);
    try {
      sessionStorage.setItem('breadcrumbHistory', JSON.stringify(reset));
    } catch {
      // Ignore storage errors
    }
  };

  return (
    <nav
      aria-label="Ruta de navegación"
      style={{
        padding: '0.8rem 2rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        flexWrap: 'wrap',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        background: 'rgba(0,0,0,0.2)',
      }}
    >
      <Link
        to="/"
        onClick={clearHistory}
        aria-label="Ir al inicio"
        style={{
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.3rem',
          textDecoration: 'none',
        }}
        className="hover-underline"
      >
        <Home size={14} aria-hidden="true" />
      </Link>

      {history.map((item, index) => {
        const isLast = index === history.length - 1;
        return (
          <React.Fragment key={`${index}-${item.path}`}>
            <ChevronRight size={14} aria-hidden="true" style={{ opacity: 0.3 }} />
            <Link
              to={item.path}
              aria-current={isLast ? 'page' : undefined}
              style={{
                color: isLast ? 'var(--primary)' : 'inherit',
                textDecoration: 'none',
                fontSize: '0.75rem',
                fontWeight: isLast ? 'bold' : 'normal',
                maxWidth: '180px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              className="hover-underline"
              title={item.label}
            >
              {item.label}
            </Link>
          </React.Fragment>
        );
      })}

      {history.length > 2 && (
        <button
          type="button"
          onClick={clearHistory}
          aria-label="Purificar rastro de navegación"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            fontSize: '0.65rem',
          }}
          className="hover-primary"
        >
          <Trash2 size={12} aria-hidden="true" /> PURIFICAR RASTRO
        </button>
      )}
    </nav>
  );
};

export default Breadcrumbs;

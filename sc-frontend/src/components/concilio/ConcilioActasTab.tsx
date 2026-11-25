import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { BookOpen, Loader2, RefreshCw, Search, ShieldAlert } from 'lucide-react';
import { getCouncilAuditLogs } from '../../api/client';
import type { CouncilAuditLog } from '../../types';
import DualLabel from '../DualLabel';
import {
  AUDIT_ACTION_META,
  extractApiError,
  formatSqliteAbyssalTimestamp,
  summarizeAuditDetails,
} from './concilioHelpers';

const LIMIT_OPTIONS = [50, 100, 250, 500] as const;

function getToneColor(
  tone: 'gold' | 'crimson' | 'ok' | 'rsi' | 'conclave' | 'muted',
): string {
  switch (tone) {
    case 'gold':
      return 'var(--secondary)';
    case 'crimson':
      return '#fca5a5';
    case 'ok':
      return 'var(--status-ok)';
    case 'rsi':
      return 'var(--accent-rsi)';
    case 'conclave':
      return 'var(--accent-conclave)';
    default:
      return 'var(--text-muted)';
  }
}

const ConcilioActasTab: React.FC = () => {
  const filterPrefix = useId();

  const [logs, setLogs] = useState<CouncilAuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [actionType, setActionType] = useState<string>('');
  const [limit, setLimit] = useState<number>(100);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const fetchLogs = useCallback(async (selectedAction: string, selectedLimit: number) => {
    try {
      const res = await getCouncilAuditLogs({
        action_type: selectedAction || undefined,
        limit: selectedLimit,
      });
      setLogs(res.logs);
      setError(null);
    } catch (err: unknown) {
      setError(extractApiError(err, 'No se pudo consultar el Libro de Actas.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const res = await getCouncilAuditLogs({
          action_type: actionType || undefined,
          limit,
        });
        if (!active) return;
        setLogs(res.logs);
        setError(null);
      } catch (err: unknown) {
        if (!active) return;
        setError(extractApiError(err, 'No se pudo consultar el Libro de Actas.'));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [actionType, limit]);

  const filteredLogs = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter((entry) => {
      const actionLabel = AUDIT_ACTION_META[entry.action_type]?.label ?? entry.action_type;
      return (
        (entry.actor_name ?? '').toLowerCase().includes(q) ||
        (entry.actor_cargo ?? '').toLowerCase().includes(q) ||
        (entry.target_name ?? '').toLowerCase().includes(q) ||
        entry.action_type.toLowerCase().includes(q) ||
        actionLabel.toLowerCase().includes(q) ||
        summarizeAuditDetails(entry.details).toLowerCase().includes(q)
      );
    });
  }, [logs, searchTerm]);

  return (
    <section className="surface-monolith" style={{ padding: '1.5rem' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <BookOpen size={20} aria-hidden="true" style={{ color: 'var(--secondary)' }} />
          <h2 style={{ margin: 0 }}>
            <DualLabel
              sacred="LIBRO DE ACTAS DEL CONCILIO"
              tactical={`Historial Inmutable de Auditoría (${filteredLogs.length} registros)`}
              size="md"
            />
          </h2>
        </div>

        <button
          type="button"
          className="btn-secondary"
          disabled={loading}
          onClick={() => {
            setLoading(true);
            void fetchLogs(actionType, limit);
          }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
        >
          <RefreshCw size={14} className={loading ? 'spin' : undefined} aria-hidden="true" />
          Actualizar Actas
        </button>
      </div>

      {/* Filters */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
          gap: '0.8rem',
          marginBottom: '1.25rem',
        }}
      >
        <div>
          <label
            htmlFor={`${filterPrefix}-search`}
            style={{ display: 'block', fontSize: '0.78rem', color: 'var(--accent-silver)', marginBottom: '0.25rem' }}
          >
            Buscar en Actas
          </label>
          <div style={{ position: 'relative' }}>
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
              id={`${filterPrefix}-search`}
              type="text"
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Actor, hermano afectado, detalle…"
              spellCheck={false}
              autoComplete="off"
              style={{ paddingLeft: '2.3rem' }}
            />
          </div>
        </div>

        <div>
          <label
            htmlFor={`${filterPrefix}-action`}
            style={{ display: 'block', fontSize: '0.78rem', color: 'var(--accent-silver)', marginBottom: '0.25rem' }}
          >
            Tipo de Decreto
          </label>
          <select
            id={`${filterPrefix}-action`}
            className="select-filter"
            value={actionType}
            onChange={(e) => {
              setLoading(true);
              setActionType(e.target.value);
            }}
          >
            <option value="">Todas las acciones</option>
            {Object.entries(AUDIT_ACTION_META).map(([key, meta]) => (
              <option key={key} value={key}>
                {meta.label} ({key})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor={`${filterPrefix}-limit`}
            style={{ display: 'block', fontSize: '0.78rem', color: 'var(--accent-silver)', marginBottom: '0.25rem' }}
          >
            Límite
          </label>
          <select
            id={`${filterPrefix}-limit`}
            className="select-filter"
            value={limit}
            onChange={(e) => {
              setLoading(true);
              setLimit(Number(e.target.value));
            }}
          >
            {LIMIT_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                Últimas {opt}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && logs.length === 0 ? (
        <div style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
          <Loader2
            size={28}
            className="spin"
            aria-hidden="true"
            style={{ color: 'var(--secondary)', marginBottom: '0.6rem' }}
          />
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>
            Leyendo actas del Concilio…
          </p>
        </div>
      ) : error ? (
        <div
          style={{
            padding: '1.25rem',
            borderRadius: '4px',
            border: '1px solid rgba(196, 30, 58, 0.45)',
            background: 'rgba(196, 30, 58, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <ShieldAlert size={20} aria-hidden="true" style={{ color: 'var(--primary)' }} />
            <span style={{ color: '#fca5a5' }}>{error}</span>
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setLoading(true);
              void fetchLogs(actionType, limit);
            }}
          >
            Reintentar
          </button>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
          <p style={{ margin: '0 0 0.8rem' }}>
            No hay actas que coincidan con los criterios actuales.
          </p>
          {(actionType || searchTerm) && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setActionType('');
                setSearchTerm('');
              }}
            >
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.88rem',
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: '1px solid rgba(212, 175, 55, 0.3)',
                  textAlign: 'left',
                  color: 'var(--secondary)',
                  fontFamily: 'var(--cinzel-font)',
                  fontSize: '0.74rem',
                  letterSpacing: '1px',
                }}
              >
                <th style={{ padding: '0.65rem 0.75rem' }}>Fecha (Ciclo +930)</th>
                <th style={{ padding: '0.65rem 0.75rem' }}>Ejecutor</th>
                <th style={{ padding: '0.65rem 0.75rem' }}>Decreto / Acción</th>
                <th style={{ padding: '0.65rem 0.75rem' }}>Objetivo</th>
                <th style={{ padding: '0.65rem 0.75rem' }}>Detalles</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((entry) => {
                const meta = AUDIT_ACTION_META[entry.action_type] ?? {
                  label: entry.action_type,
                  tone: 'muted' as const,
                };
                const toneColor = getToneColor(meta.tone);
                return (
                  <tr
                    key={entry.id}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                      verticalAlign: 'top',
                    }}
                  >
                    <td
                      className="tabular-nums"
                      style={{
                        padding: '0.7rem 0.75rem',
                        whiteSpace: 'nowrap',
                        color: 'var(--text-muted)',
                        fontSize: '0.8rem',
                      }}
                    >
                      {formatSqliteAbyssalTimestamp(entry.created_at)}
                    </td>
                    <td style={{ padding: '0.7rem 0.75rem', minWidth: '140px' }}>
                      <div style={{ color: 'var(--text-main)', fontWeight: 700 }}>
                        {entry.actor_name ?? entry.actor_id ?? 'Sistema / Oráculo'}
                      </div>
                      {entry.actor_cargo && (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.76rem' }}>
                          {entry.actor_cargo}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '0.7rem 0.75rem', whiteSpace: 'nowrap' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '0.16rem 0.55rem',
                          borderRadius: '3px',
                          border: `1px solid ${toneColor}`,
                          color: toneColor,
                          fontSize: '0.74rem',
                          fontWeight: 700,
                        }}
                      >
                        {meta.label}
                      </span>
                    </td>
                    <td style={{ padding: '0.7rem 0.75rem', color: 'var(--accent-silver)', minWidth: '120px' }}>
                      {entry.target_name ?? entry.target_user_id ?? '—'}
                    </td>
                    <td
                      style={{
                        padding: '0.7rem 0.75rem',
                        color: 'var(--text-muted)',
                        maxWidth: '380px',
                        overflowWrap: 'anywhere',
                      }}
                    >
                      {summarizeAuditDetails(entry.details)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default ConcilioActasTab;

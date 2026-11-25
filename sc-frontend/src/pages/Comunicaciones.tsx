import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Radio, AlertTriangle, CheckCircle, RefreshCcw, ExternalLink, Eye } from 'lucide-react';
import { TERMINOLOGY } from '../constants/terminology';
import DualLabel from '../components/DualLabel';
import { useToast } from '../components/AbyssalToast';
import { toAbyssalYear } from '../utils/abyssalDate';

interface RSIStatusResponse {
  status: {
    page?: { name?: string; url?: string; time_zone?: string; updated_at?: string };
    status?: { indicator?: string; description?: string };
  } | null;
  incidents: RSIIncident[];
}

interface RSIIncident {
  id: string;
  name: string;
  status: string;
  created_at: string;
  updated_at?: string;
  shortlink?: string;
  incident_updates?: Array<{ status?: string; body?: string; created_at?: string; display_at?: string }>;
}

interface DevPost {
  id: string;
  title: string;
  url: string;
  author: string;
  content: string;
  date: number;
}

const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'] as const;

function sanitizeAbyssalYears(text: string | null | undefined): string {
  if (typeof text !== 'string' || !text) return '';
  return text.replace(/\b(202\d)\b/g, (_, y: string) => String(Number(y) + 930));
}

function formatAbyssalUtc(input: string | Date | null | undefined): string {
  if (!input) return 'Ciclo Indeterminado';
  const d = typeof input === 'string' ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) {
    return typeof input === 'string' ? sanitizeAbyssalYears(input) : 'Ciclo Indeterminado';
  }
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = MONTHS_ES[d.getUTCMonth()] ?? 'Ene';
  const year = toAbyssalYear(d.getUTCFullYear());
  return `${day} ${month} Ciclo ${year}`;
}

function stripHtmlTags(raw: string | null | undefined): string {
  if (typeof raw !== 'string' || !raw) return '';
  if (typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(raw, 'text/html');
    return sanitizeAbyssalYears(doc.body.textContent ?? '').trim();
  }
  return sanitizeAbyssalYears(raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')).trim();
}

const Comunicaciones: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const { showToast } = useToast();
  const [statusData, setStatusData] = useState<RSIStatusResponse | null>(null);
  const [devPosts, setDevPosts] = useState<DevPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadTelemetry = useCallback(
    async (isManual = false) => {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      try {
        const [statusRes, devRes] = await Promise.all([
          fetch('/api/status').then((r) => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json() as Promise<RSIStatusResponse>;
          }),
          fetch('/api/devtracker').then((r) => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json() as Promise<DevPost[]>;
          }),
        ]);
        setStatusData(statusRes);
        setDevPosts(Array.isArray(devRes) ? devRes : []);
        if (isManual) {
          showToast('Frecuencias de Ecos del Vacío actualizadas.', 'success');
        }
      } catch (err) {
        console.error(err);
        showToast('No se pudo interceptar el nodo de estado RSI o DevTracker.', 'error');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [showToast],
  );

  useEffect(() => {
    if (!embedded) {
      document.title = 'Ecos del Vacío | Intercepción de Frecuencias | Ancalagon';
    }
    let cancelled = false;
    void Promise.resolve().then(async () => {
      if (!cancelled) {
        await loadTelemetry(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [embedded, loadTelemetry]);

  const indicator = statusData?.status?.status?.indicator;
  const description = statusData?.status?.status?.description;
  const isOperational = indicator === 'none';
  const rawIncidents = statusData?.incidents;
  const incidents = Array.isArray(rawIncidents) ? rawIncidents : [];
  const HeadingTag = embedded ? 'h2' : 'h1';
  const SectionHeadingTag = embedded ? 'h3' : 'h2';
  const SubHeadingTag = embedded ? 'h4' : 'h3';
  const ItemHeadingTag = embedded ? 'h5' : 'h4';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ padding: '0 2rem 4rem', maxWidth: '1300px', margin: '0 auto' }}
    >
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
          <Radio size={32} color="var(--accent-rsi)" aria-hidden="true" />
          <HeadingTag style={{ margin: 0 }}>
            <DualLabel
              sacred={TERMINOLOGY.comunicaciones.sacred.toUpperCase()}
              tactical={TERMINOLOGY.comunicaciones.tactical}
              size={embedded ? 'md' : 'lg'}
              align="center"
              sacredColor="var(--secondary)"
            />
          </HeadingTag>
          <button
            type="button"
            className="btn-secondary"
            disabled={refreshing || loading}
            aria-label="Actualizar estado y transmisiones"
            onClick={() => void loadTelemetry(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', padding: '0.45rem 0.85rem' }}
          >
            <RefreshCcw size={14} className={refreshing ? 'spin' : ''} aria-hidden="true" />
            {refreshing ? 'ACTUALIZANDO…' : 'REFRESCAR'}
          </button>
        </div>
        <p className="prose-grimoire" style={{ color: 'var(--text-muted)', fontSize: '1rem', margin: '0 auto' }}>
          Escucha pasiva desde las Fisuras del Orden: vigilancia sobre la estabilidad de los nodos dimensionales y
          transmisiones interceptadas a <strong>Los Custodios del Orden</strong> en el Ciclo 2956.
        </p>
      </div>

      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--secondary)', fontFamily: 'var(--cinzel-font)' }}>
          <RefreshCcw className="spin" size={32} aria-hidden="true" style={{ marginBottom: '1rem' }} />
          <SectionHeadingTag style={{ margin: 0, fontSize: '0.9rem', fontWeight: 400, letterSpacing: '3px', color: 'var(--secondary)' }}>
            INTERCEPTANDO FRECUENCIAS CUÁNTICAS DE LA GRAN MENTIRA…
          </SectionHeadingTag>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '2rem' }}>
          {/* Columna 1: Estabilidad de la Grieta Dimensional */}
          <div>
            <div className="surface-monolith" style={{ padding: '2rem', borderTop: '3px solid var(--secondary)' }}>
              <SectionHeadingTag style={{ marginTop: 0, marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Eye size={18} aria-hidden="true" style={{ color: 'var(--secondary)' }} />
                <DualLabel
                  sacred="ESTABILIDAD DE LOS NODOS ESTELARES"
                  tactical="RSI Server Status & PU Health"
                  size="md"
                  sacredColor="var(--secondary)"
                />
              </SectionHeadingTag>

            {statusData?.status && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  marginBottom: '1.5rem',
                  padding: '1rem',
                  borderRadius: '6px',
                  background: isOperational ? 'rgba(16, 185, 129, 0.08)' : 'rgba(196, 30, 58, 0.15)',
                  border: `1px solid ${isOperational ? 'rgba(16, 185, 129, 0.35)' : 'var(--primary)'}`,
                }}
              >
                {isOperational ? (
                  <CheckCircle color="var(--status-ok)" size={28} aria-hidden="true" style={{ flexShrink: 0 }} />
                ) : (
                  <AlertTriangle color="var(--primary)" size={28} aria-hidden="true" style={{ flexShrink: 0 }} />
                )}
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--cinzel-font)', letterSpacing: '1px' }}>
                    ESTADO DEL PLANO MATERIAL
                  </div>
                  <div
                    style={{
                      fontSize: '1.05rem',
                      fontWeight: 'bold',
                      fontFamily: 'var(--cinzel-font)',
                      color: isOperational ? 'var(--status-ok)' : 'var(--primary)',
                    }}
                  >
                    {isOperational
                      ? 'VÍAS DE SALTO ESTABLES (OPERATIONAL)'
                      : `ANOMALÍA DETECTADA: ${sanitizeAbyssalYears(String(description || indicator || 'DEGRADACIÓN')).toUpperCase()}`}
                  </div>
                </div>
              </div>
            )}

            <SubHeadingTag style={{ fontSize: '0.82rem', color: 'var(--accent-silver)', letterSpacing: '2px', fontFamily: 'var(--cinzel-font)', textTransform: 'uppercase', marginBottom: '1rem' }}>
              CRÓNICA DE PERTURBACIONES RECIENTES
            </SubHeadingTag>

            {incidents.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {incidents.map((inc, i) => {
                  const latestBody = stripHtmlTags(inc.incident_updates?.[0]?.body || inc.status || '');
                  return (
                    <div
                      key={inc.id || i}
                      style={{
                        background: 'rgba(0,0,0,0.35)',
                        padding: '1rem',
                        borderRadius: '6px',
                        borderLeft: '3px solid var(--primary)',
                      }}
                    >
                      <div className="tabular-nums" style={{ fontSize: '0.75rem', color: 'var(--secondary)', marginBottom: '0.3rem', fontFamily: 'var(--cinzel-font)' }}>
                        {formatAbyssalUtc(inc.updated_at || inc.created_at)}
                      </div>
                      <ItemHeadingTag style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', color: 'var(--text-main)', fontFamily: 'var(--cinzel-font)' }}>
                        {sanitizeAbyssalYears(inc.name ?? '') || 'Incidente sin título'}
                      </ItemHeadingTag>
                      {latestBody && (
                        <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                          {latestBody}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                No se registran fracturas críticas en las redes de salto durante este ciclo.
              </p>
            )}
          </div>
        </div>

        {/* Columna 2: Transmisiones Interceptadas (DevTracker) */}
        <div>
          <div className="surface-monolith" style={{ padding: '2rem', borderTop: '3px solid var(--accent-rsi)' }}>
            <SectionHeadingTag style={{ marginTop: 0, marginBottom: '0.5rem' }}>
              <DualLabel
                sacred="TRANSMISIONES INTERCEPTADAS A LOS CIEGOS"
                tactical="RSI DevTracker & Notas de Desarrolladores"
                size="md"
                sacredColor="var(--secondary)"
              />
            </SectionHeadingTag>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Despachos desencriptados por los escribas del Concilio del Vacío sobre cambios en la doctrina y el armamento
              del universo conocido.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {devPosts.length > 0 ? (
                devPosts.map((post) => (
                  <div
                    key={post.id}
                    style={{
                      background: 'rgba(0,0,0,0.35)',
                      padding: '1.2rem',
                      borderRadius: '6px',
                      border: '1px solid rgba(212, 175, 55, 0.12)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span>
                        Emisor interceptado: <strong style={{ color: 'var(--secondary)' }}>{post.author}</strong>
                      </span>
                      <span className="tabular-nums">
                        {formatAbyssalUtc(new Date(post.date * 1000))}
                      </span>
                    </div>
                    <SubHeadingTag style={{ margin: '0 0 0.6rem 0', fontSize: '1rem', fontFamily: 'var(--cinzel-font)', textTransform: 'uppercase', letterSpacing: '3px' }}>
                      <a
                        href={post.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover-underline"
                        style={{ color: 'var(--text-main)', textDecoration: 'none', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}
                      >
                        <span style={{ flex: 1 }}>{sanitizeAbyssalYears(post.title ?? '') || 'Transmisión sin título'}</span>
                        <ExternalLink size={15} aria-hidden="true" style={{ flexShrink: 0, marginTop: '3px', color: 'var(--secondary)' }} />
                      </a>
                    </SubHeadingTag>
                    {post.content && (
                      <p
                        style={{
                          fontSize: '0.85rem',
                          color: 'var(--text-muted)',
                          margin: 0,
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          lineHeight: 1.5,
                        }}
                      >
                        {sanitizeAbyssalYears(post.content)}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <p style={{ color: 'var(--text-muted)' }}>Silencio en el éter cuántico.</p>
              )}
            </div>

            <div
              style={{
                marginTop: '1.5rem',
                paddingTop: '1rem',
                borderTop: '1px solid rgba(212,175,55,0.15)',
                textAlign: 'right',
                fontFamily: 'var(--cinzel-font)',
                fontSize: '0.72rem',
                letterSpacing: '3px',
                color: 'var(--secondary)',
              }}
            >
              IN NOMINI OBLIVIONIS
            </div>
          </div>
        </div>
        </div>
      )}
    </motion.div>
  );
};

export default Comunicaciones;

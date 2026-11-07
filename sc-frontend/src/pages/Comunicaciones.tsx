import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Radio, AlertTriangle, CheckCircle, RefreshCcw, ExternalLink, Eye } from 'lucide-react';
import { formatAbyssalDate } from '../utils/abyssalDate';

const Comunicaciones: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [reddit, setReddit] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Ecos del Vacío | Intercepción de Frecuencias | Ancalagon';
    Promise.all([
      fetch('/api/status').then((r) => r.json()),
      fetch('/api/community/reddit').then((r) => r.json()),
    ])
      .then(([statusData, redditData]) => {
        setStatus(statusData);
        if (Array.isArray(redditData)) setReddit(redditData);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--secondary)', fontFamily: 'var(--cinzel-font)' }}>
        <RefreshCcw className="spin" size={32} style={{ marginBottom: '1rem' }} />
        <div>INTERCEPTANDO FRECUENCIAS CUÁNTICAS DE LA GRAN MENTIRA...</div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ padding: '0 2rem 4rem', maxWidth: '1300px', margin: '0 auto' }}
    >
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', marginBottom: '0.5rem' }}>
          <Radio size={34} color="var(--secondary)" />
          <h1 style={{ fontFamily: 'var(--cinzel-font)', color: 'var(--secondary)', fontSize: '2.3rem', letterSpacing: '5px', margin: 0 }}>
            ECOS DEL VACÍO
          </h1>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem', maxWidth: '760px', margin: '0 auto' }}>
          Escucha pasiva desde las Fisuras del Orden: vigilancia sobre la estabilidad de los nodos dimensionales y
          transmisiones interceptadas a <strong>Los Custodios del Orden</strong> en el Ciclo 2956.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '2rem' }}>
        {/* Columna 1: Estabilidad de la Grieta Dimensional */}
        <div>
          <div className="glass-card" style={{ padding: '2rem', borderTop: '3px solid var(--secondary)' }}>
            <h2
              style={{
                fontFamily: 'var(--cinzel-font)',
                color: 'var(--secondary)',
                fontSize: '1.2rem',
                marginTop: 0,
                marginBottom: '1.2rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
              }}
            >
              <Eye size={18} /> ESTABILIDAD DE LOS NODOS ESTELARES
            </h2>

            {status && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  marginBottom: '1.5rem',
                  padding: '1rem',
                  borderRadius: '6px',
                  background: status.status === 'operational' ? 'rgba(212, 175, 55, 0.08)' : 'rgba(196, 30, 58, 0.15)',
                  border: `1px solid ${status.status === 'operational' ? 'rgba(212, 175, 55, 0.35)' : 'var(--primary)'}`,
                }}
              >
                {status.status === 'operational' ? (
                  <CheckCircle color="var(--secondary)" size={28} />
                ) : (
                  <AlertTriangle color="var(--primary)" size={28} />
                )}
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--cinzel-font)', letterSpacing: '1px' }}>
                    ESTADO DEL PLANO MATERIAL
                  </div>
                  <div
                    style={{
                      fontSize: '1.1rem',
                      fontWeight: 'bold',
                      fontFamily: 'var(--cinzel-font)',
                      color: status.status === 'operational' ? 'var(--secondary)' : 'var(--primary)',
                    }}
                  >
                    {status.status === 'operational'
                      ? 'VÍAS DE SALTO ESTABLES'
                      : `ANOMALÍA DETECTADA (${String(status.status).toUpperCase()})`}
                  </div>
                </div>
              </div>
            )}

            <h3 style={{ fontSize: '0.82rem', color: 'var(--accent-silver)', letterSpacing: '2px', fontFamily: 'var(--cinzel-font)', marginBottom: '1rem' }}>
              CRÓNICA DE PERTURBACIONES RECIENTES
            </h3>

            {status?.incidents && status.incidents.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {status.incidents.map((inc: any, i: number) => (
                  <div
                    key={i}
                    style={{
                      background: 'rgba(0,0,0,0.35)',
                      padding: '1rem',
                      borderRadius: '6px',
                      borderLeft: '3px solid var(--primary)',
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', color: 'var(--secondary)', marginBottom: '0.3rem', fontFamily: 'var(--cinzel-font)' }}>
                      {formatAbyssalDate(inc.date, { prefixCycle: true })}
                    </div>
                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', color: 'var(--text-main)', fontFamily: 'var(--cinzel-font)' }}>
                      {inc.title}
                    </h4>
                    <div
                      style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.5 }}
                      dangerouslySetInnerHTML={{ __html: inc.content }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                No se registran fracturas críticas en las redes de salto durante este ciclo.
              </p>
            )}
          </div>
        </div>

        {/* Columna 2: Transmisiones Interceptadas */}
        <div>
          <div className="glass-card" style={{ padding: '2rem', borderTop: '3px solid var(--primary)' }}>
            <h2
              style={{
                fontFamily: 'var(--cinzel-font)',
                color: 'var(--secondary)',
                fontSize: '1.2rem',
                marginTop: 0,
                marginBottom: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
              }}
            >
              TRANSMISIONES INTERCEPTADAS A LOS CIEGOS
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Despachos desencriptados por los escribas del Concilio del Vacío sobre cambios en la doctrina y el armamento
              del universo conocido.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {reddit.length > 0 ? (
                reddit.map((post: any) => (
                  <div
                    key={post.id}
                    style={{
                      background: 'rgba(0,0,0,0.35)',
                      padding: '1.2rem',
                      borderRadius: '6px',
                      border: '1px solid rgba(212, 175, 55, 0.12)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <span>
                        Emisor interceptado: <strong style={{ color: 'var(--secondary)' }}>{post.author}</strong>
                      </span>
                      <span>{formatAbyssalDate(new Date(post.created_utc * 1000), { prefixCycle: true })}</span>
                    </div>
                    <h3 style={{ margin: '0 0 0.6rem 0', fontSize: '1rem', fontFamily: 'var(--cinzel-font)' }}>
                      <a
                        href={post.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: 'var(--text-main)', textDecoration: 'none', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}
                      >
                        <span style={{ flex: 1 }}>{post.title}</span>
                        <ExternalLink size={15} style={{ flexShrink: 0, marginTop: '3px', color: 'var(--secondary)' }} />
                      </a>
                    </h3>
                    {post.selftext && (
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
                        {post.selftext}
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
    </motion.div>
  );
};

export default Comunicaciones;

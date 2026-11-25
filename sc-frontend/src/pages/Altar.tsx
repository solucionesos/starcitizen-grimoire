import React, { useEffect, useState } from 'react';
import { useAltar } from '../context/useAltar';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, PackageOpen, Target, Search } from 'lucide-react';
import DualLabel from '../components/DualLabel';
import SealConfirmModal from '../components/SealConfirmModal';
import { TERMINOLOGY } from '../constants/terminology';

const Altar: React.FC = () => {
  const { cart, addToAltar, removeFromAltar, clearAltar, getConsolidatedMaterials } = useAltar();
  const navigate = useNavigate();
  const [confirmPurgeOpen, setConfirmPurgeOpen] = useState(false);

  const materials = getConsolidatedMaterials();
  const materialKeys = Object.keys(materials).sort();
  const numberFormatter = new Intl.NumberFormat('es-ES');

  useEffect(() => {
    document.title = 'Star Grimoire | Altar de Forja';
  }, []);

  return (
    <div style={{ padding: '0 2rem 4rem', maxWidth: '1000px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '0.75rem' }}>
        <DualLabel
          sacred={TERMINOLOGY.altar.sacred}
          tactical={TERMINOLOGY.altar.tactical}
          size="lg"
          sacredColor="var(--secondary)"
        />
      </h1>
      <p
        className="prose-grimoire"
        style={{
          color: 'var(--text-muted)',
          fontFamily: 'var(--cinzel-font)',
          letterSpacing: '1px',
          marginBottom: '2rem',
        }}
      >
        Concentra los tecnomilagros que deseas manifestar para revelar el sumatorio sagrado de ofrendas requeridas.
      </p>

      {cart.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '5rem 2rem',
            border: '1px dashed var(--border)',
            borderRadius: '8px',
            background: 'rgba(255,255,255,0.02)',
          }}
        >
          <PackageOpen
            size={48}
            aria-hidden="true"
            style={{ color: 'var(--secondary)', marginBottom: '1rem', opacity: 0.5 }}
          />
          <h2
            style={{
              fontFamily: 'var(--cinzel-font)',
              letterSpacing: '2px',
              color: 'var(--text-muted)',
              fontSize: '1.2rem',
            }}
          >
            EL ALTAR ESTÁ VACÍO
          </h2>
          <p style={{ marginTop: '1.25rem' }}>
            <Link to="/codice/tecnomilagros" className="btn-primary" style={{ display: 'inline-block' }}>
              EXAMINAR TECNOMILAGROS
            </Link>
          </p>
        </div>
      ) : (
        <div className="responsive-grid-2" style={{ gap: '2rem' }}>
          {/* COLUMNA IZQUIERDA: LOS TECNOMILAGROS SELECCIONADOS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem',
                borderBottom: '1px solid rgba(196,30,58,0.2)',
                paddingBottom: '0.8rem',
                gap: '1rem',
              }}
            >
              <h2
                style={{
                  fontFamily: 'var(--cinzel-font)',
                  letterSpacing: '2px',
                  color: 'var(--primary)',
                  margin: 0,
                  fontSize: '1.1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <Target size={16} aria-hidden="true" />
                <span>FOCOS DE MANIFESTACIÓN</span>
              </h2>
              <button
                type="button"
                onClick={() => setConfirmPurgeOpen(true)}
                style={{
                  background: 'none',
                  border: '1px solid rgba(239,68,68,0.35)',
                  borderRadius: '4px',
                  padding: '0.35rem 0.65rem',
                  color: 'var(--status-danger)',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontFamily: 'var(--cinzel-font)',
                  fontWeight: 700,
                }}
                title="Purgar Altar"
              >
                <Trash2 size={14} aria-hidden="true" /> PURGAR
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {cart.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="surface-monolith"
                  style={{ padding: '1rem', borderTop: '2px solid var(--secondary)' }}
                >
                  <h3 className="accent-gold" style={{ marginBottom: '0.5rem', fontSize: '1rem' }}>
                    {item.name}
                  </h3>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        background: 'rgba(0,0,0,0.4)',
                        borderRadius: '4px',
                        padding: '0.2rem',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => removeFromAltar(item.id)}
                        aria-label={`Reducir cantidad de ${item.name}`}
                        style={{
                          background: 'rgba(255,255,255,0.08)',
                          border: 'none',
                          color: '#fff',
                          padding: '0.35rem',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Minus size={14} aria-hidden="true" />
                      </button>
                      <span
                        className="tabular-nums"
                        style={{
                          fontFamily: 'var(--cinzel-font)',
                          width: '34px',
                          textAlign: 'center',
                          fontWeight: 'bold',
                        }}
                      >
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => addToAltar(item)}
                        aria-label={`Aumentar cantidad de ${item.name}`}
                        style={{
                          background: 'rgba(255,255,255,0.08)',
                          border: 'none',
                          color: '#fff',
                          padding: '0.35rem',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Plus size={14} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* COLUMNA DERECHA: CONSOLIDADO DE MATERIALES */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="surface-monolith"
            style={{ height: 'fit-content', position: 'sticky', top: '6rem', borderTop: '4px solid var(--primary)' }}
          >
            <h2
              style={{
                fontFamily: 'var(--cinzel-font)',
                letterSpacing: '2px',
                color: 'var(--secondary)',
                marginBottom: '1.5rem',
                borderBottom: '1px solid rgba(212,175,55,0.2)',
                paddingBottom: '0.8rem',
                fontSize: '1.05rem',
              }}
            >
              RESUMEN DE OFRENDAS NECESARIAS
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {materialKeys.map((key) => {
                const mat = materials[key];
                return (
                  <div
                    key={key}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.6rem',
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: '4px',
                      borderLeft: mat.resourceId ? '2px solid var(--primary)' : '2px solid transparent',
                    }}
                  >
                    {mat.resourceId ? (
                      <Link
                        to={`/recurso/${mat.resourceId}`}
                        state={{ breadcrumbLabel: `REQ: ${mat.label}` }}
                        style={{ color: 'var(--text-main)', textDecoration: 'none', fontWeight: 500, minWidth: 0 }}
                        className="hover-primary"
                      >
                        {mat.label}
                      </Link>
                    ) : (
                      <Link
                        to={`/codice/ofrendas?tags=${encodeURIComponent(mat.label)}`}
                        state={{ breadcrumbLabel: `MAPEO: ${mat.label}` }}
                        style={{
                          color: 'var(--text-muted)',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          minWidth: 0,
                        }}
                        className="hover-primary"
                      >
                        <span>{mat.label}</span>
                        <Search size={12} aria-hidden="true" style={{ flexShrink: 0 }} />
                      </Link>
                    )}
                    <span
                      className="accent-amber tabular-nums"
                      style={{ fontFamily: 'var(--cinzel-font)', fontWeight: 'bold', fontSize: '1.1rem', flexShrink: 0 }}
                    >
                      x{numberFormatter.format(mat.amount)}{' '}
                      <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>SCU</span>
                    </span>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn-primary"
                style={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontFamily: 'var(--cinzel-font)',
                }}
                onClick={() => {
                  const allTags = materialKeys.map((k) => encodeURIComponent(materials[k].label)).join(',');
                  navigate(`/codice/ofrendas?tags=${allTags}`, { state: { breadcrumbLabel: 'MAPEO MASIVO' } });
                }}
              >
                <Target size={18} aria-hidden="true" /> ESCANEAR TODAS EN MAPA
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <SealConfirmModal
        isOpen={confirmPurgeOpen}
        title="Purgar Altar de Forja"
        message="¿Deseas disolver todos los tecnomilagros consagrados actualmente en tu Altar de Forja?"
        confirmLabel="Purgar Altar"
        cancelLabel="Conservar"
        variant="danger"
        onConfirm={() => {
          clearAltar();
          setConfirmPurgeOpen(false);
        }}
        onCancel={() => setConfirmPurgeOpen(false)}
      />
    </div>
  );
};

export default Altar;

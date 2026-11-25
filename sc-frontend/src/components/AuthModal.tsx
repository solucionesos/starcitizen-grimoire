import React, { useEffect, useId, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, Sparkles, Flame, Crown } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { api } from '../api/client';
import { TERMINOLOGY } from '../constants/terminology';
import DragonIcon from './DragonIcon';
import DualLabel from './DualLabel';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const OFFICIAL_ROSTER_DEV = [
  { handle: 'Quaker', rank: 'Heraldo de Ancalagon', level: 'VI', color: 'var(--rank-6)', icon: Crown },
  { handle: 'Enanimus', rank: 'Profeta de la Ruina', level: 'V', color: 'var(--rank-5)', icon: Shield },
  { handle: 'Denoxx', rank: 'Profeta de la Ruina', level: 'V', color: 'var(--rank-5)', icon: Shield },
  { handle: 'Longhinus', rank: 'Profeta de la Ruina', level: 'V', color: 'var(--rank-5)', icon: Shield },
  { handle: 'Afol86', rank: 'Voz del Abismo', level: 'IV', color: 'var(--rank-4)', icon: Flame },
  { handle: 'Unknown-t20', rank: 'Portador de Ceniza', level: 'III', color: 'var(--rank-3)', icon: Flame },
  { handle: 'Kannabistian420', rank: 'Iniciado del Vacío', level: 'II', color: 'var(--rank-2)', icon: Flame },
];

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { loginWithDiscord, devLogin } = useAuth();
  const [devLoginEnabled, setDevLoginEnabled] = useState(false);
  const titleId = useId();
  const descId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    api
      .get<{ devLoginEnabled?: boolean }>('/auth/config')
      .then((res) => {
        if (!cancelled) {
          setDevLoginEnabled(Boolean(res.data?.devLoginEnabled));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDevLoginEnabled(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const rafId = window.requestAnimationFrame(() => {
      closeBtnRef.current?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab') return;
      const dialog = dialogRef.current;
      if (!dialog) return;

      const focusables = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => el.getClientRects().length > 0 || el === document.activeElement,
      );

      if (focusables.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (event.shiftKey) {
        if (active === first || !dialog.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last || !dialog.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(rafId);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(5, 5, 10, 0.88)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
            overscrollBehavior: 'contain',
          }}
          onClick={onClose}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ duration: 0.22 }}
            className="surface-monolith"
            style={{
              maxWidth: '580px',
              width: '100%',
              padding: '2.2rem',
              position: 'relative',
              borderTop: '3px solid var(--secondary)',
              boxShadow: '0 0 50px rgba(196, 30, 58, 0.3)',
              maxHeight: '90vh',
              overflowY: 'auto',
              overscrollBehavior: 'contain',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              ref={closeBtnRef}
              type="button"
              onClick={onClose}
              aria-label="Cerrar diálogo de acceso"
              style={{
                position: 'absolute',
                top: '1.2rem',
                right: '1.2rem',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '0.25rem',
                borderRadius: '4px',
              }}
            >
              <X size={22} aria-hidden="true" />
            </button>

            <div style={{ textAlign: 'center', marginBottom: '1.8rem' }}>
              <div style={{ marginBottom: '0.8rem', filter: 'drop-shadow(0 0 15px rgba(212, 175, 55, 0.4))' }}>
                <DragonIcon size={50} />
              </div>
              <h2
                id={titleId}
                style={{
                  margin: '0 0 0.65rem',
                  display: 'flex',
                  justifyContent: 'center',
                }}
              >
                <DualLabel
                  sacred={TERMINOLOGY.cruzarUmbral.sacred.toUpperCase()}
                  tactical={TERMINOLOGY.cruzarUmbral.tactical}
                  size="lg"
                  align="center"
                  sacredColor="var(--secondary)"
                />
              </h2>
              <p
                id={descId}
                style={{
                  color: 'var(--text-muted)',
                  fontSize: '0.88rem',
                  lineHeight: 1.6,
                  margin: '0 auto',
                  maxWidth: '48ch',
                }}
              >
                Presenta tu juramento ante el <strong>Concilio del Vacío</strong> de{' '}
                <strong>Ancalagon Oblivion Fleet</strong>. Tu vínculo con Discord inscribirá tu alma en La Escala del
                Abismo.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              <button
                type="button"
                onClick={() => {
                  loginWithDiscord();
                  onClose();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.8rem',
                  backgroundColor: '#5865F2',
                  color: '#fff',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  padding: '0.95rem',
                  borderRadius: '6px',
                  fontFamily: 'var(--cinzel-font)',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  letterSpacing: '2px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease, border-color 0.2s ease, transform 0.2s ease',
                  boxShadow: '0 4px 15px rgba(88, 101, 242, 0.4)',
                }}
              >
                <Sparkles size={19} aria-hidden="true" />
                JURAR LEALTAD VÍA DISCORD
              </button>
            </div>

            {devLoginEnabled && (
              <div
                style={{
                  borderTop: '1px solid rgba(212, 175, 55, 0.15)',
                  paddingTop: '1.2rem',
                  marginTop: '1.2rem',
                }}
              >
                <p
                  style={{
                    fontFamily: 'var(--cinzel-font)',
                    fontSize: '0.7rem',
                    letterSpacing: '3px',
                    color: 'var(--accent-silver)',
                    textAlign: 'center',
                    margin: '0 0 0.9rem',
                  }}
                >
                  ☩ REGISTRO SAGRADO DEL CICLO 2956 (SIMULACIÓN LOCAL) ☩
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.55rem' }}>
                  {OFFICIAL_ROSTER_DEV.map((member) => {
                    const IconComp = member.icon;
                    return (
                      <button
                        key={member.handle}
                        type="button"
                        onClick={() => {
                          devLogin(member.handle);
                          onClose();
                        }}
                        className="btn-secondary"
                        style={{
                          fontSize: '0.72rem',
                          padding: '0.55rem 0.65rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.55rem',
                          borderColor: member.color,
                          textAlign: 'left',
                        }}
                        title={`Encarnar a ${member.handle} (${member.rank})`}
                      >
                        <IconComp size={15} color={member.color} aria-hidden="true" style={{ flexShrink: 0 }} />
                        <div style={{ overflow: 'hidden', minWidth: 0 }}>
                          <div style={{ fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                            {member.handle}
                          </div>
                          <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', letterSpacing: '0.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            [{member.level}] {member.rank}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <p
                  style={{
                    fontSize: '0.68rem',
                    color: 'var(--text-muted)',
                    textAlign: 'center',
                    marginTop: '0.9rem',
                    fontStyle: 'italic',
                  }}
                >
                  * Este panel solo es visible en modo local (NODE_ENV=development). En producción solo estará activo el
                  acceso por Discord.
                </p>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

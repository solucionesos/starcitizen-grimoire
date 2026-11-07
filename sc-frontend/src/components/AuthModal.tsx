import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, Sparkles, Flame, Crown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import DragonIcon from './DragonIcon';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const OFFICIAL_ROSTER_DEV = [
  { handle: 'Quaker', rank: 'Heraldo de Ancalagon', level: 'VI', color: '#ff3355', icon: Crown },
  { handle: 'Enanimus', rank: 'Profeta de la Ruina', level: 'V', color: 'var(--secondary)', icon: Shield },
  { handle: 'Denoxx', rank: 'Profeta de la Ruina', level: 'V', color: 'var(--secondary)', icon: Shield },
  { handle: 'Longhinus', rank: 'Profeta de la Ruina', level: 'V', color: 'var(--secondary)', icon: Shield },
  { handle: 'Afol86', rank: 'Voz del Abismo', level: 'IV', color: 'var(--primary)', icon: Flame },
  { handle: 'Unknown-t20', rank: 'Portador de Ceniza', level: 'III', color: '#b0c4de', icon: Flame },
  { handle: 'Kannabistian420', rank: 'Iniciado del Vacío', level: 'II', color: '#8fbc8f', icon: Flame },
];

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { loginWithDiscord, devLogin } = useAuth();
  const [devLoginEnabled, setDevLoginEnabled] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      fetch('/api/auth/config')
        .then((r) => r.json())
        .then((d) => setDevLoginEnabled(Boolean(d?.devLoginEnabled)))
        .catch(() => setDevLoginEnabled(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
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
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.3 }}
          className="glass-card"
          style={{
            maxWidth: '580px',
            width: '100%',
            padding: '2.2rem',
            position: 'relative',
            borderTop: '3px solid var(--secondary)',
            boxShadow: '0 0 50px rgba(196, 30, 58, 0.3)',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '1.2rem',
              right: '1.2rem',
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            <X size={22} />
          </button>

          <div style={{ textAlign: 'center', marginBottom: '1.8rem' }}>
            <div style={{ marginBottom: '0.8rem', filter: 'drop-shadow(0 0 15px rgba(212, 175, 55, 0.4))' }}>
              <DragonIcon size={50} />
            </div>
            <h2
              style={{
                fontFamily: 'var(--cinzel-font)',
                color: 'var(--secondary)',
                fontSize: '1.7rem',
                margin: '0 0 0.5rem',
                letterSpacing: '3px',
              }}
            >
              CRUZAR EL UMBRAL
            </h2>
            <p
              style={{
                color: 'var(--text-muted)',
                fontSize: '0.88rem',
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              Presenta tu juramento ante el <strong>Concilio del Vacío</strong> de{' '}
              <strong>Ancalagon Oblivion Fleet</strong>. Tu vínculo con Discord inscribirá tu alma en La Escala del
              Abismo.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
            <button
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
                border: 'none',
                padding: '0.95rem',
                borderRadius: '6px',
                fontFamily: 'var(--cinzel-font)',
                fontSize: '0.92rem',
                fontWeight: 700,
                letterSpacing: '2px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 4px 15px rgba(88, 101, 242, 0.4)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#4752c4')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#5865F2')}
            >
              <Sparkles size={19} />
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.55rem' }}>
                {OFFICIAL_ROSTER_DEV.map((member) => {
                  const IconComp = member.icon;
                  return (
                    <button
                      key={member.handle}
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
                      <IconComp size={15} color={member.color} style={{ flexShrink: 0 }} />
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                          {member.handle}
                        </div>
                        <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
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
    </AnimatePresence>
  );
};

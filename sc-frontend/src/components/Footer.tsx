import React, { useEffect, useState } from 'react';
import { Coffee, ExternalLink } from 'lucide-react';
import { getVersion } from '../api/client';

const YoutubeIcon = ({ size = 20 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.42a2.78 2.78 0 0 0-1.94 2C1 8.11 1 12 1 12s0 3.89.46 5.58a2.78 2.78 0 0 0 1.94 2c1.72.42 8.6.42 8.6.42s6.88 0 8.6-.42a2.78 2.78 0 0 0 1.94-2C23 15.89 23 12 23 12s0-3.89-.46-5.58z" />
    <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" />
  </svg>
);

const TwitchIcon = ({ size = 20 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M21 2H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h5v3l3-3h4l5-5V4c0-1.1-.9-2-2-2z" />
    <path d="M10 8v4" />
    <path d="M15 8v4" />
  </svg>
);

const RSIIcon = ({ size = 20 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
    <path d="M2 12h20" />
    <path d="M12 12l2 2" />
    <path d="M12 12l-2-2" />
  </svg>
);

const Footer: React.FC = () => {
  const [version, setVersion] = useState<string | null>(null);
  const currentCycle = new Date().getUTCFullYear() + 930;

  useEffect(() => {
    let active = true;
    getVersion()
      .then((res) => {
        if (active && res.version) {
          setVersion(res.version);
        }
      })
      .catch(() => {
        if (active) setVersion(null);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <footer className="surface-monolith footer-container">
      <div className="footer-content">
        <div className="footer-section">
          <h3 className="footer-title">La Hermandad</h3>
          <p className="footer-text">
            Extractores de la verdad oculta en las sombras de Stanton, Nyx y Pyro.
            Donde termina el orden… comenzamos nosotros.
          </p>
          <div className="social-links">
            <a
              href="https://www.youtube.com/@ancalagongamesyt"
              target="_blank"
              rel="noopener noreferrer"
              className="social-icon-link hover-glow"
              title="YouTube"
              aria-label="Canal de YouTube de Ancalagon (abre en nueva pestaña)"
            >
              <YoutubeIcon size={20} />
            </a>
            <a
              href="https://www.twitch.tv/AncalagonGames"
              target="_blank"
              rel="noopener noreferrer"
              className="social-icon-link hover-glow"
              title="Twitch"
              aria-label="Canal de Twitch de Ancalagon (abre en nueva pestaña)"
            >
              <TwitchIcon size={20} />
            </a>
            <a
              href="https://robertsspaceindustries.com/en/orgs/ANCFLEET"
              target="_blank"
              rel="noopener noreferrer"
              className="social-icon-link hover-glow"
              title="RSI Organization"
              aria-label="Organización Ancalagon en RSI (abre en nueva pestaña)"
            >
              <RSIIcon size={20} />
            </a>
          </div>
        </div>

        <div className="footer-section support-section">
          <h3 className="footer-title">Apoyo al Nexo</h3>
          <p className="footer-text">
            Tu contribución mantiene el Grimoire activo y libre de la corrupción corporativa.
          </p>
          <a
            href="https://ko-fi.com/ancalagongames"
            target="_blank"
            rel="noopener noreferrer"
            className="support-btn hover-glow"
          >
            <Coffee size={18} aria-hidden="true" />
            <span>APOYAR EN KO-FI</span>
            <ExternalLink size={14} aria-hidden="true" />
          </a>
        </div>

        <div className="footer-section">
          <h3 className="footer-title">Estatus</h3>
          <ul className="footer-list">
            <li>
              <span className="status-ok" aria-hidden="true">●</span> Sincronía: ESTABLE
            </li>
            <li>
              <span className="accent-amber" aria-hidden="true">●</span> Protocolo: VELO ROTO
            </li>
            <li>
              <span className="text-muted" aria-hidden="true">●</span> Versión:{' '}
              <span className="tabular-nums">{version ?? 'Sincronizada'}</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-divider" />
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', opacity: 0.75 }}>
          <span translate="no" style={{ fontFamily: 'var(--cinzel-font)', fontSize: '0.8rem' }}>
            IN NOMINI OBLIVIONIS
          </span>
          <span aria-hidden="true" style={{ color: 'var(--primary)', fontSize: '0.95rem', lineHeight: 1 }}>
            ☩
          </span>
          <span className="tabular-nums" style={{ fontSize: '0.8rem' }}>
            Ciclo {currentCycle} · Ancalagon Oblivion Fleet
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

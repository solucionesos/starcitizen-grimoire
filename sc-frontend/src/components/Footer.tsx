import React from 'react';
import { Coffee, Heart, ExternalLink } from 'lucide-react';

const YoutubeIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.42a2.78 2.78 0 0 0-1.94 2C1 8.11 1 12 1 12s0 3.89.46 5.58a2.78 2.78 0 0 0 1.94 2c1.72.42 8.6.42 8.6.42s6.88 0 8.6-.42a2.78 2.78 0 0 0 1.94-2C23 15.89 23 12 23 12s0-3.89-.46-5.58z" />
    <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" />
  </svg>
);

const TwitchIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 2H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h5v3l3-3h4l5-5V4c0-1.1-.9-2-2-2z" />
    <path d="M10 8v4" />
    <path d="M15 8v4" />
  </svg>
);

const RSIIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
    <path d="M2 12h20" />
    <path d="M12 12l2 2" />
    <path d="M12 12l-2-2" />
  </svg>
);

const Footer: React.FC = () => {
  return (
    <footer className="glass-card footer-container">
      <div className="footer-content">
        <div className="footer-section">
          <h3 className="footer-title">La Hermandad</h3>
          <p className="footer-text">
            Extractores de la verdad oculta en las sombras de Stanton y Pyro. 
            Donde termina el orden… comenzamos nosotros.
          </p>
          <div className="social-links">
            <a href="https://www.youtube.com/@ancalagongamesyt" target="_blank" rel="noopener noreferrer" className="social-icon-link hover-glow" title="YouTube">
              <YoutubeIcon size={20} />
            </a>
            <a href="https://www.twitch.tv/AncalagonGames" target="_blank" rel="noopener noreferrer" className="social-icon-link hover-glow" title="Twitch">
              <TwitchIcon size={20} />
            </a>
            <a href="https://robertsspaceindustries.com/en/orgs/ANCFLEET" target="_blank" rel="noopener noreferrer" className="social-icon-link hover-glow" title="RSI Organization">
              <RSIIcon size={20} />
            </a>
          </div>
        </div>

        <div className="footer-section support-section">
          <h3 className="footer-title">Apoyo al Nexo</h3>
          <p className="footer-text">
            Tu contribución mantiene el Grimoire activo y libre de la corrupción corporativa.
          </p>
          <a href="https://ko-fi.com/ancalagongames" target="_blank" rel="noopener noreferrer" className="support-btn hover-glow">
            <Coffee size={18} />
            <span>APOYAR EN KO-FI</span>
            <ExternalLink size={14} />
          </a>
        </div>

        <div className="footer-section">
          <h3 className="footer-title">Estatus</h3>
          <ul className="footer-list">
            <li><span className="accent-cyan">●</span> Sincronía: ESTABLE</li>
            <li><span className="accent-gold">●</span> Protocolo: TRUTHSEEKER</li>
            <li><span className="text-muted">●</span> Versión: 4.7.0b</li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-divider"></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', opacity: 0.6 }}>
          <span style={{ fontFamily: 'var(--cinzel-font)', fontSize: '0.8rem' }}>
            IN NOMINI OBLIVIONIS
          </span>
          <Heart size={12} fill="var(--primary)" color="var(--primary)" />
          <span style={{ fontSize: '0.8rem' }}>
            {new Date().getUTCFullYear() + 930} - Ancalagon Oblivion Fleet
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

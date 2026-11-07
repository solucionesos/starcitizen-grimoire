import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, Sparkles } from 'lucide-react';
import logo from './assets/logo.png';
import Home from './pages/Home';

const API_VERSION = '/api/version';
import Recipes from './pages/Recipes';
import Resources from './pages/Resources';
import Lore from './pages/Lore';
import StarMap from './pages/StarMap';
import Rituales from './pages/Rituales';
import LectitioDivinitatus from './pages/LectitioDivinitatus';
import ResourceDetail from './pages/ResourceDetail';
import LocationDetail from './pages/LocationDetail';
import Wikelo from './pages/Wikelo';
import Datavelo from './pages/Datavelo';
import Bovedas from './pages/Bovedas';
import Breadcrumbs from './components/Breadcrumbs';
import { AltarProvider, useAltar } from './context/AltarContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthModal } from './components/AuthModal';
import Altar from './pages/Altar';
import Footer from './components/Footer';

// New Organization & Codex Pages
import Edictos from './pages/Edictos';
import Conclave from './pages/Conclave';
import BrotherProfile from './pages/BrotherProfile';
import CodexIndex from './pages/CodexIndex';
import CodexMandates from './pages/CodexMandates';
import CodexShips from './pages/CodexShips';
import CodexWeapons from './pages/CodexWeapons';
import CodexComponents from './pages/CodexComponents';

const NavCartBadge: React.FC<{ closeMenu: () => void }> = ({ closeMenu }) => {
  const { cart } = useAltar();
  const total = cart.reduce((acc, item) => acc + item.quantity, 0);
  return (
    <NavLink
      to="/altar"
      className="nav-link"
      style={({ isActive }) => ({ color: isActive ? 'var(--primary)' : 'var(--secondary)' })}
      onClick={closeMenu}
    >
      <div>ALTAR [{total}]</div>
      <div className="nav-link-sub">Crafting</div>
    </NavLink>
  );
};

const UserNavSection: React.FC<{ onOpenAuth: () => void; closeMenu: () => void }> = ({
  onOpenAuth,
  closeMenu,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <button
        onClick={() => {
          onOpenAuth();
          closeMenu();
        }}
        className="btn-primary"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.75rem',
          padding: '0.5rem 1rem',
          letterSpacing: '1px',
          alignSelf: 'center',
        }}
      >
        <Sparkles size={14} />
        CRUZAR EL UMBRAL
      </button>
    );
  }

  const rankColor = user.rank?.color || 'var(--secondary)';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', alignSelf: 'center' }}>
      <button
        onClick={() => {
          navigate('/hermano');
          closeMenu();
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        <img
          src={user.discord_avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}
          alt={user.display_name}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            border: `2px solid ${rankColor}`,
          }}
        />
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-main)', fontWeight: 'bold' }}>
            {user.display_name}
          </div>
          <div style={{ fontSize: '0.62rem', color: rankColor, fontFamily: 'var(--cinzel-font)' }}>
            {user.cargo || user.rank?.name}
          </div>
        </div>
      </button>

      <button
        onClick={logout}
        title="Cerrar el Umbral (Logout)"
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          padding: '0.2rem',
        }}
      >
        <LogOut size={16} />
      </button>
    </div>
  );
};

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

const AppContent: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [gameVersion, setGameVersion] = useState<string>('4.7.0');

  useEffect(() => {
    fetch(API_VERSION)
      .then((res) => res.json())
      .then((data: any) => {
        if (data.version && data.version !== gameVersion) {
          setGameVersion(data.version);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (gameVersion) {
      document.title = `Star Grimoire v${gameVersion} | Ancalagon Oblivion Fleet`;
    }
  }, [gameVersion]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <Router>
      <ScrollToTop />
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />

      <nav
        className="glass-card desktop-nav"
        style={{
          margin: '1rem',
          padding: '1rem 2rem',
          position: 'sticky',
          top: '1rem',
          zIndex: 100,
        }}
      >
        <div className="brand brand-header">
          <div className="brand-logo-container">
            <img src={logo} alt="Star Grimoire Logo" className="brand-logo" />
            <div style={{ whiteSpace: 'nowrap' }}>
              Star <span className="accent-cyan">Grimoire</span>{' '}
              <span style={{ fontSize: '0.7em', opacity: 0.5 }}>{gameVersion}</span>
            </div>
          </div>

          <button className="mobile-menu-btn" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>

        <div className={`nav-menu ${menuOpen ? 'open' : ''}`}>
          <NavLink to="/" className="nav-link" onClick={closeMenu}>
            <div>INICIO</div>
            <div className="nav-link-sub">Home</div>
          </NavLink>

          <NavLink to="/edictos" className="nav-link" onClick={closeMenu}>
            <div>EDICTOS</div>
            <div className="nav-link-sub">Mando Org</div>
          </NavLink>

          <NavLink to="/conclave" className="nav-link" onClick={closeMenu}>
            <div>EL CÓNCLAVE</div>
            <div className="nav-link-sub">Votaciones</div>
          </NavLink>

          <NavLink to="/codice" className="nav-link" onClick={closeMenu}>
            <div>EL CÓDICE</div>
            <div className="nav-link-sub">Compendio</div>
          </NavLink>

          <NavLink to="/nexo" className="nav-link" onClick={closeMenu}>
            <div>NEXO ESTELAR</div>
            <div className="nav-link-sub">Mapa</div>
          </NavLink>

          <NavLink to="/divinitatus" className="nav-link" style={{ color: 'var(--secondary)' }} onClick={closeMenu}>
            <div>DIVINITATUS</div>
            <div className="nav-link-sub">Lore</div>
          </NavLink>

          <NavLink to="/datavelo" className="nav-link" style={{ color: 'var(--accent-silver)' }} onClick={closeMenu}>
            <div>DATAVELO</div>
            <div className="nav-link-sub">Logística</div>
          </NavLink>

          <NavCartBadge closeMenu={closeMenu} />

          <UserNavSection onOpenAuth={() => setAuthModalOpen(true)} closeMenu={closeMenu} />
        </div>
      </nav>

      <Breadcrumbs />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/edictos" element={<Edictos />} />
        <Route path="/conclave" element={<Conclave />} />
        <Route path="/hermano" element={<BrotherProfile />} />

        {/* Códice Routes */}
        <Route path="/codice" element={<CodexIndex />} />
        <Route path="/codice/mandatos" element={<CodexMandates />} />
        <Route path="/codice/tecnomilagros" element={<Recipes />} />
        <Route path="/codice/ofrendas" element={<Resources />} />
        <Route path="/codice/arcas-estelares" element={<CodexShips />} />
        <Route path="/codice/armamentos" element={<CodexWeapons />} />
        <Route path="/codice/modulos" element={<CodexComponents />} />

        {/* Redirects for legacy and dead routes */}
        <Route path="/missions" element={<Navigate to="/codice/mandatos" replace />} />
        <Route path="/mapa" element={<Navigate to="/codice/ofrendas" replace />} />
        <Route path="/recipes" element={<Navigate to="/codice/tecnomilagros" replace />} />

        {/* Other Sections */}
        <Route path="/nexo" element={<StarMap />} />
        <Route path="/recurso/:id" element={<ResourceDetail />} />
        <Route path="/locacion/:system/:name" element={<LocationDetail />} />
        <Route path="/divinitatus" element={<LectitioDivinitatus />} />
        <Route path="/lore" element={<Lore />} />
        <Route path="/rituales" element={<Rituales />} />
        <Route path="/datavelo" element={<Datavelo />} />
        <Route path="/wikelo" element={<Wikelo />} />
        <Route path="/bovedas" element={<Bovedas />} />
        <Route path="/altar" element={<Altar />} />
      </Routes>
      <Footer />
    </Router>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AltarProvider>
        <AppContent />
      </AltarProvider>
    </AuthProvider>
  );
};

export default App;

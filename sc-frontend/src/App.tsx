import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import logo from './assets/logo.png';
import Home from './pages/Home';

const API_VERSION = '/api/version';
import Missions from './pages/Missions';
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
import Altar from './pages/Altar';
import Footer from './components/Footer';

// Codex Pages
import CodexIndex from './pages/CodexIndex';
import CodexShips from './pages/CodexShips';
import CodexWeapons from './pages/CodexWeapons';
import CodexComponents from './pages/CodexComponents';


const NavCartBadge: React.FC<{ closeMenu: () => void }> = ({ closeMenu }) => {
  const { cart } = useAltar();
  const total = cart.reduce((acc, item) => acc + item.quantity, 0);
  return (
    <NavLink to="/altar" className="nav-link" style={({ isActive }) => ({ color: isActive ? 'var(--primary)' : 'var(--secondary)' })} onClick={closeMenu}>
      <div>ALTAR [{total}]</div>
      <div className="nav-link-sub">Crafting</div>
    </NavLink>
  );
};

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

const App: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [gameVersion, setGameVersion] = useState<string>('4.7.0');

  useEffect(() => {
    fetch(API_VERSION)
      .then((res) => res.json())
      .then((data: any) => {
        // Solo actualizar si la versión del API es válida y diferente de la actual
        if (data.version && data.version !== gameVersion) {
          setGameVersion(data.version);
        }
      })
      .catch(console.error);
  }, []);

  // Actualizar el título del documento dinámicamente cada vez que cambia la versión
  useEffect(() => {
    if (gameVersion) {
      document.title = `Star Grimoire v${gameVersion} | Tecnomilagros, Ofrendas & Edictos`;
    }
  }, [gameVersion]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <AltarProvider>
      <Router>
        <ScrollToTop />
        <nav className="glass-card desktop-nav" style={{ margin: '1rem', padding: '1rem 2rem', position: 'sticky', top: '1rem', zIndex: 100 }}>
          <div className="brand brand-header">
            <div className="brand-logo-container">
              <img src={logo} alt="Star Grimoire Logo" className="brand-logo" />
              <div style={{ whiteSpace: 'nowrap' }}>Star <span className="accent-cyan">Grimoire</span> <span style={{ fontSize: '0.7em', opacity: 0.5 }}>{gameVersion}</span></div>
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
            <NavLink to="/divinitatus" className="nav-link" style={{ color: 'var(--secondary)' }} onClick={closeMenu}>
              <div>LECTITIO DIVINITATUS</div>
              <div className="nav-link-sub">Lore</div>
            </NavLink>
            <NavLink to="/nexo" className="nav-link" onClick={closeMenu}>
              <div>NEXO ESTELAR</div>
              <div className="nav-link-sub">Mapa</div>
            </NavLink>
            <NavLink to="/missions" className="nav-link" onClick={closeMenu}>
              <div>EDICTOS</div>
              <div className="nav-link-sub">Misiones</div>
            </NavLink>
            <NavLink to="/codice" className="nav-link" onClick={closeMenu}>
              <div>EL CÓDICE</div>
              <div className="nav-link-sub">Objetos</div>
            </NavLink>
            <NavLink to="/datavelo" className="nav-link" style={{ color: 'var(--accent-silver)' }} onClick={closeMenu}>
              <div>DATAVELO</div>
              <div className="nav-link-sub">Datos</div>
            </NavLink>
            <NavCartBadge closeMenu={closeMenu} />
          </div>
        </nav>

        <Breadcrumbs />

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/codice" element={<CodexIndex />} />
          <Route path="/codice/tecnomilagros" element={<Recipes />} />
          <Route path="/codice/ofrendas" element={<Resources />} />
          <Route path="/codice/arcas-estelares" element={<CodexShips />} />
          <Route path="/codice/armamentos" element={<CodexWeapons />} />
          <Route path="/codice/modulos" element={<CodexComponents />} />
          <Route path="/missions" element={<Missions />} />
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
    </AltarProvider>
  );
};


export default App;

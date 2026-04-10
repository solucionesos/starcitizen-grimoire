import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import logo from './assets/logo.png';
import Home from './pages/Home';
import Missions from './pages/Missions';
import Recipes from './pages/Recipes';
import Resources from './pages/Resources';
import Lore from './pages/Lore';
import Rituales from './pages/Rituales';
import ResourceDetail from './pages/ResourceDetail';
import LocationDetail from './pages/LocationDetail';
import Breadcrumbs from './components/Breadcrumbs';
import { AltarProvider, useAltar } from './context/AltarContext';
import Altar from './pages/Altar';

const NavCartBadge: React.FC<{ closeMenu: () => void }> = ({ closeMenu }) => {
  const { cart } = useAltar();
  const total = cart.reduce((acc, item) => acc + item.quantity, 0);
  return (
    <NavLink to="/altar" className="nav-link" style={({ isActive }) => ({ color: isActive ? 'var(--primary)' : 'var(--secondary)' })} onClick={closeMenu}>
      ALTAR [{total}]
    </NavLink>
  );
};

const App: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <AltarProvider>
      <Router>
      <nav className="glass-card desktop-nav" style={{ margin: '1rem', padding: '1rem 2rem', position: 'sticky', top: '1rem', zIndex: 100 }}>
        <div className="brand brand-header">
          <div className="brand-logo-container">
            <img src={logo} alt="Star Grimoire Logo" className="brand-logo" />
            <div style={{ whiteSpace: 'nowrap' }}>Star <span className="accent-cyan">Grimoire</span> <span style={{ fontSize: '0.7em', opacity: 0.5 }}>v4.7.0</span></div>
          </div>
          
          <button className="mobile-menu-btn" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
        
        <div className={`nav-menu ${menuOpen ? 'open' : ''}`}>
          <NavLink to="/" className="nav-link" onClick={closeMenu}>INICIO</NavLink>
          <NavLink to="/lore" className="nav-link" style={{ color: 'var(--secondary)' }} onClick={closeMenu}>CRÓNICA</NavLink>
          <NavLink to="/rituales" className="nav-link" style={{ color: 'var(--secondary)' }} onClick={closeMenu}>RITUALES</NavLink>
          <NavLink to="/missions" className="nav-link" onClick={closeMenu}>EDICTOS</NavLink>
          <NavLink to="/mapa" className="nav-link" onClick={closeMenu}>OFRENDAS</NavLink>
          <NavLink to="/recipes" className="nav-link" onClick={closeMenu}>TECNOMILAGROS</NavLink>
          <NavCartBadge closeMenu={closeMenu} />
        </div>
      </nav>

      <Breadcrumbs />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/recipes" element={<Recipes />} />
        <Route path="/missions" element={<Missions />} />
        <Route path="/mapa" element={<Resources />} />
        <Route path="/recurso/:id" element={<ResourceDetail />} />
        <Route path="/locacion/:system/:name" element={<LocationDetail />} />
        <Route path="/lore" element={<Lore />} />
        <Route path="/rituales" element={<Rituales />} />
        <Route path="/altar" element={<Altar />} />
      </Routes>
    </Router>
    </AltarProvider>
  );
};


export default App;

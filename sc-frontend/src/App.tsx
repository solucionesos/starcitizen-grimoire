import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  NavLink,
  Link,
  Navigate,
  useLocation,
} from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { Menu, X, LogOut, Sparkles, ChevronDown, Shield, UserCheck } from 'lucide-react';
import logo from './assets/logo.png';
import { getCouncilUsers, getVersion } from './api/client';
import { TERMINOLOGY, type TermEntry } from './constants/terminology';
import { AbyssalToastProvider } from './components/AbyssalToast';
import DualLabel from './components/DualLabel';
import Home from './pages/Home';
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
import { AltarProvider } from './context/AltarContext';
import { useAltar } from './context/useAltar';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';
import { AuthModal } from './components/AuthModal';
import Altar from './pages/Altar';
import Footer from './components/Footer';

// Organization, Hermandad, Concilio & Codex Pages
import Edictos from './pages/Edictos';
import Conclave from './pages/Conclave';
import BrotherProfile from './pages/BrotherProfile';
import Hermandad from './pages/Hermandad';
import ConcilioAdmin from './pages/ConcilioAdmin';
import CodexIndex from './pages/CodexIndex';
import CodexMandates from './pages/CodexMandates';
import CodexShips from './pages/CodexShips';
import CodexWeapons from './pages/CodexWeapons';
import CodexComponents from './pages/CodexComponents';

type DropdownId = 'orden' | 'codice' | 'operaciones' | 'user';

interface NavGroupItem {
  to: string;
  term: TermEntry;
}

const ORDEN_ITEMS: readonly NavGroupItem[] = [
  { to: '/hermandad', term: TERMINOLOGY.hermandad },
  { to: '/edictos', term: TERMINOLOGY.edictos },
  { to: '/conclave', term: TERMINOLOGY.conclave },
  { to: '/divinitatus', term: TERMINOLOGY.divinitatus },
];

const CODICE_ITEMS: readonly NavGroupItem[] = [
  { to: '/codice', term: TERMINOLOGY.codice },
  { to: '/codice/mandatos', term: TERMINOLOGY.mandatos },
  { to: '/codice/ofrendas', term: TERMINOLOGY.ofrendas },
  { to: '/codice/tecnomilagros', term: TERMINOLOGY.tecnomilagros },
  { to: '/codice/arcas-estelares', term: TERMINOLOGY.arcasEstelares },
  { to: '/codice/armamentos', term: TERMINOLOGY.armamentos },
  { to: '/codice/modulos', term: TERMINOLOGY.modulos },
];

const OPERACIONES_ITEMS: readonly NavGroupItem[] = [
  { to: '/nexo', term: TERMINOLOGY.nexo },
  { to: '/datavelo', term: TERMINOLOGY.datavelo },
];

const MOBILE_MENU_INLINE_STYLE: React.CSSProperties = {
  position: 'static',
  opacity: 1,
  visibility: 'visible',
  transform: 'none',
  pointerEvents: 'auto',
  minWidth: 'unset',
  width: '100%',
  marginTop: '0.35rem',
};

function useIsMobileViewport(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(max-width: 768px)').matches
      : false,
  );

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(max-width: 768px)');
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}

function handleDropdownKeyDown(
  e: React.KeyboardEvent,
  menuRef: React.RefObject<HTMLDivElement | null>,
  triggerRef: React.RefObject<HTMLButtonElement | null>,
  isOpen: boolean,
  onOpen: () => void,
  onClose: () => void,
) {
  if (e.key === 'Escape') {
    if (isOpen) {
      e.preventDefault();
      e.stopPropagation();
      onClose();
      triggerRef.current?.focus();
    }
    return;
  }

  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
  const key = e.key;
  e.preventDefault();

  if (!isOpen) {
    onOpen();
    window.requestAnimationFrame(() => {
      const items = menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]');
      if (!items || items.length === 0) return;
      if (key === 'ArrowDown') items[0].focus();
      else items[items.length - 1].focus();
    });
    return;
  }

  const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
  if (items.length === 0) return;
  const activeIdx = items.indexOf(document.activeElement as HTMLElement);
  if (key === 'ArrowDown') {
    const nextIdx = activeIdx >= 0 ? (activeIdx + 1) % items.length : 0;
    items[nextIdx].focus();
  } else {
    const prevIdx = activeIdx > 0 ? activeIdx - 1 : items.length - 1;
    items[prevIdx].focus();
  }
}

interface NavDropdownGroupProps {
  id: Exclude<DropdownId, 'user'>;
  label: string;
  subtitle: string;
  items: readonly NavGroupItem[];
  isActiveGroup: boolean;
  openDropdown: DropdownId | null;
  setOpenDropdown: React.Dispatch<React.SetStateAction<DropdownId | null>>;
  isMobile: boolean;
  onNavigate: () => void;
}

const NavDropdownGroup: React.FC<NavDropdownGroupProps> = ({
  id,
  label,
  subtitle,
  items,
  isActiveGroup,
  openDropdown,
  setOpenDropdown,
  isMobile,
  onNavigate,
}) => {
  const { pathname } = useLocation();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const isOpen = openDropdown === id;
  const menuId = `nav-menu-${id}`;

  return (
    <div
      className={`nav-dropdown ${isOpen ? 'open' : ''}`}
      style={isMobile ? { flexDirection: 'column', alignItems: 'stretch', width: '100%' } : undefined}
      onBlur={(e) => {
        if (
          !isMobile &&
          e.relatedTarget instanceof Node &&
          !e.currentTarget.contains(e.relatedTarget)
        ) {
          setOpenDropdown((prev) => (prev === id ? null : prev));
        }
      }}
      onKeyDown={(e) =>
        handleDropdownKeyDown(
          e,
          menuRef,
          triggerRef,
          isOpen,
          () => setOpenDropdown(id),
          () => setOpenDropdown(null),
        )
      }
    >
      <button
        ref={triggerRef}
        type="button"
        className="nav-dropdown-trigger"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-controls={menuId}
        style={{
          color: isActiveGroup || isOpen ? 'var(--secondary)' : undefined,
          borderBottomColor: isActiveGroup ? 'var(--secondary)' : undefined,
          width: isMobile ? '100%' : undefined,
          justifyContent: isMobile ? 'space-between' : undefined,
        }}
        onClick={() => setOpenDropdown((prev) => (prev === id ? null : id))}
      >
        <span style={{ display: 'flex', flexDirection: 'column', alignItems: isMobile ? 'flex-start' : 'center', lineHeight: 1.2 }}>
          <span>{label}</span>
          <span className="nav-link-sub">{subtitle}</span>
        </span>
        <ChevronDown
          size={14}
          aria-hidden="true"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.18s ease',
          }}
        />
      </button>

      {isOpen && (
        <div
          id={menuId}
          ref={menuRef}
          role="menu"
          aria-label={label}
          className="nav-dropdown-menu"
          style={isMobile ? MOBILE_MENU_INLINE_STYLE : undefined}
        >
          {items.map((item) => {
            const itemActive =
              item.to === '/codice'
                ? pathname === '/codice'
                : pathname === item.to || pathname.startsWith(`${item.to}/`);
            return (
              <Link
                key={item.to}
                to={item.to}
                role="menuitem"
                className={`nav-dropdown-item ${itemActive ? 'active' : ''}`}
                onClick={onNavigate}
              >
                <DualLabel sacred={item.term.sacred} tactical={item.term.tactical} size="sm" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

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
      <div className="tabular-nums">ALTAR [{total}]</div>
      <div className="nav-link-sub">Crafting</div>
    </NavLink>
  );
};

interface UserNavSectionProps {
  onOpenAuth: () => void;
  openDropdown: DropdownId | null;
  setOpenDropdown: React.Dispatch<React.SetStateAction<DropdownId | null>>;
  isMobile: boolean;
  onNavigate: () => void;
}

const UserNavSection: React.FC<UserNavSectionProps> = ({
  onOpenAuth,
  openDropdown,
  setOpenDropdown,
  isMobile,
  onNavigate,
}) => {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const [pendingCount, setPendingCount] = useState<number>(0);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const canAccessCouncil =
    Boolean(user) &&
    user!.status === 'approved' &&
    (user!.role === 'admin' || user!.role === 'consejo');

  useEffect(() => {
    if (!canAccessCouncil) {
      let active = true;
      Promise.resolve().then(() => {
        if (active) setPendingCount(0);
      });
      return () => {
        active = false;
      };
    }

    let cancelled = false;
    getCouncilUsers('pending')
      .then((res) => {
        if (!cancelled) {
          setPendingCount(res.pending_count);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPendingCount(0);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [canAccessCouncil, pathname]);

  if (!user) {
    return (
      <button
        type="button"
        onClick={() => {
          onNavigate();
          onOpenAuth();
        }}
        className="btn-primary"
        title={TERMINOLOGY.cruzarUmbral.tactical}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.75rem',
          padding: '0.55rem 1rem',
          letterSpacing: '1px',
          alignSelf: isMobile ? 'stretch' : 'center',
          justifyContent: 'center',
        }}
      >
        <Sparkles size={14} aria-hidden="true" />
        <span>{TERMINOLOGY.cruzarUmbral.sacred.toUpperCase()}</span>
      </button>
    );
  }

  const rankColor = user.rank?.color || 'var(--secondary)';
  const isOpen = openDropdown === 'user';
  const menuId = 'nav-menu-user';

  return (
    <div
      className={`nav-dropdown ${isOpen ? 'open' : ''}`}
      style={{
        alignSelf: isMobile ? 'stretch' : 'center',
        ...(isMobile ? { flexDirection: 'column', alignItems: 'stretch', width: '100%' } : {}),
      }}
      onBlur={(e) => {
        if (
          !isMobile &&
          e.relatedTarget instanceof Node &&
          !e.currentTarget.contains(e.relatedTarget)
        ) {
          setOpenDropdown((prev) => (prev === 'user' ? null : prev));
        }
      }}
      onKeyDown={(e) =>
        handleDropdownKeyDown(
          e,
          menuRef,
          triggerRef,
          isOpen,
          () => setOpenDropdown('user'),
          () => setOpenDropdown(null),
        )
      }
    >
      <button
        ref={triggerRef}
        type="button"
        className="nav-dropdown-trigger"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-controls={menuId}
        aria-label={`Menú de ${user.display_name}`}
        onClick={() => setOpenDropdown((prev) => (prev === 'user' ? null : 'user'))}
        style={{
          padding: '0.35rem 0.65rem',
          width: isMobile ? '100%' : undefined,
          justifyContent: isMobile ? 'space-between' : undefined,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
          <img
            src={user.discord_avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}
            alt={user.display_name}
            width={32}
            height={32}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: `2px solid ${rankColor}`,
              objectFit: 'cover',
              flexShrink: 0,
            }}
          />
          <span style={{ textAlign: 'left', minWidth: 0 }}>
            <span
              style={{
                display: 'block',
                fontSize: '0.78rem',
                color: 'var(--text-main)',
                fontWeight: 'bold',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '140px',
              }}
            >
              {user.display_name}
            </span>
            <span
              style={{
                display: 'block',
                fontSize: '0.62rem',
                color: rankColor,
                fontFamily: 'var(--cinzel-font)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '140px',
              }}
            >
              {user.cargo || user.rank?.name}
            </span>
          </span>
        </span>

        {canAccessCouncil && pendingCount > 0 && (
          <span
            className="tabular-nums"
            title={`${pendingCount} solicitudes pendientes en el Umbral`}
            style={{
              background: 'var(--primary)',
              color: '#fff',
              borderRadius: '999px',
              padding: '0.08rem 0.45rem',
              fontSize: '0.68rem',
              fontWeight: 700,
              border: '1px solid rgba(212, 175, 55, 0.5)',
            }}
          >
            {pendingCount}
          </span>
        )}

        <ChevronDown
          size={14}
          aria-hidden="true"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.18s ease',
            flexShrink: 0,
          }}
        />
      </button>

      {isOpen && (
        <div
          id={menuId}
          ref={menuRef}
          role="menu"
          aria-label="Opciones del Hermano"
          className="nav-dropdown-menu nav-dropdown-menu--right"
          style={isMobile ? MOBILE_MENU_INLINE_STYLE : undefined}
        >
          <Link
            to="/hermano"
            role="menuitem"
            className={`nav-dropdown-item ${pathname === '/hermano' ? 'active' : ''}`}
            onClick={onNavigate}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
              <UserCheck size={15} aria-hidden="true" style={{ color: 'var(--secondary)', flexShrink: 0 }} />
              <DualLabel
                sacred={TERMINOLOGY.hermano.sacred}
                tactical={TERMINOLOGY.hermano.tactical}
                size="sm"
              />
            </span>
          </Link>

          {canAccessCouncil && (
            <Link
              to="/concilio"
              role="menuitem"
              className={`nav-dropdown-item ${pathname === '/concilio' ? 'active' : ''}`}
              onClick={onNavigate}
            >
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem', width: '100%' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', minWidth: 0 }}>
                  <Shield size={15} aria-hidden="true" style={{ color: 'var(--accent-conclave)', flexShrink: 0 }} />
                  <DualLabel
                    sacred={TERMINOLOGY.concilio.sacred}
                    tactical={TERMINOLOGY.concilio.tactical}
                    size="sm"
                  />
                </span>
                {pendingCount > 0 && (
                  <span
                    className="tabular-nums"
                    style={{
                      background: 'var(--primary)',
                      color: '#fff',
                      borderRadius: '999px',
                      padding: '0.1rem 0.5rem',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {pendingCount}
                  </span>
                )}
              </span>
            </Link>
          )}

          <button
            type="button"
            role="menuitem"
            className="nav-dropdown-item"
            onClick={() => {
              onNavigate();
              logout();
            }}
            style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: '0.2rem', paddingTop: '0.65rem' }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', color: '#fca5a5' }}>
              <LogOut size={15} aria-hidden="true" style={{ flexShrink: 0 }} />
              <DualLabel
                sacred="CERRAR SESIÓN"
                tactical="Abandonar el Umbral"
                size="sm"
                sacredColor="#fca5a5"
              />
            </span>
          </button>
        </div>
      )}
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

const AppShell: React.FC = () => {
  const { pathname, search } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<DropdownId | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [gameVersion, setGameVersion] = useState<string>('4.7.0');
  const navRef = useRef<HTMLElement | null>(null);
  const isMobile = useIsMobileViewport();

  useEffect(() => {
    let cancelled = false;
    getVersion()
      .then((res) => {
        if (!cancelled && res.version) {
          setGameVersion(res.version);
        }
      })
      .catch(console.error);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (gameVersion) {
      document.title = `Star Grimoire v${gameVersion} | Ancalagon Oblivion Fleet`;
    }
  }, [gameVersion]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        setOpenDropdown(null);
        setMenuOpen(false);
      }
    });
    return () => {
      active = false;
    };
  }, [pathname, search]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };
    const handleGlobalKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleGlobalKey);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleGlobalKey);
    };
  }, []);

  const closeAllMenus = useCallback(() => {
    setOpenDropdown(null);
    setMenuOpen(false);
  }, []);

  const isOrdenActive = ['/hermandad', '/edictos', '/conclave', '/divinitatus', '/lore', '/rituales'].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  const isCodiceActive = pathname === '/codice' || pathname.startsWith('/codice/');
  const isOperacionesActive = ['/nexo', '/datavelo', '/bovedas', '/wikelo'].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  return (
    <>
      <a href="#main-content" className="skip-link">
        Saltar al contenido principal
      </a>
      <ScrollToTop />
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />

      <nav
        ref={navRef}
        aria-label="Navegación principal"
        className="surface-monolith desktop-nav"
        style={{
          margin: '1rem',
          padding: '0.9rem 1.8rem',
          position: 'sticky',
          top: '1rem',
          zIndex: 100,
        }}
      >
        <div className="brand brand-header">
          <Link
            to="/"
            onClick={closeAllMenus}
            className="brand-logo-container"
            style={{ textDecoration: 'none', color: 'inherit', minWidth: 0, flex: '1 1 auto', flexWrap: 'nowrap' }}
          >
            <img
              src={logo}
              alt="Star Grimoire"
              className="brand-logo"
              width={40}
              height={40}
            />
            <span
              style={{
                display: 'inline-flex',
                flexWrap: 'wrap',
                alignItems: 'baseline',
                columnGap: '0.45rem',
                rowGap: '0.1rem',
                minWidth: 0,
              }}
            >
              <span style={{ whiteSpace: 'nowrap' }}>
                Star <span className="accent-rsi">Grimoire</span>
              </span>
              <span className="tabular-nums" style={{ fontSize: '0.68em', opacity: 0.65, overflowWrap: 'anywhere' }}>
                v{gameVersion}
              </span>
            </span>
          </Link>

          <button
            type="button"
            className="mobile-menu-btn"
            aria-label={menuOpen ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'}
            aria-expanded={menuOpen}
            aria-controls="primary-nav-menu"
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            {menuOpen ? <X size={28} aria-hidden="true" /> : <Menu size={28} aria-hidden="true" />}
          </button>
        </div>

        <div id="primary-nav-menu" className={`nav-menu ${menuOpen ? 'open' : ''}`}>
          <NavLink to="/" end className="nav-link" onClick={closeAllMenus}>
            <div>INICIO</div>
            <div className="nav-link-sub">Portada</div>
          </NavLink>

          <NavDropdownGroup
            id="orden"
            label="LA ORDEN"
            subtitle="Org & Lore"
            items={ORDEN_ITEMS}
            isActiveGroup={isOrdenActive}
            openDropdown={openDropdown}
            setOpenDropdown={setOpenDropdown}
            isMobile={isMobile}
            onNavigate={closeAllMenus}
          />

          <NavDropdownGroup
            id="codice"
            label="EL CÓDICE"
            subtitle="Guía Juego"
            items={CODICE_ITEMS}
            isActiveGroup={isCodiceActive}
            openDropdown={openDropdown}
            setOpenDropdown={setOpenDropdown}
            isMobile={isMobile}
            onNavigate={closeAllMenus}
          />

          <NavDropdownGroup
            id="operaciones"
            label="OPERACIONES"
            subtitle="Mapa & Mercado"
            items={OPERACIONES_ITEMS}
            isActiveGroup={isOperacionesActive}
            openDropdown={openDropdown}
            setOpenDropdown={setOpenDropdown}
            isMobile={isMobile}
            onNavigate={closeAllMenus}
          />

          <NavCartBadge closeMenu={closeAllMenus} />

          <UserNavSection
            onOpenAuth={() => setAuthModalOpen(true)}
            openDropdown={openDropdown}
            setOpenDropdown={setOpenDropdown}
            isMobile={isMobile}
            onNavigate={closeAllMenus}
          />
        </div>
      </nav>

      <Breadcrumbs />

      <main id="main-content" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/hermandad" element={<Hermandad />} />
          <Route path="/hermano/:handle" element={<Hermandad />} />
          <Route path="/edictos" element={<Edictos />} />
          <Route path="/conclave" element={<Conclave />} />
          <Route path="/hermano" element={<BrotherProfile />} />
          <Route path="/concilio" element={<ConcilioAdmin />} />

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
      </main>
      <Footer />
    </>
  );
};

const App: React.FC = () => {
  return (
    <MotionConfig reducedMotion="user">
      <AbyssalToastProvider>
        <AuthProvider>
          <AltarProvider>
            <Router>
              <AppShell />
            </Router>
          </AltarProvider>
        </AuthProvider>
      </AbyssalToastProvider>
    </MotionConfig>
  );
};

export default App;

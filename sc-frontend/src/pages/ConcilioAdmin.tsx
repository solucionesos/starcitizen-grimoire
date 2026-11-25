import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  BookOpen,
  Crown,
  Loader2,
  ScrollText,
  ShieldAlert,
  Swords,
  Users,
} from 'lucide-react';
import { getCouncilUsers } from '../api/client';
import { useAuth } from '../context/useAuth';
import type { BrotherProfile } from '../types';
import { ROLE_META, TERMINOLOGY } from '../constants/terminology';
import DragonIcon from '../components/DragonIcon';
import DualLabel from '../components/DualLabel';
import SealConfirmModal from '../components/SealConfirmModal';
import ConcilioActasTab from '../components/concilio/ConcilioActasTab';
import ConcilioCronicasTab from '../components/concilio/ConcilioCronicasTab';
import ConcilioOperativoTab from '../components/concilio/ConcilioOperativoTab';
import ConcilioPersonalTab from '../components/concilio/ConcilioPersonalTab';
import {
  type ConcilioTab,
  extractApiError,
  isCouncilActor,
  parseConcilioTab,
} from '../components/concilio/concilioHelpers';

const ConcilioAdmin: React.FC = () => {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabPrefix = useId();

  const activeTab = parseConcilioTab(searchParams.get('tab'));
  const authorized = isCouncilActor(user);

  const [users, setUsers] = useState<BrotherProfile[]>([]);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [usersLoading, setUsersLoading] = useState<boolean>(true);
  const [usersError, setUsersError] = useState<string | null>(null);
  const cronicasDirtyRef = useRef<boolean>(false);
  const [pendingTabSwitch, setPendingTabSwitch] = useState<ConcilioTab | null>(null);

  const handleCronicasDirtyChange = useCallback((dirty: boolean) => {
    cronicasDirtyRef.current = dirty;
  }, []);

  useEffect(() => {
    document.title = 'Star Grimoire | Cámara del Concilio';
  }, []);

  const refreshCouncilUsers = useCallback(async () => {
    if (!authorized) return;
    try {
      const res = await getCouncilUsers();
      setUsers(res.users);
      setPendingCount(res.pending_count);
      setUsersError(null);
    } catch (err: unknown) {
      setUsersError(
        extractApiError(err, 'No se pudo cargar el censo de la Hermandad.'),
      );
    } finally {
      setUsersLoading(false);
    }
  }, [authorized]);

  useEffect(() => {
    if (!authorized) return;
    let active = true;
    void (async () => {
      try {
        const res = await getCouncilUsers();
        if (!active) return;
        setUsers(res.users);
        setPendingCount(res.pending_count);
        setUsersError(null);
      } catch (err: unknown) {
        if (!active) return;
        setUsersError(
          extractApiError(err, 'No se pudo cargar el censo de la Hermandad.'),
        );
      } finally {
        if (active) setUsersLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [authorized]);

  const selectTab = (nextTab: ConcilioTab) => {
    if (nextTab === activeTab) return;
    if (activeTab === 'cronicas' && cronicasDirtyRef.current) {
      setPendingTabSwitch(nextTab);
      return;
    }
    setSearchParams({ tab: nextTab });
  };

  if (authLoading) {
    return (
      <div
        style={{
          maxWidth: '920px',
          margin: '3rem auto',
          padding: '0 1.25rem',
        }}
      >
        <div
          className="surface-monolith"
          style={{ padding: '4rem 2rem', textAlign: 'center' }}
        >
          <Loader2
            size={36}
            className="spin"
            aria-hidden="true"
            style={{ color: 'var(--secondary)', marginBottom: '1rem' }}
          />
          <p
            style={{
              margin: 0,
              fontFamily: 'var(--cinzel-font)',
              color: 'var(--secondary)',
              letterSpacing: '2px',
            }}
          >
            Abriendo las Cámaras del Concilio…
          </p>
        </div>
      </div>
    );
  }

  if (!authorized || !user) {
    const denialDetail = !user
      ? 'Debes cruzar el Umbral con una cuenta autorizada del Consejo o del Heraldo para acceder a la Cámara del Concilio.'
      : user.status !== 'approved'
        ? 'Tu expediente aún no está consagrado en la Hermandad. Solo miembros aprobados del Consejo o el Heraldo pueden ingresar.'
        : 'Tu rango técnico actual no posee autoridad en el Concilio del Vacío. Esta cámara está reservada a Profetas del Concilio y al Heraldo Soberano.';

    return (
      <div
        style={{
          maxWidth: '760px',
          margin: '3.5rem auto',
          padding: '0 1.25rem',
        }}
      >
        <section
          className="surface-monolith"
          style={{
            padding: '2.5rem 2rem',
            borderTop: '3px solid var(--primary)',
            textAlign: 'center',
          }}
        >
          <ShieldAlert
            size={42}
            aria-hidden="true"
            style={{ color: 'var(--primary)', marginBottom: '1rem' }}
          />
          <h1
            style={{
              margin: '0 0 1rem',
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <DualLabel
              sacred="ACCESO VEDADO POR EL CONCILIO"
              tactical="Requiere rol Consejo o Administrador aprobado"
              size="lg"
              align="center"
              sacredColor="var(--primary)"
            />
          </h1>
          <h2 className="sr-only">Requisitos de Acceso</h2>
          <p
            className="prose-grimoire"
            style={{
              margin: '0 auto 1.75rem',
              color: 'var(--accent-silver)',
              fontSize: '0.98rem',
            }}
          >
            {denialDetail}
          </p>

          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '0.85rem',
              flexWrap: 'wrap',
            }}
          >
            <Link to="/" className="btn-primary">
              Volver al Umbral
            </Link>
            {user && (
              <Link to="/hermano" className="btn-secondary">
                Ir a Mi Expediente
              </Link>
            )}
          </div>
        </section>
      </div>
    );
  }

  const actorRoleMeta = ROLE_META[user.role] ?? ROLE_META.consejo;

  const tabs: Array<{
    id: ConcilioTab;
    sacred: string;
    tactical: string;
    icon: React.ReactNode;
    badge?: number;
  }> = [
    {
      id: 'personal',
      sacred: 'Personal & Vínculos',
      tactical: 'Candidatos, Roster, Rangos & Marcas',
      icon: <Users size={18} aria-hidden="true" />,
      badge: pendingCount,
    },
    {
      id: 'operativo',
      sacred: 'Mando Operativo',
      tactical: 'Veredictos, Cruzadas, Designios & Cónclave',
      icon: <Swords size={18} aria-hidden="true" />,
    },
    {
      id: 'cronicas',
      sacred: 'Escriba del Divinitatus',
      tactical: 'Editor Visual de Crónicas',
      icon: <ScrollText size={18} aria-hidden="true" />,
    },
    {
      id: 'actas',
      sacred: 'Libro de Actas',
      tactical: 'Historial de Auditoría del Concilio',
      icon: <BookOpen size={18} aria-hidden="true" />,
    },
  ];

  return (
    <div
      style={{
        maxWidth: '1320px',
        margin: '0 auto',
        padding: '1.5rem 1.25rem 4rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
      }}
    >
      {/* Sovereign Command Header */}
      <header
        className="surface-monolith"
        style={{
          padding: '1.6rem 1.8rem',
          borderTop: '3px solid var(--secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.25rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0 }}>
          <DragonIcon size={44} />
          <div style={{ minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: 'inherit', letterSpacing: 'normal', textShadow: 'none' }}>
              <DualLabel
                sacred={TERMINOLOGY.concilio.sacred}
                tactical={TERMINOLOGY.concilio.tactical}
                size="lg"
                sacredColor="var(--secondary)"
              />
            </h1>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.7rem',
            padding: '0.65rem 1rem',
            borderRadius: '4px',
            border: `1px solid ${actorRoleMeta.color}`,
            background: 'rgba(10, 4, 5, 0.75)',
          }}
        >
          <Crown size={18} aria-hidden="true" style={{ color: actorRoleMeta.color, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main)' }}>
              {user.display_name} · {actorRoleMeta.sacred}
            </div>
            <div style={{ fontSize: '0.76rem', color: 'var(--accent-silver)' }}>
              {user.role === 'admin'
                ? 'Autoridad Total: Rangos I–VI y todos los roles'
                : 'Autoridad de Consejo: Rangos I–IV (Heraldo y Profetas protegidos)'}
            </div>
          </div>
        </div>
      </header>

      {/* 4-Module Tab Navigation */}
      <nav
        aria-label="Módulos de la Cámara del Concilio"
        role="tablist"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '0.75rem',
        }}
      >
        {tabs.map((tab, idx) => {
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`${tabPrefix}-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={isSelected}
              aria-controls={`${tabPrefix}-panel-${tab.id}`}
              onClick={() => selectTab(tab.id)}
              onKeyDown={(e) => {
                let targetIdx: number | null = null;
                if (e.key === 'ArrowRight') targetIdx = (idx + 1) % tabs.length;
                else if (e.key === 'ArrowLeft') targetIdx = (idx - 1 + tabs.length) % tabs.length;
                else if (e.key === 'Home') targetIdx = 0;
                else if (e.key === 'End') targetIdx = tabs.length - 1;
                if (targetIdx !== null) {
                  e.preventDefault();
                  const next = tabs[targetIdx];
                  if (activeTab === 'cronicas' && cronicasDirtyRef.current) {
                    setPendingTabSwitch(next.id);
                    return;
                  }
                  selectTab(next.id);
                  document.getElementById(`${tabPrefix}-tab-${next.id}`)?.focus();
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
                padding: '0.9rem 1.05rem',
                borderRadius: '4px',
                border: `1px solid ${isSelected ? 'var(--secondary)' : 'var(--border)'}`,
                borderBottom: isSelected
                  ? '3px solid var(--secondary)'
                  : '3px solid transparent',
                background: isSelected
                  ? 'rgba(212, 175, 55, 0.1)'
                  : 'rgba(16, 8, 9, 0.85)',
                color: isSelected ? 'var(--secondary)' : 'var(--text-muted)',
                cursor: 'pointer',
                textAlign: 'left',
                transition:
                  'border-color 0.2s ease, background-color 0.2s ease, color 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', minWidth: 0 }}>
                <span style={{ color: isSelected ? 'var(--secondary)' : 'var(--text-muted)', flexShrink: 0 }}>
                  {tab.icon}
                </span>
                <DualLabel
                  sacred={tab.sacred}
                  tactical={tab.tactical}
                  size="sm"
                  sacredColor={isSelected ? 'var(--secondary)' : 'var(--text-main)'}
                />
              </div>

              {typeof tab.badge === 'number' && tab.badge > 0 && (
                <span
                  className="tabular-nums"
                  style={{
                    padding: '0.15rem 0.5rem',
                    borderRadius: '999px',
                    background: 'rgba(245, 158, 11, 0.2)',
                    border: '1px solid rgba(245, 158, 11, 0.55)',
                    color: 'var(--status-warn)',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Active Tab Panel */}
      <div
        id={`${tabPrefix}-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`${tabPrefix}-tab-${activeTab}`}
      >
        {activeTab === 'personal' && (
          <ConcilioPersonalTab
            actor={user}
            users={users}
            pendingCount={pendingCount}
            loading={usersLoading}
            error={usersError}
            onRefresh={refreshCouncilUsers}
            onSelfMutated={refreshUser}
          />
        )}

        {activeTab === 'operativo' && <ConcilioOperativoTab />}

        {activeTab === 'cronicas' && (
          <ConcilioCronicasTab onDirtyChange={handleCronicasDirtyChange} />
        )}

        {activeTab === 'actas' && <ConcilioActasTab />}
      </div>

      <SealConfirmModal
        isOpen={pendingTabSwitch !== null}
        title="Descartar Cambios Sin Sellar"
        message="Tienes cambios sin guardar en el Escriba del Divinitatus. ¿Deseas cambiar de módulo y descartar el borrador actual?"
        confirmLabel="Descartar y Cambiar"
        variant="gold"
        onCancel={() => setPendingTabSwitch(null)}
        onConfirm={() => {
          const target = pendingTabSwitch;
          setPendingTabSwitch(null);
          cronicasDirtyRef.current = false;
          if (target) {
            setSearchParams({ tab: target });
          }
        }}
      />
    </div>
  );
};

export default ConcilioAdmin;

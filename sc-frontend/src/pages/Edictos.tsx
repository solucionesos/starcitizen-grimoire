import React, { useCallback, useEffect, useId, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
  Target,
  Rocket,
  Calendar as CalendarIcon,
  Plus,
  CheckCircle,
  Shield,
  User,
  MapPin,
  Flame,
  AlertCircle,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/useAuth';
import {
  createCrusade,
  createObjective,
  getCalendarEvents,
  getCrusadeById,
  getCrusades,
  getMyShips,
  getObjectives,
  getRoster,
  leaveCrusade,
  signupCrusade,
  updateObjective,
  verifyObjective,
} from '../api/client';
import type {
  BrotherProfile,
  CalendarEvent,
  Crusade,
  CrusadeDetail,
  MemberShip,
  Objective,
  ObjectiveCategory,
  ObjectiveScope,
} from '../types';
import {
  CRUSADE_CREW_ROLES,
  TACTICAL_TOOLTIPS,
  TERMINOLOGY,
} from '../constants/terminology';
import DragonIcon from '../components/DragonIcon';
import { DualLabel, TacticalTooltip } from '../components/DualLabel';
import { useToast } from '../components/AbyssalToast';
import SealConfirmModal from '../components/SealConfirmModal';
import { toAbyssalYear } from '../utils/abyssalDate';

type EdictosTab = 'designios' | 'cruzadas' | 'calendario';
type ObjectiveScopeFilter = 'all' | 'org' | 'mine';

const CLOSED_CRUSADE_STATUSES = new Set(['victoriosa', 'completada', 'archivada', 'cancelada']);
const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'] as const;

function parseUtcDate(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const dateOnlyRe = /^\d{4}-\d{2}-\d{2}$/;
  const sqliteUtcRe = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/;
  const isoNaiveRe = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/;

  let normalized = trimmed;
  if (dateOnlyRe.test(trimmed)) normalized = `${trimmed}T00:00:00Z`;
  else if (sqliteUtcRe.test(trimmed)) normalized = `${trimmed.replace(' ', 'T')}Z`;
  else if (isoNaiveRe.test(trimmed)) normalized = `${trimmed}Z`;

  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatAbyssalUtc(
  raw: string | null | undefined,
  options: { includeTime?: boolean; prefixCycle?: boolean } = {},
): string {
  if (!raw) return 'Ciclo Indeterminado';
  const d = parseUtcDate(raw);
  if (!d) {
    return raw.replace(/\b(202\d)\b/g, (_, y: string) => String(Number(y) + 930));
  }
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = MONTHS_ES[d.getUTCMonth()] ?? 'Ene';
  const year = toAbyssalYear(d.getUTCFullYear());
  const cycleText = options.prefixCycle ? `Ciclo ${year}` : `${year}`;
  if (options.includeTime) {
    const hours = String(d.getUTCHours()).padStart(2, '0');
    const mins = String(d.getUTCMinutes()).padStart(2, '0');
    return `${day} ${month} ${cycleText} · ${hours}:${mins} UTC`;
  }
  return `${day} ${month} ${cycleText}`;
}

function extractErrorMsg(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: unknown; message?: unknown } | undefined;
    if (typeof data?.error === 'string' && data.error.trim()) return data.error;
    if (typeof data?.message === 'string' && data.message.trim()) return data.message;
  }
  if (err instanceof Error && err.message.trim()) return err.message;
  return fallback;
}

function parseTab(raw: string | null): EdictosTab {
  if (raw === 'designios' || raw === 'cruzadas' || raw === 'calendario') return raw;
  return 'designios';
}

function parseScope(raw: string | null): ObjectiveScopeFilter {
  if (raw === 'all' || raw === 'org' || raw === 'mine') return raw;
  return 'all';
}

interface CrusadeSignupControlsProps {
  crusadeId: string;
  operationalShips: MemberShip[];
  onSubmit: (
    crusadeId: string,
    payload: { member_ship_id?: string | null; ship_brought?: string | null; role_assigned: string },
  ) => Promise<void>;
}

const CrusadeSignupControls: React.FC<CrusadeSignupControlsProps> = ({
  crusadeId,
  operationalShips,
  onSubmit,
}) => {
  const controlId = useId();
  const [mode, setMode] = useState<'ship' | 'crew'>(() =>
    operationalShips.length > 0 ? 'ship' : 'crew',
  );
  const [selectedShipId, setSelectedShipId] = useState<string>(() => operationalShips[0]?.id ?? '');
  const [selectedRole, setSelectedRole] = useState<string>(() =>
    operationalShips.length > 0 ? CRUSADE_CREW_ROLES[1].label : CRUSADE_CREW_ROLES[2].label,
  );
  const [submitting, setSubmitting] = useState(false);

  const resolvedShipId =
    operationalShips.some((s) => s.id === selectedShipId)
      ? selectedShipId
      : (operationalShips[0]?.id ?? '');

  const handleModeChange = (nextMode: 'ship' | 'crew') => {
    setMode(nextMode);
    if (nextMode === 'crew' && (selectedRole === CRUSADE_CREW_ROLES[0].label || selectedRole === CRUSADE_CREW_ROLES[1].label)) {
      setSelectedRole(CRUSADE_CREW_ROLES[2].label);
    } else if (nextMode === 'ship' && selectedRole === CRUSADE_CREW_ROLES[2].label) {
      setSelectedRole(CRUSADE_CREW_ROLES[1].label);
    }
  };

  const handleSignup = async () => {
    if (mode === 'ship' && !resolvedShipId) return;
    setSubmitting(true);
    try {
      if (mode === 'ship') {
        await onSubmit(crusadeId, {
          member_ship_id: resolvedShipId,
          role_assigned: selectedRole,
        });
      } else {
        await onSubmit(crusadeId, {
          member_ship_id: null,
          ship_brought: null,
          role_assigned: selectedRole,
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.6rem',
        alignItems: 'flex-end',
        width: '100%',
        maxWidth: '580px',
      }}
    >
      <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <button
          type="button"
          className={`filter-btn ${mode === 'ship' ? 'active' : ''}`}
          aria-pressed={mode === 'ship'}
          onClick={() => handleModeChange('ship')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem' }}
        >
          <Rocket size={13} aria-hidden="true" />
          Desplegar Nave Propia
        </button>
        <button
          type="button"
          className={`filter-btn ${mode === 'crew' ? 'active' : ''}`}
          aria-pressed={mode === 'crew'}
          onClick={() => handleModeChange('crew')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem' }}
        >
          <Users size={13} aria-hidden="true" />
          Dotación / Infantería (Sin nave propia)
        </button>
      </div>

      {mode === 'ship' && operationalShips.length === 0 ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            flexWrap: 'wrap',
            justifyContent: 'flex-end',
            padding: '0.55rem 0.85rem',
            borderRadius: '4px',
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            fontSize: '0.78rem',
            color: 'var(--accent-silver)',
          }}
        >
          <span>No tienes naves operativas registradas en tu Hangar.</span>
          <Link to="/hermano?tab=arcas" className="btn-secondary" style={{ fontSize: '0.72rem', padding: '0.35rem 0.7rem' }}>
            Registrar nave operativa
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {mode === 'ship' && (
            <div>
              <label htmlFor={`${controlId}-ship`} className="sr-only">
                Seleccionar nave operativa de tu hangar
              </label>
              <select
                id={`${controlId}-ship`}
                name="memberShipId"
                className="select-filter"
                value={resolvedShipId}
                onChange={(e) => setSelectedShipId(e.target.value)}
                style={{ width: 'auto', minWidth: '210px', padding: '0.45rem 0.7rem', fontSize: '0.8rem' }}
              >
                {operationalShips.map((ship) => (
                  <option key={ship.id} value={ship.id}>
                    {ship.ship_name}
                    {ship.callsign ? ` — “${ship.callsign}”` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label htmlFor={`${controlId}-role`} className="sr-only">
              Rol táctico en la cruzada
            </label>
            <select
              id={`${controlId}-role`}
              name="roleAssigned"
              className="select-filter"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              style={{ width: 'auto', minWidth: '205px', padding: '0.45rem 0.7rem', fontSize: '0.8rem' }}
            >
              {CRUSADE_CREW_ROLES.map((role) => (
                <option key={role.id} value={role.label}>
                  {role.sacred} · {role.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="btn-primary"
            disabled={submitting}
            style={{ fontSize: '0.75rem', padding: '0.55rem 1rem' }}
            onClick={() => void handleSignup()}
          >
            {submitting
              ? 'SELLANDO…'
              : mode === 'ship'
                ? 'JURAR SANGRE Y NAVE'
                : 'ALISTARSE EN DOTACIÓN'}
          </button>
        </div>
      )}
    </div>
  );
};

export const Edictos: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const formIdPrefix = useId();

  const activeTab = parseTab(searchParams.get('tab'));
  const scopeFilter = parseScope(searchParams.get('scope'));

  // Designios state
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [roster, setRoster] = useState<BrotherProfile[]>([]);
  const [loadingObjectives, setLoadingObjectives] = useState(true);
  const [showCreateObjective, setShowCreateObjective] = useState(false);
  const [newObjTitle, setNewObjTitle] = useState('');
  const [newObjDesc, setNewObjDesc] = useState('');
  const [newObjScope, setNewObjScope] = useState<ObjectiveScope>('org');
  const [newObjAssignee, setNewObjAssignee] = useState<string>('');
  const [newObjCategory, setNewObjCategory] = useState<ObjectiveCategory>('general');
  const [newObjDate, setNewObjDate] = useState('');

  // Cruzadas state
  const [crusades, setCrusades] = useState<Crusade[]>([]);
  const [myShips, setMyShips] = useState<MemberShip[]>([]);
  const [shipsLoaded, setShipsLoaded] = useState(false);
  const [loadingCrusades, setLoadingCrusades] = useState(true);
  const [selectedCrusade, setSelectedCrusade] = useState<CrusadeDetail | null>(null);
  const [showCreateCrusade, setShowCreateCrusade] = useState(false);
  const [leaveConfirmCrusade, setLeaveConfirmCrusade] = useState<Crusade | null>(null);
  const [leavingLoading, setLeavingLoading] = useState(false);

  // New Crusade Form
  const [crusadeTitle, setCrusadeTitle] = useState('');
  const [crusadeDesc, setCrusadeDesc] = useState('');
  const [crusadeBriefing, setCrusadeBriefing] = useState('');
  const [crusadeLocation, setCrusadeLocation] = useState('Pyro VI — Ruin Station');
  const [crusadeDate, setCrusadeDate] = useState('');
  const [crusadeShips, setCrusadeShips] = useState('');

  // Calendar events
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);

  const isApproved = Boolean(user && user.status === 'approved');
  const isOfficerOrCouncil = Boolean(user && ['oficial', 'consejo', 'admin'].includes(user.role));
  const operationalShips = myShips.filter((s) => s.status === 'operativa');

  const setActiveTab = (tab: EdictosTab) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    if (tab !== 'designios') {
      next.delete('scope');
    }
    setSearchParams(next, { replace: true });
  };

  const setScopeFilter = (scope: ObjectiveScopeFilter) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'designios');
    next.set('scope', scope);
    setSearchParams(next, { replace: true });
  };

  const refreshObjectives = useCallback(async () => {
    setLoadingObjectives(true);
    try {
      const data = await getObjectives();
      setObjectives(data);
    } catch (err) {
      showToast(extractErrorMsg(err, 'No se pudieron consultar los Designios'), 'error');
    } finally {
      setLoadingObjectives(false);
    }
  }, [showToast]);

  const refreshRoster = useCallback(async () => {
    try {
      const data = await getRoster();
      setRoster(data);
    } catch (err) {
      console.error('Error fetching roster:', err);
    }
  }, []);

  const refreshCrusades = useCallback(async () => {
    setLoadingCrusades(true);
    try {
      const data = await getCrusades();
      setCrusades(data);
    } catch (err) {
      showToast(extractErrorMsg(err, 'No se pudieron cargar los Edictos de Cruzada'), 'error');
    } finally {
      setLoadingCrusades(false);
    }
  }, [showToast]);

  const refreshMyShips = useCallback(async () => {
    try {
      const data = await getMyShips();
      setMyShips(data);
    } catch (err) {
      console.error('Error fetching personal hangar:', err);
    } finally {
      setShipsLoaded(true);
    }
  }, []);

  const refreshCalendar = useCallback(async () => {
    try {
      const data = await getCalendarEvents();
      setCalendarEvents(data);
    } catch (err) {
      console.error('Error fetching calendar:', err);
    }
  }, []);

  useEffect(() => {
    document.title = 'Star Grimoire | Edictos Sagrados';
  }, []);

  useEffect(() => {
    if (!isApproved) return;
    let cancelled = false;
    void Promise.resolve().then(async () => {
      if (cancelled) return;
      await Promise.all([
        refreshObjectives(),
        refreshRoster(),
        refreshCrusades(),
        refreshMyShips(),
        refreshCalendar(),
      ]);
    });
    return () => {
      cancelled = true;
    };
  }, [isApproved, refreshObjectives, refreshRoster, refreshCrusades, refreshMyShips, refreshCalendar]);

  const handleCreateObjective = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newObjTitle.trim()) return;

    try {
      await createObjective({
        title: newObjTitle.trim(),
        description: newObjDesc.trim() || undefined,
        scope: newObjScope,
        category: newObjCategory,
        due_date: newObjDate || undefined,
        assigned_to: newObjAssignee || (newObjScope === 'individual' ? user?.id : undefined),
      });
      setShowCreateObjective(false);
      setNewObjTitle('');
      setNewObjDesc('');
      setNewObjAssignee('');
      setNewObjDate('');
      showToast('Designio Sagrado sellado en el expediente de la Flota.', 'success');
      void refreshObjectives();
      void refreshCalendar();
    } catch (err) {
      showToast(extractErrorMsg(err, 'No se pudo sellar el Designio'), 'error');
    }
  };

  const handleUpdateProgress = async (id: string, newProgress: number) => {
    try {
      await updateObjective(id, { progress: newProgress });
      showToast(`Progreso del Designio actualizado al ${newProgress}%.`, 'info');
      void refreshObjectives();
    } catch (err) {
      showToast(extractErrorMsg(err, 'Error al actualizar el progreso'), 'error');
    }
  };

  const handleVerifyObjective = async (id: string) => {
    try {
      await verifyObjective(id);
      showToast('Marca del Abismo otorgada al Designio.', 'success');
      void refreshObjectives();
    } catch (err) {
      showToast(extractErrorMsg(err, 'No se pudo verificar el Designio'), 'error');
    }
  };

  const handleSignupCrusade = async (
    crusadeId: string,
    payload: { member_ship_id?: string | null; ship_brought?: string | null; role_assigned: string },
  ) => {
    try {
      const res = await signupCrusade(crusadeId, payload);
      showToast(res.message || 'Juramento de Cruzada inscrito ante el Concilio.', 'success');
      await refreshCrusades();
      if (selectedCrusade?.id === crusadeId) {
        const detail = await getCrusadeById(crusadeId);
        setSelectedCrusade(detail);
      }
    } catch (err) {
      showToast(extractErrorMsg(err, 'Error al responder al llamado de Cruzada'), 'error');
    }
  };

  const confirmLeaveCrusade = async () => {
    if (!leaveConfirmCrusade) return;
    setLeavingLoading(true);
    try {
      await leaveCrusade(leaveConfirmCrusade.id);
      showToast('Te has apartado de la formación de Cruzada.', 'info');
      const targetId = leaveConfirmCrusade.id;
      setLeaveConfirmCrusade(null);
      await refreshCrusades();
      if (selectedCrusade?.id === targetId) {
        const detail = await getCrusadeById(targetId);
        setSelectedCrusade(detail);
      }
    } catch (err) {
      showToast(extractErrorMsg(err, 'Error al apartarse de la Cruzada'), 'error');
    } finally {
      setLeavingLoading(false);
    }
  };

  const handleCreateCrusade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!crusadeTitle.trim() || !crusadeDate || !crusadeLocation.trim()) return;

    const parsedDate = new Date(crusadeDate);
    if (Number.isNaN(parsedDate.getTime())) {
      showToast('Indica una fecha y hora válidas para el salto.', 'error');
      return;
    }

    const shipsArray = crusadeShips
      ? crusadeShips
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : ['Contingente del Vacío'];

    const ritualBriefing =
      crusadeBriefing.trim() ||
      `Por decreto de ${user?.rank?.title || 'los Profetas de la Ruina'}, se ordena ${crusadeTitle.trim()} en ${crusadeLocation.trim()}. El incumplimiento es una ofensa contra el Abismo. La recompensa: la Marca del Abismo. El costo del fracaso: el silencio. IN NOMINI OBLIVIONIS.`;

    try {
      await createCrusade({
        title: crusadeTitle.trim(),
        description: crusadeDesc.trim() || undefined,
        briefing: ritualBriefing,
        location: crusadeLocation.trim(),
        operation_date: parsedDate.toISOString(),
        ships_required: shipsArray,
      });
      setShowCreateCrusade(false);
      setCrusadeTitle('');
      setCrusadeDesc('');
      setCrusadeBriefing('');
      setCrusadeDate('');
      setCrusadeShips('');
      showToast('Edicto de Cruzada proclamado en el Calendario Abisal.', 'success');
      void refreshCrusades();
      void refreshCalendar();
    } catch (err) {
      showToast(extractErrorMsg(err, 'Error al proclamar el Edicto de Cruzada'), 'error');
    }
  };

  const loadCrusadeDetails = async (id: string) => {
    try {
      const detail = await getCrusadeById(id);
      setSelectedCrusade(detail);
    } catch (err) {
      showToast(extractErrorMsg(err, 'No se pudo cargar el escuadrón juramentado'), 'error');
    }
  };

  const filteredObjectives = objectives.filter((obj) => {
    if (scopeFilter === 'org') return obj.scope === 'org';
    if (scopeFilter === 'mine') return obj.assigned_to === user?.id || obj.creator_id === user?.id;
    return true;
  });

  return (
    <div style={{ padding: '0 2rem 5rem', maxWidth: '1200px', margin: '0 auto' }}>
      <SealConfirmModal
        isOpen={Boolean(leaveConfirmCrusade)}
        title="Apartarse del Edicto de Cruzada"
        message={
          leaveConfirmCrusade
            ? `Vas a retirar tu juramento de «${leaveConfirmCrusade.title}». Esta acción conlleva el estigma de La Ceniza Fría si no fue autorizada por tu oficial de escuadra.`
            : ''
        }
        confirmLabel="Confirmar Retirada"
        cancelLabel="Permanecer en Formación"
        variant="danger"
        isLoading={leavingLoading}
        onConfirm={confirmLeaveCrusade}
        onCancel={() => setLeaveConfirmCrusade(null)}
      />

      {/* Hero Header */}
      <div style={{ textAlign: 'center', marginBottom: '2.2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.9rem', marginBottom: '0.6rem' }}>
          <DragonIcon size={34} />
          <h1 style={{ margin: 0 }}>
            <DualLabel
              sacred={TERMINOLOGY.edictos.sacred}
              tactical={TERMINOLOGY.edictos.tactical}
              size="lg"
              align="center"
              sacredColor="var(--secondary)"
            />
          </h1>
        </div>
        <p className="prose-grimoire" style={{ color: 'var(--text-muted)', fontSize: '1.02rem', margin: '0 auto 1rem' }}>
          La voluntad del <strong>Concilio del Vacío</strong> grabada en piedra: Designios de la Flota, Edictos de Sangre y
          el Calendario Abisal del Ciclo 2956.
        </p>
        <div
          style={{
            display: 'inline-block',
            padding: '0.45rem 1.2rem',
            background: 'rgba(196, 30, 58, 0.08)',
            border: '1px solid rgba(212, 175, 55, 0.25)',
            borderRadius: '4px',
            fontSize: '0.78rem',
            color: 'var(--accent-silver)',
            fontStyle: 'italic',
          }}
        >
          «El incumplimiento es una ofensa contra el Abismo. La recompensa: la Marca del Abismo. El costo del fracaso: el
          silencio. IN NOMINI OBLIVIONIS.»
        </div>
      </div>

      {/* Tabs navigation (only shown to approved brothers who have tabpanels) */}
      {isApproved && (
        <div
          role="tablist"
          aria-label="Secciones de Edictos Sagrados"
          className="surface-monolith"
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '0.8rem',
            padding: '0.65rem',
            marginBottom: '2.5rem',
            borderBottom: '2px solid rgba(212, 175, 55, 0.2)',
            flexWrap: 'wrap',
          }}
        >
          <button
            id={`${formIdPrefix}-tab-designios`}
            type="button"
            role="tab"
            aria-selected={activeTab === 'designios'}
            aria-controls={activeTab === 'designios' ? `${formIdPrefix}-panel-designios` : undefined}
            className={`filter-btn ${activeTab === 'designios' ? 'active' : ''}`}
            onClick={() => setActiveTab('designios')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.55rem', padding: '0.6rem 1.2rem' }}
          >
            <Target size={16} aria-hidden="true" />
            <DualLabel
              sacred={TERMINOLOGY.designios.sacred}
              tactical={TERMINOLOGY.designios.tactical}
              size="sm"
            />
          </button>

          <button
            id={`${formIdPrefix}-tab-cruzadas`}
            type="button"
            role="tab"
            aria-selected={activeTab === 'cruzadas'}
            aria-controls={activeTab === 'cruzadas' ? `${formIdPrefix}-panel-cruzadas` : undefined}
            className={`filter-btn ${activeTab === 'cruzadas' ? 'active' : ''}`}
            onClick={() => setActiveTab('cruzadas')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.55rem', padding: '0.6rem 1.2rem' }}
          >
            <Rocket size={16} aria-hidden="true" />
            <DualLabel
              sacred={TERMINOLOGY.cruzadas.sacred}
              tactical={TERMINOLOGY.cruzadas.tactical}
              size="sm"
            />
          </button>

          <button
            id={`${formIdPrefix}-tab-calendario`}
            type="button"
            role="tab"
            aria-selected={activeTab === 'calendario'}
            aria-controls={activeTab === 'calendario' ? `${formIdPrefix}-panel-calendario` : undefined}
            className={`filter-btn ${activeTab === 'calendario' ? 'active' : ''}`}
            onClick={() => setActiveTab('calendario')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.55rem', padding: '0.6rem 1.2rem' }}
          >
            <CalendarIcon size={16} aria-hidden="true" />
            <DualLabel
              sacred={`${TERMINOLOGY.calendario.sacred} (Ciclo 2956)`}
              tactical={TERMINOLOGY.calendario.tactical}
              size="sm"
            />
          </button>
        </div>
      )}

      {/* Restricted Warning if visitor/pending */}
      {!isApproved && (
        <div
          className="surface-monolith"
          style={{
            textAlign: 'center',
            padding: '3rem 2rem',
            borderTop: '3px solid var(--primary)',
            maxWidth: '650px',
            margin: '0 auto',
          }}
        >
          <AlertCircle size={44} aria-hidden="true" style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
          <h2 style={{ fontFamily: 'var(--cinzel-font)', color: 'var(--secondary)', fontSize: '1.4rem', margin: '0 0 0.8rem' }}>
            SELLADO ANTE LOS NO INICIADOS
          </h2>
          <p className="prose-grimoire" style={{ color: 'var(--text-muted)', margin: '0 auto 1.5rem' }}>
            Los Edictos Sagrados de <strong>Ancalagon Oblivion Fleet</strong> están vedados a quienes aún pertenecen a
            La Gran Mentira. Debes cruzar el Umbral y superar el Ritual de Iniciación ante el Concilio del Vacío.
          </p>
          <div style={{ fontSize: '0.8rem', color: 'var(--secondary)', fontFamily: 'var(--cinzel-font)', letterSpacing: '2px' }}>
            IN NOMINI OBLIVIONIS
          </div>
        </div>
      )}

      {/* TAB 1: DESIGNIOS */}
      {isApproved && activeTab === 'designios' && (
        <div
          id={`${formIdPrefix}-panel-designios`}
          role="tabpanel"
          aria-labelledby={`${formIdPrefix}-tab-designios`}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 style={{ margin: 0 }}>
              <DualLabel
                sacred="DESIGNIOS DE LA FLOTA Y ENCOMIENDAS"
                tactical={TERMINOLOGY.designios.tactical}
                size="md"
                sacredColor="var(--secondary)"
              />
            </h2>

            <button
              type="button"
              onClick={() => setShowCreateObjective((v) => !v)}
              className="btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', padding: '0.6rem 1.2rem' }}
            >
              <Plus size={16} aria-hidden="true" />
              PROCLAMAR NUEVO DESIGNIO
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            {(['all', 'org', 'mine'] as const).map((sc) => (
              <button
                key={sc}
                type="button"
                aria-pressed={scopeFilter === sc}
                className={`filter-btn ${scopeFilter === sc ? 'active' : ''}`}
                onClick={() => setScopeFilter(sc)}
                style={{ fontSize: '0.75rem', padding: '0.45rem 1rem' }}
              >
                {sc === 'all' ? 'TODOS LOS DESIGNIOS' : sc === 'org' ? 'DE LA FLOTA' : 'MIS ENCOMIENDAS'}
              </button>
            ))}
          </div>

          <AnimatePresence>
            {showCreateObjective && (
              <motion.form
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                onSubmit={handleCreateObjective}
                className="surface-monolith"
                style={{ padding: '1.5rem', marginBottom: '2rem', borderLeft: '4px solid var(--secondary)' }}
              >
                <h3 style={{ fontFamily: 'var(--cinzel-font)', color: 'var(--secondary)', margin: '0 0 1rem', fontSize: '1.1rem' }}>
                  PROCLAMAR UN DESIGNIO SAGRADO
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label
                      htmlFor={`${formIdPrefix}-obj-title`}
                      style={{ fontSize: '0.75rem', color: 'var(--secondary)', display: 'block', marginBottom: '0.3rem' }}
                    >
                      TÍTULO DEL DECRETO
                    </label>
                    <input
                      id={`${formIdPrefix}-obj-title`}
                      name="objectiveTitle"
                      type="text"
                      className="search-input"
                      placeholder="Ej. Acopio de RMC para la Polaris…"
                      value={newObjTitle}
                      onChange={(e) => setNewObjTitle(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor={`${formIdPrefix}-obj-scope`}
                      style={{ fontSize: '0.75rem', color: 'var(--secondary)', display: 'block', marginBottom: '0.3rem' }}
                    >
                      ALCANCE
                    </label>
                    <select
                      id={`${formIdPrefix}-obj-scope`}
                      name="objectiveScope"
                      className="select-filter"
                      value={newObjScope}
                      onChange={(e) => setNewObjScope(e.target.value as ObjectiveScope)}
                    >
                      <option value="org">Designio de toda la Flota</option>
                      <option value="cargo">Designio de Escuadrón / Rango</option>
                      <option value="individual">Encomienda Individual</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor={`${formIdPrefix}-obj-assignee`}
                      style={{ fontSize: '0.75rem', color: 'var(--secondary)', display: 'block', marginBottom: '0.3rem' }}
                    >
                      ENCOMENDAR A HERMANO (ROSTER)
                    </label>
                    <select
                      id={`${formIdPrefix}-obj-assignee`}
                      name="objectiveAssignee"
                      className="select-filter"
                      value={newObjAssignee}
                      onChange={(e) => setNewObjAssignee(e.target.value)}
                    >
                      <option value="">-- Toda la Hermandad --</option>
                      {roster.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.display_name} ({b.rank?.title || b.cargo})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor={`${formIdPrefix}-obj-category`}
                      style={{ fontSize: '0.75rem', color: 'var(--secondary)', display: 'block', marginBottom: '0.3rem' }}
                    >
                      DOCTRINA
                    </label>
                    <select
                      id={`${formIdPrefix}-obj-category`}
                      name="objectiveCategory"
                      className="select-filter"
                      value={newObjCategory}
                      onChange={(e) => setNewObjCategory(e.target.value as ObjectiveCategory)}
                    >
                      <option value="recoleccion">Acopio de Ofrendas</option>
                      <option value="combate">Purga de Los Custodios del Orden</option>
                      <option value="forja">Forja de Tecnomilagros</option>
                      <option value="ascenso">Ritual de Ascenso</option>
                      <option value="general">Campaña del Vacío</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor={`${formIdPrefix}-obj-date`}
                      style={{ fontSize: '0.75rem', color: 'var(--secondary)', display: 'block', marginBottom: '0.3rem' }}
                    >
                      LÍMITE DEL CICLO (OPCIONAL)
                    </label>
                    <input
                      id={`${formIdPrefix}-obj-date`}
                      name="objectiveDueDate"
                      type="date"
                      className="search-input"
                      value={newObjDate}
                      onChange={(e) => setNewObjDate(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label
                    htmlFor={`${formIdPrefix}-obj-desc`}
                    style={{ fontSize: '0.75rem', color: 'var(--secondary)', display: 'block', marginBottom: '0.3rem' }}
                  >
                    MANDATO LITÚRGICO Y TÁCTICO
                  </label>
                  <textarea
                    id={`${formIdPrefix}-obj-desc`}
                    name="objectiveDescription"
                    rows={2}
                    className="search-input"
                    placeholder="Por decreto del Concilio del Vacío, se ordena…"
                    value={newObjDesc}
                    onChange={(e) => setNewObjDesc(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem' }}>
                  <button type="button" className="btn-secondary" onClick={() => setShowCreateObjective(false)} style={{ fontSize: '0.8rem' }}>
                    CANCELAR
                  </button>
                  <button type="submit" className="btn-primary" style={{ fontSize: '0.8rem' }}>
                    SELLAR DESIGNIO
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {loadingObjectives ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--secondary)', fontFamily: 'var(--cinzel-font)' }}>
              CONSULTANDO LOS DESIGNIOS DEL VACÍO…
            </div>
          ) : filteredObjectives.length === 0 ? (
            <div className="surface-monolith" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              No hay Designios proclamados bajo este filtro en el Ciclo 2956.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
              {filteredObjectives.map((obj) => {
                const isCompleted = obj.status === 'marca_del_abismo' || obj.status === 'cumplido';
                const isAbandoned = obj.status === 'ceniza_fria' || obj.status === 'abandonado';
                return (
                  <div
                    key={obj.id}
                    className="surface-monolith"
                    style={{
                      padding: '1.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.8rem',
                      borderTop: `3px solid ${isCompleted ? 'var(--status-ok)' : isAbandoned ? 'var(--rank-1)' : 'var(--secondary)'}`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                      <span
                        style={{
                          fontSize: '0.65rem',
                          fontFamily: 'var(--cinzel-font)',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '3px',
                          background: 'rgba(212,175,55,0.1)',
                          color: 'var(--secondary)',
                          border: '1px solid rgba(212,175,55,0.3)',
                          textTransform: 'uppercase',
                        }}
                      >
                        {obj.category} · {obj.scope}
                      </span>
                      {isCompleted ? (
                        <TacticalTooltip text={`${TACTICAL_TOOLTIPS.marca_del_abismo.tactical}: ${TACTICAL_TOOLTIPS.marca_del_abismo.explanation}`}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: 'var(--status-ok)', fontSize: '0.72rem', fontWeight: 'bold', fontFamily: 'var(--cinzel-font)' }}>
                            <CheckCircle size={14} aria-hidden="true" /> MARCA DEL ABISMO
                          </span>
                        </TacticalTooltip>
                      ) : isAbandoned ? (
                        <TacticalTooltip text={`${TACTICAL_TOOLTIPS.la_ceniza_fria.tactical}: ${TACTICAL_TOOLTIPS.la_ceniza_fria.explanation}`}>
                          <span style={{ color: 'var(--primary)', fontSize: '0.72rem', fontWeight: 'bold', fontFamily: 'var(--cinzel-font)' }}>
                            LA CENIZA FRÍA
                          </span>
                        </TacticalTooltip>
                      ) : (
                        <span className="tabular-nums" style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 'bold' }}>
                          {obj.progress}%
                        </span>
                      )}
                    </div>

                    <h3 style={{ margin: 0, fontFamily: 'var(--cinzel-font)', fontSize: '1.1rem', color: 'var(--text-main)' }}>
                      {obj.title}
                    </h3>

                    {obj.description && (
                      <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-muted)', lineHeight: 1.5, flex: 1 }}>
                        {obj.description}
                      </p>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', flexWrap: 'wrap', gap: '0.4rem' }}>
                      <span>
                        Encomendado a:{' '}
                        <strong style={{ color: 'var(--secondary)' }}>{obj.assignee_name || 'Toda la Flota'}</strong>
                      </span>
                      {obj.due_date && (
                        <span className="tabular-nums">Límite: {formatAbyssalUtc(obj.due_date, { prefixCycle: true })}</span>
                      )}
                    </div>

                    <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${obj.progress}%`,
                          height: '100%',
                          background: isCompleted ? 'var(--status-ok)' : 'linear-gradient(to right, var(--primary), var(--secondary))',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>

                    {!isCompleted && !isAbandoned && (
                      <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem' }}>
                        {[25, 50, 75, 100].map((step) => (
                          <button
                            key={step}
                            type="button"
                            className="btn-secondary tabular-nums"
                            style={{ fontSize: '0.68rem', padding: '0.25rem 0.5rem', flex: 1 }}
                            onClick={() => void handleUpdateProgress(obj.id, step)}
                          >
                            {step}%
                          </button>
                        ))}
                      </div>
                    )}

                    {isOfficerOrCouncil && !isCompleted && obj.progress >= 100 && (
                      <TacticalTooltip text={`${TACTICAL_TOOLTIPS.marca_del_abismo.tactical}: ${TACTICAL_TOOLTIPS.marca_del_abismo.explanation}`} focusable={false}>
                        <button
                          type="button"
                          className="btn-primary"
                          onClick={() => void handleVerifyObjective(obj.id)}
                          style={{
                            fontSize: '0.72rem',
                            padding: '0.45rem 0.8rem',
                            marginTop: '0.4rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.4rem',
                            width: '100%',
                          }}
                        >
                          <Shield size={14} aria-hidden="true" /> OTORGAR LA MARCA DEL ABISMO (CONCILIO)
                        </button>
                      </TacticalTooltip>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CRUZADAS */}
      {isApproved && activeTab === 'cruzadas' && (
        <div
          id={`${formIdPrefix}-panel-cruzadas`}
          role="tabpanel"
          aria-labelledby={`${formIdPrefix}-tab-cruzadas`}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 style={{ margin: 0 }}>
              <DualLabel
                sacred="EDICTOS DE SANGRE Y OPERACIONES CONVOCADAS"
                tactical={TERMINOLOGY.cruzadas.tactical}
                size="md"
                sacredColor="var(--secondary)"
              />
            </h2>

            {isOfficerOrCouncil && (
              <button
                type="button"
                onClick={() => setShowCreateCrusade((v) => !v)}
                className="btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', padding: '0.6rem 1.2rem' }}
              >
                <Flame size={16} aria-hidden="true" />
                PROCLAMAR EDICTO DE CRUZADA
              </button>
            )}
          </div>

          <AnimatePresence>
            {showCreateCrusade && (
              <motion.form
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                onSubmit={handleCreateCrusade}
                className="surface-monolith"
                style={{ padding: '1.5rem', marginBottom: '2rem', borderLeft: '4px solid var(--primary)' }}
              >
                <h3 style={{ fontFamily: 'var(--cinzel-font)', color: 'var(--primary)', margin: '0 0 1rem', fontSize: '1.1rem' }}>
                  PROCLAMACIÓN RITUAL DE EDICTO DE SANGRE
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label
                      htmlFor={`${formIdPrefix}-crusade-title`}
                      style={{ fontSize: '0.75rem', color: 'var(--secondary)', display: 'block', marginBottom: '0.3rem' }}
                    >
                      NOMBRE DEL EDICTO
                    </label>
                    <input
                      id={`${formIdPrefix}-crusade-title`}
                      name="crusadeTitle"
                      type="text"
                      className="search-input"
                      placeholder="Ej. Edicto de Sangre: Cenizas de Pyro…"
                      value={crusadeTitle}
                      onChange={(e) => setCrusadeTitle(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor={`${formIdPrefix}-crusade-location`}
                      style={{ fontSize: '0.75rem', color: 'var(--secondary)', display: 'block', marginBottom: '0.3rem' }}
                    >
                      TEATRO DEL VACÍO (UBICACIÓN)
                    </label>
                    <input
                      id={`${formIdPrefix}-crusade-location`}
                      name="crusadeLocation"
                      type="text"
                      className="search-input"
                      placeholder="Ej. Pyro VI — Ruin Station…"
                      value={crusadeLocation}
                      onChange={(e) => setCrusadeLocation(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor={`${formIdPrefix}-crusade-date`}
                      style={{ fontSize: '0.75rem', color: 'var(--secondary)', display: 'block', marginBottom: '0.3rem' }}
                    >
                      CICLO Y HORA DE SALTO (HORA LOCAL → UTC · +930 EN GRIMOIRE)
                    </label>
                    <input
                      id={`${formIdPrefix}-crusade-date`}
                      name="crusadeDate"
                      type="datetime-local"
                      className="search-input"
                      value={crusadeDate}
                      onChange={(e) => setCrusadeDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label
                    htmlFor={`${formIdPrefix}-crusade-ships`}
                    style={{ fontSize: '0.75rem', color: 'var(--secondary)', display: 'block', marginBottom: '0.3rem' }}
                  >
                    FLOTA REQUERIDA (SEPARADA POR COMAS)
                  </label>
                  <input
                    id={`${formIdPrefix}-crusade-ships`}
                    name="crusadeShips"
                    type="text"
                    className="search-input"
                    placeholder="Ej. Polaris, Hammerhead, Eclipse, Cutlass Red…"
                    value={crusadeShips}
                    onChange={(e) => setCrusadeShips(e.target.value)}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label
                    htmlFor={`${formIdPrefix}-crusade-briefing`}
                    style={{ fontSize: '0.75rem', color: 'var(--secondary)', display: 'block', marginBottom: '0.3rem' }}
                  >
                    DECRETO DEL CONCILIO DEL VACÍO (SI SE OMITE, SE GENERA CON LA FÓRMULA RITUAL)
                  </label>
                  <textarea
                    id={`${formIdPrefix}-crusade-briefing`}
                    name="crusadeBriefing"
                    rows={3}
                    className="search-input"
                    placeholder="Por decreto de los Profetas de la Ruina, se ordena…"
                    value={crusadeBriefing}
                    onChange={(e) => setCrusadeBriefing(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem' }}>
                  <button type="button" className="btn-secondary" onClick={() => setShowCreateCrusade(false)} style={{ fontSize: '0.8rem' }}>
                    CANCELAR
                  </button>
                  <button type="submit" className="btn-primary" style={{ fontSize: '0.8rem' }}>
                    SELLAR EDICTO DE CRUZADA
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {loadingCrusades || !shipsLoaded ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--secondary)', fontFamily: 'var(--cinzel-font)' }}>
              CONSULTANDO EXPEDIENTES DE GUERRA…
            </div>
          ) : crusades.length === 0 ? (
            <div className="surface-monolith" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              No hay Edictos de Cruzada activos en este ciclo.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {crusades.map((c) => {
                const isVictoriosa = c.status === 'victoriosa';
                return (
                  <div
                    key={c.id}
                    className="surface-monolith"
                    style={{
                      padding: '1.8rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem',
                      borderLeft: '4px solid var(--primary)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                          {isVictoriosa ? (
                            <TacticalTooltip text={`${TACTICAL_TOOLTIPS.marca_del_abismo.tactical}: Cruzada completada victoriosamente`}>
                              <span
                                style={{
                                  fontSize: '0.65rem',
                                  fontFamily: 'var(--cinzel-font)',
                                  padding: '0.2rem 0.5rem',
                                  borderRadius: '3px',
                                  background: 'rgba(16, 185, 129, 0.14)',
                                  color: 'var(--status-ok)',
                                  border: '1px solid rgba(16, 185, 129, 0.35)',
                                  textTransform: 'uppercase',
                                }}
                              >
                                MARCA DEL ABISMO
                              </span>
                            </TacticalTooltip>
                          ) : (
                            <span
                              style={{
                                fontSize: '0.65rem',
                                fontFamily: 'var(--cinzel-font)',
                                padding: '0.2rem 0.5rem',
                                borderRadius: '3px',
                                background: 'rgba(196,30,58,0.15)',
                                color: 'var(--primary)',
                                border: '1px solid rgba(196,30,58,0.3)',
                                textTransform: 'uppercase',
                              }}
                            >
                              {c.status}
                            </span>
                          )}
                          <span style={{ fontSize: '0.8rem', color: 'var(--secondary)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                            <MapPin size={13} aria-hidden="true" /> {c.location}
                          </span>
                        </div>

                        <h3 style={{ margin: 0, fontFamily: 'var(--cinzel-font)', fontSize: '1.3rem', color: 'var(--text-main)' }}>
                          {c.title}
                        </h3>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--cinzel-font)' }}>CICLO DE SALTO</div>
                        <div className="tabular-nums" style={{ fontSize: '1.02rem', color: 'var(--secondary)', fontWeight: 'bold' }}>
                          {formatAbyssalUtc(c.operation_date, { includeTime: true, prefixCycle: true })}
                        </div>
                      </div>
                    </div>

                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                      {c.briefing || c.description}
                    </p>

                    {c.ships_required && c.ships_required.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.75rem' }}>
                        <span style={{ color: 'var(--secondary)', fontFamily: 'var(--cinzel-font)' }}>CONTINGENTE DE NAVES:</span>
                        {c.ships_required.map((ship, idx) => (
                          <span
                            key={`${c.id}-req-${idx}`}
                            style={{
                              padding: '0.2rem 0.5rem',
                              borderRadius: '3px',
                              background: 'rgba(255,255,255,0.04)',
                              color: 'var(--text-main)',
                              border: '1px solid rgba(255,255,255,0.08)',
                            }}
                          >
                            {ship}
                          </span>
                        ))}
                      </div>
                    )}

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        borderTop: '1px solid rgba(255,255,255,0.05)',
                        paddingTop: '1rem',
                        marginTop: '0.5rem',
                        flexWrap: 'wrap',
                        gap: '1rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <User size={16} color="var(--secondary)" aria-hidden="true" />
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          Juramentados:{' '}
                          <strong className="tabular-nums" style={{ color: 'var(--text-main)' }}>
                            {c.signups_count} / {c.max_brothers} hermanos
                          </strong>
                        </span>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ fontSize: '0.7rem', padding: '0.25rem 0.65rem', marginLeft: '0.25rem' }}
                          onClick={() => void loadCrusadeDetails(c.id)}
                        >
                          VER ESCUADRÓN
                        </button>
                      </div>

                      <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', marginLeft: 'auto' }}>
                        {c.user_is_signed ? (
                          <TacticalTooltip text={`${TACTICAL_TOOLTIPS.la_ceniza_fria.tactical}: Desertar conlleva registro disciplinario`} focusable={false}>
                            <button
                              type="button"
                              className="btn-secondary"
                              style={{ borderColor: 'rgba(239, 68, 68, 0.45)', color: 'var(--status-danger)', fontSize: '0.75rem' }}
                              onClick={() => setLeaveConfirmCrusade(c)}
                            >
                              APARTARSE (RIESGO DE LA CENIZA FRÍA)
                            </button>
                          </TacticalTooltip>
                        ) : CLOSED_CRUSADE_STATUSES.has(c.status) ? (
                          <span
                            style={{
                              fontSize: '0.75rem',
                              color: 'var(--text-muted)',
                              fontFamily: 'var(--cinzel-font)',
                              padding: '0.4rem 0.75rem',
                              borderRadius: '4px',
                              background: 'rgba(255, 255, 255, 0.04)',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                            }}
                          >
                            EDICTO CERRADO · SIN NUEVAS INSCRIPCIONES
                          </span>
                        ) : (
                          <CrusadeSignupControls
                            crusadeId={c.id}
                            operationalShips={operationalShips}
                            onSubmit={handleSignupCrusade}
                          />
                        )}
                      </div>
                    </div>

                    {selectedCrusade && selectedCrusade.id === c.id && (
                      <div
                        style={{
                          marginTop: '1rem',
                          padding: '1rem',
                          background: 'rgba(0,0,0,0.4)',
                          borderRadius: '6px',
                          border: '1px solid rgba(212,175,55,0.1)',
                        }}
                      >
                        <h4 style={{ fontFamily: 'var(--cinzel-font)', color: 'var(--secondary)', fontSize: '0.85rem', margin: '0 0 0.8rem' }}>
                          CONTINGENTE JURAMENTADO ANTE EL CONCILIO DEL VACÍO
                        </h4>
                        {selectedCrusade.roster?.length === 0 ? (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Aún no hay hermanos en formación.</div>
                        ) : (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.6rem' }}>
                            {selectedCrusade.roster.map((member) => {
                              const shipLabel =
                                member.ship_brought ||
                                (member.ship_name
                                  ? `${member.ship_name}${member.ship_callsign ? ` — “${member.ship_callsign}”` : ''}`
                                  : 'Dotación / Sin nave propia');
                              const handleKey = encodeURIComponent(
                                member.rsi_handle || member.display_name || member.user_id,
                              );
                              return (
                                <div
                                  key={member.id}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.6rem',
                                    padding: '0.5rem',
                                    background: 'rgba(255,255,255,0.02)',
                                    borderRadius: '4px',
                                  }}
                                >
                                  <img
                                    src={member.discord_avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}
                                    alt={member.display_name || 'Hermano'}
                                    width={28}
                                    height={28}
                                    loading="lazy"
                                    style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                                  />
                                  <div style={{ minWidth: 0 }}>
                                    <Link
                                      to={`/hermano/${handleKey}`}
                                      className="hover-underline"
                                      style={{ fontSize: '0.82rem', fontWeight: 'bold', color: 'var(--text-main)', textDecoration: 'none' }}
                                    >
                                      {member.display_name}
                                    </Link>
                                    <div style={{ fontSize: '0.68rem', color: 'var(--secondary)' }}>
                                      {shipLabel} · {member.role_assigned}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CALENDARIO */}
      {isApproved && activeTab === 'calendario' && (
        <div
          id={`${formIdPrefix}-panel-calendario`}
          role="tabpanel"
          aria-labelledby={`${formIdPrefix}-tab-calendario`}
          className="surface-monolith"
          style={{ padding: '2rem' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.5rem' }}>
            <CalendarIcon size={24} color="var(--secondary)" aria-hidden="true" />
            <h2 style={{ margin: 0 }}>
              <DualLabel
                sacred="CRONOGRAMA SAGRADO DE OPERACIONES — CICLO 2956"
                tactical={TERMINOLOGY.calendario.tactical}
                size="md"
                sacredColor="var(--secondary)"
              />
            </h2>
          </div>

          {calendarEvents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              No hay hitos registrados en el Calendario Abisal.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {calendarEvents.map((evt) => {
                const parsed = parseUtcDate(evt.start_date);
                const abyssalYear = parsed ? toAbyssalYear(parsed.getUTCFullYear()) : 2956;
                const monthShort = parsed ? (MONTHS_ES[parsed.getUTCMonth()] ?? 'Ene').toUpperCase() : 'CICLO';
                const dayNum = parsed ? String(parsed.getUTCDate()).padStart(2, '0') : '--';
                const isCrusade = evt.type === 'cruzada';
                const isConclave = evt.type === 'conclave';

                return (
                  <div
                    key={`${evt.type}-${evt.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1.5rem',
                      padding: '1rem 1.2rem',
                      background: 'rgba(0,0,0,0.3)',
                      borderRadius: '6px',
                      borderLeft: `3px solid ${isCrusade ? 'var(--primary)' : isConclave ? 'var(--accent-conclave)' : 'var(--secondary)'}`,
                      flexWrap: 'wrap',
                    }}
                  >
                    <div className="tabular-nums" style={{ textAlign: 'center', minWidth: '88px' }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--secondary)', fontFamily: 'var(--cinzel-font)' }}>
                        {monthShort} {abyssalYear}
                      </div>
                      <div style={{ fontSize: '1.45rem', fontWeight: 900, color: 'var(--text-main)', lineHeight: 1.1 }}>
                        {dayNum}
                      </div>
                    </div>

                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontSize: '0.6rem',
                            padding: '0.1rem 0.4rem',
                            borderRadius: '2px',
                            background: isCrusade ? 'rgba(196,30,58,0.2)' : isConclave ? 'rgba(168,85,247,0.2)' : 'rgba(212,175,55,0.2)',
                            color: isCrusade ? 'var(--primary)' : isConclave ? 'var(--accent-conclave)' : 'var(--secondary)',
                            textTransform: 'uppercase',
                            fontFamily: 'var(--cinzel-font)',
                          }}
                        >
                          {isCrusade ? 'EDICTO DE SANGRE' : isConclave ? 'CONCILIO DEL VACÍO' : 'DESIGNIO'}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{evt.location}</span>
                      </div>
                      <h3 style={{ margin: 0, fontFamily: 'var(--cinzel-font)', fontSize: '1rem', color: 'var(--text-main)' }}>
                        {evt.title}
                      </h3>
                    </div>

                    <div className="tabular-nums" style={{ fontSize: '0.82rem', color: 'var(--secondary)', fontFamily: 'var(--cinzel-font)' }}>
                      {formatAbyssalUtc(evt.start_date, { includeTime: true })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Edictos;

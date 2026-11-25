import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  Award,
  Check,
  ChevronDown,
  Compass,
  Crosshair,
  Edit3,
  ExternalLink,
  KeyRound,
  Layers,
  Link2,
  Lock,
  Plus,
  Rocket,
  Save,
  Shield,
  Sparkles,
  Target,
  Trash2,
  X,
} from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { useAltar } from '../context/useAltar';
import {
  api,
  createMyShip,
  deleteMyShip,
  getMyShips,
  getObjectives,
  getShips,
  updateMe,
  updateMyShip,
  updateObjective,
} from '../api/client';
import { DualLabel, TacticalTooltip } from '../components/DualLabel';
import { useToast } from '../components/AbyssalToast';
import { SealConfirmModal } from '../components/SealConfirmModal';
import DragonIcon from '../components/DragonIcon';
import {
  ESCALA_RANKS,
  HOME_SYSTEMS,
  SHIP_STATUS_META,
  TACTICAL_TOOLTIPS,
  TERMINOLOGY,
  getRankMeta,
  type ShipStatusKey,
} from '../constants/terminology';
import { formatAbyssalDate } from '../utils/abyssalDate';
import type { MemberShip, MemberShipStatus, Objective, Ship } from '../types';

const VALID_TABS = ['expediente', 'arcas', 'designios', 'rito'] as const;
type ProfileTab = (typeof VALID_TABS)[number];

const COMBAT_ROLE_PRESETS = [
  'Mando Supremo',
  'Estratega',
  'Comandante',
  'Vanguardia',
  'Piloto de Caza',
  'Artillero',
  'Infantería',
  'Ingeniero',
  'Médico',
  'Logística',
] as const;

const ROSTER_CLAIM_OPTIONS = [
  { value: 'Quaker', label: 'Quaker — [VI] Heraldo de Ancalagon (La Voz del Dragón / Admin)' },
  { value: 'Enanimus', label: 'Enanimus — [V] Profeta de la Ruina (Concilio)' },
  { value: 'Denoxx', label: 'Denoxx — [V] Profeta de la Ruina (Concilio)' },
  { value: 'Longhinus', label: 'Longhinus — [V] Profeta de la Ruina (Concilio)' },
  { value: 'Afol86', label: 'Afol86 — [IV] Voz del Abismo (Oficial)' },
  { value: 'Unknown-t20', label: 'Unknown-t20 — [III] Portador de Ceniza' },
  { value: 'Kannabistian420', label: 'Kannabistian420 — [II] Iniciado del Vacío' },
] as const;

interface AscensionTrial {
  readonly fromLevel: number;
  readonly toLevel: number;
  readonly roman: string;
  readonly from: string;
  readonly to: string;
  readonly color: string;
  readonly steps: readonly string[];
}

const ASCENSION_TRIALS: readonly AscensionTrial[] = [
  {
    fromLevel: 1,
    toLevel: 2,
    roman: 'I',
    from: 'Sombras del Umbral',
    to: 'Iniciados del Vacío',
    color: 'var(--rank-2)',
    steps: [
      'Completar los contratos asignados por el Concilio en los sistemas Stanton o Nyx.',
      'Participar en al menos un asalto de purificación a una Breaker Station — ya sea por la vía del silencio (PVE) o de la confrontación directa (PVP).',
    ],
  },
  {
    fromLevel: 2,
    toLevel: 3,
    roman: 'II',
    from: 'Iniciados del Vacío',
    to: 'Portadores de Ceniza',
    color: 'var(--rank-3)',
    steps: [
      'Demostrar dominio del arte sagrado de la Trasmutación: fabricación de equipamiento personal o herramientas para uso grupal.',
      'Registrar al menos un Tecnomilagro completado en el Star Grimoire, verificado por un superior.',
    ],
  },
  {
    fromLevel: 3,
    toLevel: 4,
    roman: 'III',
    from: 'Portadores de Ceniza',
    to: 'Voces del Abismo',
    color: 'var(--rank-4)',
    steps: [
      'Liderar una operación táctica con uso de comunicación orgánica (VOIP + chat de escuadra).',
      'Demostrar coordinación formal entre mínimo tres hermanos de la Flota en tiempo real.',
    ],
  },
  {
    fromLevel: 4,
    toLevel: 5,
    roman: 'IV',
    from: 'Voces del Abismo',
    to: 'Profetas de la Ruina',
    color: 'var(--rank-5)',
    steps: [
      'Completar una campaña intersistémica estratégica: misiones coordinadas durante un período prolongado.',
      'Demostrar comprensión de la doctrina del Quiebre mediante decisión táctica documentada ante el Concilio.',
    ],
  },
  {
    fromLevel: 5,
    toLevel: 6,
    roman: 'V',
    from: 'Profetas de la Ruina',
    to: 'Heraldo de Ancalagon',
    color: 'var(--rank-6)',
    steps: [
      'Contribuir sustancialmente al avance de la Flota: en reputación, influencia territorial o doctrina.',
      'El ascenso se otorga únicamente a juicio del Concilio Interno mediante deliberación cerrada. No se postula: se es elegido.',
    ],
  },
];

function extractErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: unknown; message?: unknown } | undefined;
    if (typeof data?.error === 'string' && data.error.trim()) {
      return data.error;
    }
    if (typeof data?.message === 'string' && data.message.trim()) {
      return data.message;
    }
  }
  if (err instanceof Error && err.message.trim()) {
    return err.message;
  }
  return fallback;
}

function resolveCatalogManufacturer(ship: Ship): string {
  if (!ship.manufacturer) return 'Fabricante Desconocido';
  if (typeof ship.manufacturer === 'string') return ship.manufacturer;
  return ship.manufacturer.name || 'Fabricante Desconocido';
}

function resolveCatalogClass(ship: Ship): string {
  return ship.className || ship.focus || 'Nave Estelar';
}

export const BrotherProfile: React.FC = () => {
  const { user, loading: authLoading, loginWithDiscord, refreshUser } = useAuth();
  const { cart } = useAltar();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const rawTab = searchParams.get('tab');
  const activeTab: ProfileTab = (VALID_TABS as readonly string[]).includes(rawTab ?? '')
    ? (rawTab as ProfileTab)
    : 'expediente';

  const handleTabChange = (tab: ProfileTab) => {
    setSearchParams({ tab }, { replace: true });
  };

  // Profile editing state
  const [isEditing, setIsEditing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [rsiHandle, setRsiHandle] = useState('');
  const [homeSystem, setHomeSystem] = useState('Pyro');
  const [combatRole, setCombatRole] = useState('Vanguardia');
  const [bio, setBio] = useState('');
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [specialtyInput, setSpecialtyInput] = useState('');

  // Hangar (Mis Arcas Estelares) state
  const [myShips, setMyShips] = useState<MemberShip[]>([]);
  const [loadingShips, setLoadingShips] = useState(false);
  const [catalogShips, setCatalogShips] = useState<Ship[]>([]);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [shipQuery, setShipQuery] = useState('');
  const [selectedCatalogShip, setSelectedCatalogShip] = useState<Ship | null>(null);
  const [showShipSuggestions, setShowShipSuggestions] = useState(false);
  const [shipCallsign, setShipCallsign] = useState('');
  const [shipStatus, setShipStatus] = useState<MemberShipStatus>('operativa');
  const [savingShip, setSavingShip] = useState(false);

  // Hangar inline edit & delete modal state
  const [editingShipId, setEditingShipId] = useState<string | null>(null);
  const [editShipCallsign, setEditShipCallsign] = useState('');
  const [editShipStatus, setEditShipStatus] = useState<MemberShipStatus>('operativa');
  const [updatingShipId, setUpdatingShipId] = useState<string | null>(null);
  const [shipToDelete, setShipToDelete] = useState<MemberShip | null>(null);
  const [deletingShip, setDeletingShip] = useState(false);

  // Objectives state
  const [myObjectives, setMyObjectives] = useState<Objective[]>([]);
  const [loadingObjectives, setLoadingObjectives] = useState(false);
  const [updatingObjectiveId, setUpdatingObjectiveId] = useState<string | null>(null);
  const [loadedApprovedKey, setLoadedApprovedKey] = useState('');

  // Discreet Emergency Rescue state
  const [claimHandle, setClaimHandle] = useState('Quaker');
  const [claimSecret, setClaimSecret] = useState('');
  const [claimingRoster, setClaimingRoster] = useState(false);

  const userId = user?.id ?? '';
  const userStatus = user?.status ?? '';
  const isApproved = userStatus === 'approved';
  const approvedKey = isApproved && userId ? `${userId}:${userStatus}` : '';
  const hasSyncedApproved = isApproved && loadedApprovedKey === approvedKey;
  const isFetchingShips = loadingShips || (isApproved && !hasSyncedApproved);
  const isFetchingObjectives = loadingObjectives || (isApproved && !hasSyncedApproved);
  const isCouncilOrAdmin = user?.role === 'consejo' || user?.role === 'admin';
  const displayedShips = hasSyncedApproved ? myShips : [];
  const displayedObjectives = hasSyncedApproved ? myObjectives : [];

  useEffect(() => {
    document.title = 'Star Grimoire | Expediente del Hermano';
  }, []);

  const fetchPersonalShips = useCallback(async () => {
    if (!userId || userStatus !== 'approved') return;
    setLoadingShips(true);
    try {
      const ships = await getMyShips();
      setMyShips(ships);
    } catch (err) {
      showToast(extractErrorMessage(err, 'No se pudo consultar tu Hangar Personal.'), 'error');
    } finally {
      setLoadingShips(false);
    }
  }, [userId, userStatus, showToast]);

  const fetchPersonalObjectives = useCallback(async () => {
    if (!userId || userStatus !== 'approved') return;
    setLoadingObjectives(true);
    try {
      const list = await getObjectives({ assigned_to: userId });
      setMyObjectives(list);
    } catch (err) {
      showToast(extractErrorMessage(err, 'No se pudieron consultar tus Designios.'), 'error');
    } finally {
      setLoadingObjectives(false);
    }
  }, [userId, userStatus, showToast]);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(async () => {
      if (cancelled || !userId || userStatus !== 'approved') {
        return;
      }

      const fetchKey = `${userId}:${userStatus}`;
      setLoadingShips(true);
      setLoadingObjectives(true);
      try {
        const [shipsResult, objectivesResult] = await Promise.allSettled([
          getMyShips(),
          getObjectives({ assigned_to: userId }),
        ]);
        if (cancelled) return;

        if (shipsResult.status === 'fulfilled') {
          setMyShips(shipsResult.value);
        } else {
          showToast(
            extractErrorMessage(shipsResult.reason, 'No se pudo consultar tu Hangar Personal.'),
            'error',
          );
        }

        if (objectivesResult.status === 'fulfilled') {
          setMyObjectives(objectivesResult.value);
        } else {
          showToast(
            extractErrorMessage(objectivesResult.reason, 'No se pudieron consultar tus Designios.'),
            'error',
          );
        }
      } finally {
        if (!cancelled) {
          setLoadedApprovedKey(fetchKey);
          setLoadingShips(false);
          setLoadingObjectives(false);
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [userId, userStatus, showToast]);

  // Lazy load ship catalog when user visits Arcas tab
  useEffect(() => {
    let cancelled = false;
    async function loadCatalog() {
      if (activeTab !== 'arcas' || !isApproved || catalogLoaded) return;
      try {
        const all = await getShips();
        if (!cancelled) {
          setCatalogShips(all);
          setCatalogLoaded(true);
        }
      } catch {
        // Catalog fallback: manual entry still works
      }
    }

    void loadCatalog();
    return () => {
      cancelled = true;
    };
  }, [activeTab, isApproved, catalogLoaded]);

  const filteredCatalogShips = useMemo(() => {
    const q = shipQuery.trim().toLowerCase();
    if (!q) return [];
    return catalogShips
      .filter((ship) => {
        const mfr = resolveCatalogManufacturer(ship).toLowerCase();
        const cls = resolveCatalogClass(ship).toLowerCase();
        return (
          ship.name.toLowerCase().includes(q) ||
          mfr.includes(q) ||
          cls.includes(q)
        );
      })
      .slice(0, 10);
  }, [catalogShips, shipQuery]);

  const openEditForm = () => {
    if (!user) return;
    setDisplayName(user.display_name || '');
    setRsiHandle(user.rsi_handle || '');
    setHomeSystem(user.home_system || 'Pyro');
    setCombatRole(user.combat_role || 'Vanguardia');
    setBio(user.bio || '');
    setSpecialties(Array.isArray(user.specialties) ? user.specialties : []);
    setSpecialtyInput('');
    setIsEditing(true);
  };

  const handleAddSpecialty = () => {
    const trimmed = specialtyInput.trim();
    if (!trimmed) return;
    if (specialties.includes(trimmed)) {
      showToast('Esa doctrina ya figura en tu expediente.', 'info');
      return;
    }
    setSpecialties((prev) => [...prev, trimmed]);
    setSpecialtyInput('');
  };

  const handleRemoveSpecialty = (sp: string) => {
    setSpecialties((prev) => prev.filter((item) => item !== sp));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      showToast('El nombre en el Registro Sagrado no puede estar vacío.', 'error');
      return;
    }

    setSavingProfile(true);
    try {
      const res = await updateMe({
        display_name: displayName.trim(),
        rsi_handle: rsiHandle.trim() || null,
        home_system: homeSystem,
        combat_role: combatRole.trim() || 'Vanguardia',
        bio: bio.trim() || null,
        specialties,
      });
      await refreshUser();
      setIsEditing(false);
      showToast(res.message || 'Expediente del Hermano sellado en el Códice.', 'success');
    } catch (err) {
      showToast(extractErrorMessage(err, 'Error al sellar los cambios del expediente.'), 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSelectCatalogShip = (ship: Ship) => {
    setSelectedCatalogShip(ship);
    setShipQuery(ship.name);
    setShowShipSuggestions(false);
  };

  const handleCreateShip = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = (selectedCatalogShip?.name || shipQuery).trim();
    if (!trimmedName) {
      showToast('Selecciona o escribe el modelo del Arca Estelar antes de consagrarla.', 'error');
      return;
    }

    setSavingShip(true);
    try {
      const res = await createMyShip({
        ship_id: selectedCatalogShip?.id || trimmedName.toLowerCase().replace(/\s+/g, '-'),
        ship_name: trimmedName,
        manufacturer: selectedCatalogShip ? resolveCatalogManufacturer(selectedCatalogShip) : undefined,
        ship_class: selectedCatalogShip ? resolveCatalogClass(selectedCatalogShip) : undefined,
        callsign: shipCallsign.trim() || null,
        status: shipStatus,
      });
      setMyShips((prev) => [res.ship, ...prev]);
      setShipQuery('');
      setSelectedCatalogShip(null);
      setShipCallsign('');
      setShipStatus('operativa');
      showToast(`Arca Estelar «${res.ship.ship_name}» consagrada en tu Hangar.`, 'success');
    } catch (err) {
      showToast(extractErrorMessage(err, 'No se pudo consagrar el Arca Estelar.'), 'error');
    } finally {
      setSavingShip(false);
    }
  };

  const startEditShip = (ship: MemberShip) => {
    setEditingShipId(ship.id);
    setEditShipCallsign(ship.callsign || '');
    setEditShipStatus(ship.status);
  };

  const handleSaveShipEdit = async (shipId: string) => {
    setUpdatingShipId(shipId);
    try {
      const res = await updateMyShip(shipId, {
        callsign: editShipCallsign.trim() || null,
        status: editShipStatus,
      });
      setMyShips((prev) => prev.map((s) => (s.id === shipId ? res.ship : s)));
      setEditingShipId(null);
      showToast('Estado táctico del Arca Estelar actualizado.', 'success');
    } catch (err) {
      showToast(extractErrorMessage(err, 'No se pudo actualizar el Arca Estelar.'), 'error');
    } finally {
      setUpdatingShipId(null);
    }
  };

  const confirmDeleteShip = async () => {
    if (!shipToDelete) return;
    setDeletingShip(true);
    try {
      const res = await deleteMyShip(shipToDelete.id);
      setMyShips((prev) => prev.filter((s) => s.id !== shipToDelete.id));
      showToast(res.message || `Arca Estelar «${shipToDelete.ship_name}» retirada del Hangar.`, 'success');
      setShipToDelete(null);
    } catch (err) {
      showToast(extractErrorMessage(err, 'No se pudo retirar el Arca Estelar.'), 'error');
    } finally {
      setDeletingShip(false);
    }
  };

  const handleUpdateMyObjectiveProgress = async (objId: string, progress: number) => {
    setUpdatingObjectiveId(objId);
    try {
      await updateObjective(objId, { progress });
      await fetchPersonalObjectives();
      showToast(
        progress >= 100
          ? 'Designio sellado con la Marca del Abismo.'
          : `Progreso del Designio actualizado al ${progress}%.`,
        'success',
      );
    } catch (err) {
      showToast(extractErrorMessage(err, 'Error al actualizar el progreso del Designio.'), 'error');
    } finally {
      setUpdatingObjectiveId(null);
    }
  };

  const handleClaimRoster = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimSecret.trim()) {
      showToast('Debes ingresar el Sello del Oráculo (AGENT_SYNC_TOKEN).', 'error');
      return;
    }
    setClaimingRoster(true);
    try {
      const res = await api.post<{ success?: boolean; token?: string; message?: string }>(
        '/auth/claim-roster',
        { handle: claimHandle, secret: claimSecret },
      );
      if (res.data?.token) {
        localStorage.setItem('ancalagon_token', res.data.token);
      }
      setClaimSecret('');
      await refreshUser();
      showToast(res.data?.message || 'Expediente del Roster consagrado exitosamente.', 'success');
    } catch (err) {
      showToast(extractErrorMessage(err, 'Error al reclamar el expediente del Roster.'), 'error');
    } finally {
      setClaimingRoster(false);
    }
  };

  if (authLoading) {
    return (
      <div style={{ padding: '4rem 1.5rem', maxWidth: '960px', margin: '0 auto' }}>
        <div className="surface-monolith" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <p style={{ color: 'var(--secondary)', fontFamily: 'var(--cinzel-font)', margin: 0 }}>
            Consultando los registros del Abismo…
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ padding: '4rem 1.5rem', maxWidth: '820px', margin: '0 auto' }}>
        <div className="surface-monolith" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
            <DragonIcon size={56} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <h1
              style={{
                margin: 0,
                fontSize: 'inherit',
                fontWeight: 'inherit',
                fontFamily: 'inherit',
                letterSpacing: 'normal',
                textShadow: 'none',
              }}
            >
              <DualLabel
                sacred={TERMINOLOGY.hermano.sacred}
                tactical={TERMINOLOGY.hermano.tactical}
                size="lg"
                align="center"
              />
            </h1>
          </div>
          <h2 className="sr-only">Acceso al Expediente</h2>
          <p className="prose-grimoire" style={{ color: 'var(--text-muted)', margin: '0 auto 1.75rem' }}>
            Debes cruzar el Umbral con tu cuenta de Discord para acceder a tu Expediente Sagrado, gestionar tu Hangar
            Personal y consultar tus Designios asignados.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
            <button type="button" className="btn-primary" onClick={loginWithDiscord}>
              {TERMINOLOGY.cruzarUmbral.sacred} · {TERMINOLOGY.cruzarUmbral.tactical}
            </button>
            <Link to="/hermandad" className="btn-secondary">
              Explorar La Hermandad
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const rankMeta = getRankMeta(
    user.status === 'approved' ? user.rank_id || user.rank_level : 'candidato',
  );
  const rankColorHex = rankMeta.color;
  const rankCssVar = rankMeta.cssVar;
  const currentRankLevel = user.status === 'approved' ? (user.rank?.level ?? user.rank_level ?? 1) : 0;
  const nextTrial = ASCENSION_TRIALS.find((t) => t.fromLevel === currentRankLevel);
  const userMarks = user.abyssal_marks ?? [];
  const operationalCount = displayedShips.filter((s) => s.status === 'operativa').length;

  return (
    <div style={{ padding: '1rem 1.5rem 5rem', maxWidth: '1150px', margin: '0 auto' }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
          marginBottom: '1.5rem',
        }}
      >
        <DualLabel
          sacred={TERMINOLOGY.hermano.sacred}
          tactical={TERMINOLOGY.hermano.tactical}
          size="lg"
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          <Link to="/hermandad" className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <Shield size={14} aria-hidden="true" />
            Directorio de La Hermandad
          </Link>
          {isCouncilOrAdmin && (
            <Link
              to="/concilio"
              className="btn-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                borderColor: 'var(--accent-conclave)',
                color: 'var(--accent-conclave)',
              }}
            >
              <Shield size={14} aria-hidden="true" style={{ color: 'var(--accent-conclave)' }} />
              Cámara del Concilio
            </Link>
          )}
        </div>
      </div>

      {/* Top Identity Banner */}
      <section
        aria-label="Identidad del Hermano"
        className="surface-monolith"
        style={{
          padding: '2rem',
          marginBottom: '1.75rem',
          borderTop: `4px solid ${rankCssVar}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.75rem', flexWrap: 'wrap' }}>
          <img
            src={user.discord_avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}
            alt={`Avatar de ${user.display_name}`}
            width={100}
            height={100}
            style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: `3px solid ${rankCssVar}`,
              boxShadow: `0 0 24px ${rankColorHex}40`,
              flexShrink: 0,
            }}
          />

          <div style={{ flex: 1, minWidth: '250px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                flexWrap: 'wrap',
                marginBottom: '0.55rem',
              }}
            >
              <h1
                style={{
                  margin: 0,
                  fontFamily: 'var(--cinzel-font)',
                  fontSize: 'clamp(1.5rem, 3vw, 2.15rem)',
                  letterSpacing: '2px',
                  color: 'var(--text-main)',
                }}
              >
                {user.display_name}
              </h1>

              <span
                className="tabular-nums"
                style={{
                  padding: '0.25rem 0.75rem',
                  borderRadius: '4px',
                  background: `${rankColorHex}22`,
                  color: rankCssVar,
                  border: `1px solid ${rankColorHex}70`,
                  fontFamily: 'var(--cinzel-font)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  letterSpacing: '1px',
                }}
              >
                [{rankMeta.roman}] {rankMeta.title}
              </span>

              {user.status === 'approved' && (
                <span
                  className="status-ok"
                  style={{
                    padding: '0.22rem 0.65rem',
                    borderRadius: '4px',
                    background: 'rgba(16, 185, 129, 0.12)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <Check size={13} aria-hidden="true" />
                  Hermano Consagrado
                </span>
              )}

              {user.status === 'pending' && (
                <span
                  className="status-warn"
                  style={{
                    padding: '0.22rem 0.65rem',
                    borderRadius: '4px',
                    background: 'rgba(245, 158, 11, 0.12)',
                    border: '1px solid rgba(245, 158, 11, 0.45)',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                  }}
                >
                  En el Umbral · Pendiente de Aprobación
                </span>
              )}

              {(user.status === 'rejected' || user.status === 'suspended') && (
                <TacticalTooltip text={TACTICAL_TOOLTIPS.la_ceniza_fria.explanation}>
                  <span
                    className="status-danger"
                    style={{
                      padding: '0.22rem 0.65rem',
                      borderRadius: '4px',
                      background: 'rgba(239, 68, 68, 0.14)',
                      border: '1px solid rgba(239, 68, 68, 0.45)',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <AlertTriangle size={13} aria-hidden="true" />
                    {TERMINOLOGY.cenizaFria.sacred} ({user.status === 'suspended' ? 'Suspendido' : 'Rechazado'})
                  </span>
                </TacticalTooltip>
              )}
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1.25rem',
                flexWrap: 'wrap',
                fontSize: '0.92rem',
                color: 'var(--text-muted)',
              }}
            >
              <div>
                Cargo Litúrgico:{' '}
                <strong style={{ color: 'var(--secondary)' }}>{user.cargo || 'Hermano del Umbral'}</strong>
              </div>

              <div>
                Handle RSI:{' '}
                {user.rsi_handle ? (
                  <a
                    href={`https://robertsspaceindustries.com/citizens/${encodeURIComponent(user.rsi_handle)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="accent-rsi hover-underline"
                    translate="no"
                    style={{
                      fontWeight: 700,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                    }}
                  >
                    {user.rsi_handle}
                    <ExternalLink size={13} aria-hidden="true" />
                  </a>
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>Sin vincular</span>
                )}
              </div>

              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <Compass size={14} aria-hidden="true" style={{ color: 'var(--secondary)' }} />
                Sistema:{' '}
                <strong style={{ color: 'var(--text-main)' }}>{user.home_system || 'Pyro'}</strong>
              </div>

              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <Crosshair size={14} aria-hidden="true" style={{ color: 'var(--primary)' }} />
                Rol Táctico:{' '}
                <strong style={{ color: 'var(--text-main)' }}>{user.combat_role || 'Vanguardia'}</strong>
              </div>

              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <Link2 size={14} aria-hidden="true" />
                Discord:{' '}
                {user.is_discord_linked && user.discord_username ? (
                  <strong className="status-ok" translate="no">
                    @{user.discord_username}
                  </strong>
                ) : (
                  <span className="status-warn">Pendiente de vínculo</span>
                )}
              </div>

              <div>
                Consagrado en:{' '}
                <strong className="tabular-nums" style={{ color: 'var(--text-main)' }}>
                  {formatAbyssalDate(user.created_at, { prefixCycle: true })}
                </strong>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            {isApproved && (
              <Link
                to={`/hermano/${encodeURIComponent(user.rsi_handle || user.display_name || user.id)}`}
                className="btn-secondary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <ExternalLink size={14} aria-hidden="true" />
                Dossier Público
              </Link>
            )}
            {!isEditing && (
              <button
                type="button"
                className="btn-primary"
                onClick={openEditForm}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Edit3 size={15} aria-hidden="true" />
                Editar Expediente
              </button>
            )}
          </div>
        </div>

        {/* Inline Edit Profile Form */}
        {isEditing && (
          <form
            onSubmit={handleSaveProfile}
            style={{
              marginTop: '1.75rem',
              borderTop: '1px solid rgba(212, 175, 55, 0.2)',
              paddingTop: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.1rem',
            }}
          >
            <DualLabel
              sacred="Actualizar Expediente Sagrado"
              tactical="Editar Nombre, Handle RSI, Sistema, Rol Táctico y Doctrinas"
              size="sm"
            />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <div>
                <label
                  htmlFor="profile-display-name"
                  style={{ fontSize: '0.78rem', color: 'var(--secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 700 }}
                >
                  Nombre en el Registro Sagrado
                </label>
                <input
                  id="profile-display-name"
                  name="display_name"
                  type="text"
                  className="search-input"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Ej. Quaker…"
                  autoComplete="name"
                  spellCheck={false}
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="profile-rsi-handle"
                  style={{ fontSize: '0.78rem', color: 'var(--secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 700 }}
                >
                  Handle de Star Citizen (RSI)
                </label>
                <input
                  id="profile-rsi-handle"
                  name="rsi_handle"
                  type="text"
                  className="search-input"
                  value={rsiHandle}
                  onChange={(e) => setRsiHandle(e.target.value)}
                  placeholder="Ej. Quaker…"
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>

              <div>
                <label
                  htmlFor="profile-home-system"
                  style={{ fontSize: '0.78rem', color: 'var(--secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 700 }}
                >
                  Sistema Habitual de Operaciones
                </label>
                <select
                  id="profile-home-system"
                  name="home_system"
                  className="select-filter"
                  value={homeSystem}
                  onChange={(e) => setHomeSystem(e.target.value)}
                >
                  {HOME_SYSTEMS.map((sys) => (
                    <option key={sys} value={sys}>
                      {sys}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="profile-combat-role"
                  style={{ fontSize: '0.78rem', color: 'var(--secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 700 }}
                >
                  Rol Táctico Primario
                </label>
                <input
                  id="profile-combat-role"
                  name="combat_role"
                  type="text"
                  list="combat-role-presets"
                  className="search-input"
                  value={combatRole}
                  onChange={(e) => setCombatRole(e.target.value)}
                  placeholder="Ej. Vanguardia…"
                  autoComplete="off"
                />
                <datalist id="combat-role-presets">
                  {COMBAT_ROLE_PRESETS.map((preset) => (
                    <option key={preset} value={preset} />
                  ))}
                </datalist>
              </div>
            </div>

            <div>
              <label
                htmlFor="profile-bio"
                style={{ fontSize: '0.78rem', color: 'var(--secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 700 }}
              >
                Crónica en el Vacío (Biografía)
              </label>
              <textarea
                id="profile-bio"
                name="bio"
                rows={3}
                className="search-input"
                placeholder="Deja testimonio de tu senda hacia el Quiebre…"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="profile-specialty-input"
                style={{ fontSize: '0.78rem', color: 'var(--secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 700 }}
              >
                Doctrinas de Guerra y Logística
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
                <input
                  id="profile-specialty-input"
                  name="specialty_input"
                  type="text"
                  className="search-input"
                  placeholder="Ej. Asedio Capital, Forja Abisal, Extracción en Fisuras…"
                  value={specialtyInput}
                  onChange={(e) => setSpecialtyInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSpecialty();
                    }
                  }}
                  autoComplete="off"
                  style={{ flex: 1, minWidth: '220px' }}
                />
                <button type="button" className="btn-secondary" onClick={handleAddSpecialty}>
                  Inscribir Doctrina
                </button>
              </div>

              <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                {specialties.map((sp) => (
                  <span
                    key={sp}
                    style={{
                      padding: '0.25rem 0.65rem',
                      background: 'rgba(212, 175, 55, 0.1)',
                      border: '1px solid rgba(212, 175, 55, 0.3)',
                      borderRadius: '4px',
                      fontSize: '0.82rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      color: 'var(--text-main)',
                    }}
                  >
                    <span>{sp}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSpecialty(sp)}
                      aria-label={`Eliminar doctrina ${sp}`}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '0.1rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                      }}
                    >
                      <X size={13} aria-hidden="true" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.25rem' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setIsEditing(false)}
                disabled={savingProfile}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={savingProfile}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
              >
                <Save size={15} aria-hidden="true" />
                {savingProfile ? 'Sellando…' : 'Sellar Expediente'}
              </button>
            </div>
          </form>
        )}
      </section>

      {/* URL-Synced Navigation Tabs */}
      <div
        role="tablist"
        aria-label="Secciones del Expediente del Hermano"
        className="surface-monolith"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '0.65rem',
          padding: '0.65rem',
          marginBottom: '1.75rem',
        }}
      >
        <button
          id="tab-expediente"
          type="button"
          role="tab"
          aria-selected={activeTab === 'expediente'}
          aria-controls="panel-expediente"
          className={`filter-btn ${activeTab === 'expediente' ? 'active' : ''}`}
          onClick={() => handleTabChange('expediente')}
          style={{ padding: '0.65rem 0.9rem', display: 'flex', alignItems: 'center', gap: '0.6rem', justifyContent: 'flex-start' }}
        >
          <Shield size={16} aria-hidden="true" style={{ flexShrink: 0 }} />
          <DualLabel sacred="Expediente Sagrado" tactical="Identidad, Marcas & Altar" size="sm" />
        </button>

        <button
          id="tab-arcas"
          type="button"
          role="tab"
          aria-selected={activeTab === 'arcas'}
          aria-controls="panel-arcas"
          className={`filter-btn ${activeTab === 'arcas' ? 'active' : ''}`}
          onClick={() => handleTabChange('arcas')}
          style={{ padding: '0.65rem 0.9rem', display: 'flex', alignItems: 'center', gap: '0.6rem', justifyContent: 'flex-start' }}
        >
          <Rocket size={16} aria-hidden="true" style={{ flexShrink: 0 }} />
          <DualLabel
            sacred={`Mis Arcas Estelares (${displayedShips.length})`}
            tactical="Hangar Personal de Naves"
            size="sm"
          />
        </button>

        <button
          id="tab-designios"
          type="button"
          role="tab"
          aria-selected={activeTab === 'designios'}
          aria-controls="panel-designios"
          className={`filter-btn ${activeTab === 'designios' ? 'active' : ''}`}
          onClick={() => handleTabChange('designios')}
          style={{ padding: '0.65rem 0.9rem', display: 'flex', alignItems: 'center', gap: '0.6rem', justifyContent: 'flex-start' }}
        >
          <Target size={16} aria-hidden="true" style={{ flexShrink: 0 }} />
          <DualLabel
            sacred={`Designios (${displayedObjectives.length})`}
            tactical="Objetivos y Tareas Asignadas"
            size="sm"
          />
        </button>

        <button
          id="tab-rito"
          type="button"
          role="tab"
          aria-selected={activeTab === 'rito'}
          aria-controls="panel-rito"
          className={`filter-btn ${activeTab === 'rito' ? 'active' : ''}`}
          onClick={() => handleTabChange('rito')}
          style={{ padding: '0.65rem 0.9rem', display: 'flex', alignItems: 'center', gap: '0.6rem', justifyContent: 'flex-start' }}
        >
          <Award size={16} aria-hidden="true" style={{ flexShrink: 0 }} />
          <DualLabel sacred="Escala & Rito" tactical="Rango y Requisitos de Ascenso" size="sm" />
        </button>
      </div>

      {/* TAB 1: EXPEDIENTE */}
      {activeTab === 'expediente' && (
        <div
          id="panel-expediente"
          role="tabpanel"
          aria-labelledby="tab-expediente"
          style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {/* Doctrines & Bio */}
            <section className="surface-monolith" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1.25rem' }}>
              <div>
                <div style={{ marginBottom: '1rem' }}>
                  <DualLabel
                    sacred="Doctrinas y Testimonio"
                    tactical="Especialidades Tácticas & Biografía"
                    size="md"
                  />
                </div>

                {user.specialties && user.specialties.length > 0 ? (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                    {user.specialties.map((s) => (
                      <span
                        key={s}
                        style={{
                          padding: '0.32rem 0.75rem',
                          borderRadius: '4px',
                          background: 'rgba(212, 175, 55, 0.1)',
                          color: 'var(--secondary)',
                          border: '1px solid rgba(212, 175, 55, 0.3)',
                          fontSize: '0.84rem',
                        }}
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                    Sin doctrinas inscritas. Pulsa en Editar Expediente para registrar tus especialidades.
                  </p>
                )}

                <h2
                  style={{
                    fontFamily: 'var(--cinzel-font)',
                    color: 'var(--secondary)',
                    fontSize: '0.95rem',
                    margin: '0 0 0.6rem',
                  }}
                >
                  Testimonio en el Vacío
                </h2>
                <p
                  className="prose-grimoire"
                  style={{
                    color: 'var(--text-muted)',
                    fontSize: '0.95rem',
                    margin: 0,
                    fontStyle: user.bio ? 'normal' : 'italic',
                  }}
                >
                  {user.bio || '«El hermano sirve en silencio mientras el Dragón Negro despierta.»'}
                </p>
              </div>

              <div
                style={{
                  paddingTop: '0.85rem',
                  borderTop: '1px solid rgba(212, 175, 55, 0.15)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                }}
              >
                <span>
                  Hangar: <strong className="tabular-nums" style={{ color: 'var(--text-main)' }}>{operationalCount} operativas</strong>
                </span>
                <span style={{ fontFamily: 'var(--cinzel-font)', letterSpacing: '2px', color: 'var(--secondary)' }}>
                  ☩ IN NOMINI OBLIVIONIS
                </span>
              </div>
            </section>

            {/* Altar Summary */}
            <section className="surface-monolith" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1.25rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  <DualLabel
                    sacred={TERMINOLOGY.altar.sacred}
                    tactical={`${TERMINOLOGY.altar.tactical} (${cart.length})`}
                    size="md"
                  />
                  <Layers size={20} aria-hidden="true" style={{ color: 'var(--secondary)' }} />
                </div>

                {cart.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', margin: 0 }}>
                    No tienes tecnomilagros activos en tu Altar de Forja personal.
                  </p>
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                    {cart.slice(0, 4).map((item) => (
                      <li
                        key={item.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.55rem 0.75rem',
                          background: 'rgba(0, 0, 0, 0.28)',
                          borderRadius: '4px',
                          borderLeft: '2px solid var(--secondary)',
                          fontSize: '0.9rem',
                        }}
                      >
                        <span style={{ color: 'var(--text-main)' }}>{item.name}</span>
                        <span className="tabular-nums" style={{ color: 'var(--secondary)', fontWeight: 700 }}>
                          ×{item.quantity}
                        </span>
                      </li>
                    ))}
                    {cart.length > 4 && (
                      <li className="tabular-nums" style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        +{cart.length - 4} recetas adicionales en el Altar…
                      </li>
                    )}
                  </ul>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Link to="/altar" className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                  <Layers size={15} aria-hidden="true" />
                  Abrir Altar de Forja
                </Link>
              </div>
            </section>
          </div>

          {/* Marcas del Abismo */}
          <section className="surface-monolith" style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Sparkles size={20} aria-hidden="true" style={{ color: 'var(--secondary)' }} />
                <TacticalTooltip text={TACTICAL_TOOLTIPS.marca_del_abismo.explanation}>
                  <DualLabel
                    sacred={TERMINOLOGY.marcaDelAbismo.sacred}
                    tactical={`${TERMINOLOGY.marcaDelAbismo.tactical} (${userMarks.length})`}
                    size="md"
                  />
                </TacticalTooltip>
              </div>
            </div>

            {userMarks.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', margin: 0 }}>
                Aún no posees Marcas del Abismo grabadas por el Concilio. Completa Designios verificados o distingue tu
                servicio en las Cruzadas.
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: '1rem' }}>
                {userMarks.map((mark) => (
                  <article
                    key={mark.id}
                    className="surface-monolith"
                    style={{
                      padding: '1.15rem',
                      borderLeft: '3px solid var(--secondary)',
                      background: 'rgba(0, 0, 0, 0.35)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.45rem' }}>
                      <TacticalTooltip text={TACTICAL_TOOLTIPS.marca_del_abismo.explanation}>
                        <strong style={{ color: 'var(--secondary)', fontFamily: 'var(--cinzel-font)', fontSize: '0.92rem' }}>
                          ☩ {mark.title}
                        </strong>
                      </TacticalTooltip>
                      <span className="tabular-nums" style={{ fontSize: '0.76rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {formatAbyssalDate(mark.created_at, { prefixCycle: true })}
                      </span>
                    </div>
                    <p className="prose-grimoire" style={{ margin: '0 0 0.55rem', fontSize: '0.88rem', color: 'var(--text-main)' }}>
                      {mark.reason}
                    </p>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Otorgada por: <strong style={{ color: 'var(--accent-silver)' }}>{mark.awarded_by_name || 'Concilio del Vacío'}</strong>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* Discreet Emergency Rescue (only if not yet linked to usr-* roster profile) */}
          {!user.id.startsWith('usr-') && (
            <section className="surface-monolith" style={{ padding: '1.25rem 1.5rem' }}>
              <details>
                <summary
                  style={{
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    listStyle: 'none',
                    color: 'var(--text-muted)',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                    <KeyRound size={15} aria-hidden="true" style={{ color: 'var(--secondary)' }} />
                    Rescate de Emergencia del Heraldo (Vínculo Manual de Roster)
                  </span>
                  <ChevronDown size={16} aria-hidden="true" />
                </summary>

                <form
                  onSubmit={handleClaimRoster}
                  style={{
                    marginTop: '1.15rem',
                    paddingTop: '1rem',
                    borderTop: '1px solid rgba(212, 175, 55, 0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                  }}
                >
                  <p className="prose-grimoire" style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-muted)' }}>
                    Si tu cuenta de Discord no coincidió automáticamente con tu asiento del Roster, solicita la fusión al
                    Concilio o utiliza el sello maestro de emergencia del servidor.
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                    <div>
                      <label
                        htmlFor="claim-handle"
                        style={{ fontSize: '0.76rem', color: 'var(--secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 700 }}
                      >
                        Expediente Canónico del Roster
                      </label>
                      <select
                        id="claim-handle"
                        name="handle"
                        className="select-filter"
                        value={claimHandle}
                        onChange={(e) => setClaimHandle(e.target.value)}
                      >
                        {ROSTER_CLAIM_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="claim-secret"
                        style={{ fontSize: '0.76rem', color: 'var(--secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 700 }}
                      >
                        Sello del Oráculo (AGENT_SYNC_TOKEN)
                      </label>
                      <input
                        id="claim-secret"
                        name="secret"
                        type="password"
                        className="search-input"
                        placeholder="Clave maestra del servidor…"
                        value={claimSecret}
                        onChange={(e) => setClaimSecret(e.target.value)}
                        autoComplete="off"
                        required
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" className="btn-secondary" disabled={claimingRoster}>
                      {claimingRoster ? 'Consagrando…' : 'Consagrar y Vincular Discord'}
                    </button>
                  </div>
                </form>
              </details>
            </section>
          )}
        </div>
      )}

      {/* TAB 2: MIS ARCAS ESTELARES (HANGAR PERSONAL) */}
      {activeTab === 'arcas' && (
        <div
          id="panel-arcas"
          role="tabpanel"
          aria-labelledby="tab-arcas"
          style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
        >
          {!isApproved ? (
            <section className="surface-monolith" style={{ padding: '2.25rem', textAlign: 'center' }}>
              <Lock size={28} aria-hidden="true" style={{ color: 'var(--status-warn)', marginBottom: '0.75rem' }} />
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.65rem' }}>
                <h2 style={{ margin: 0 }}>
                  <DualLabel
                    sacred="Hangar Sellado en el Umbral"
                    tactical="Disponible tras la aprobación del Concilio"
                    size="md"
                    align="center"
                  />
                </h2>
              </div>
              <p className="prose-grimoire" style={{ color: 'var(--text-muted)', margin: '0 auto 1.25rem' }}>
                Solo los Hermanos Consagrados pueden registrar Arcas Estelares en el Hangar de la Flota y desplegarlas en
                Edictos de Cruzada.
              </p>
              <Link to="/hermano?tab=rito" className="btn-secondary">
                Consultar Requisitos del Ritual
              </Link>
            </section>
          ) : (
            <>
              {/* Add Ship Form */}
              <section className="surface-monolith" style={{ padding: '1.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                  <h2 style={{ margin: 0 }}>
                    <DualLabel
                      sacred="Consagrar Nueva Arca Estelar"
                      tactical="Registrar nave propia o meta in-game en tu Hangar"
                      size="md"
                    />
                  </h2>
                  <Link to="/codice/arcas-estelares" className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Rocket size={14} aria-hidden="true" />
                    Explorar Códice de Naves
                  </Link>
                </div>

                <form onSubmit={handleCreateShip} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1rem', alignItems: 'start' }}>
                    <div
                      style={{ position: 'relative' }}
                      onBlur={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                          setShowShipSuggestions(false);
                        }
                      }}
                    >
                      <label
                        htmlFor="hangar-ship-search"
                        style={{ fontSize: '0.78rem', color: 'var(--secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 700 }}
                      >
                        Modelo del Arca Estelar (Catálogo Star Citizen)
                      </label>
                      <input
                        id="hangar-ship-search"
                        name="ship_search"
                        type="text"
                        className="search-input"
                        value={shipQuery}
                        onChange={(e) => {
                          setShipQuery(e.target.value);
                          setSelectedCatalogShip(null);
                          setShowShipSuggestions(true);
                        }}
                        onFocus={() => setShowShipSuggestions(true)}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            setShowShipSuggestions(false);
                          }
                        }}
                        placeholder="Ej. Aegis Redeemer, Cutlass Black…"
                        autoComplete="off"
                        spellCheck={false}
                        required
                      />
                      {selectedCatalogShip && (
                        <div style={{ fontSize: '0.74rem', color: 'var(--status-ok)', marginTop: '0.25rem' }}>
                          Catálogo: {resolveCatalogManufacturer(selectedCatalogShip)} ·{' '}
                          {resolveCatalogClass(selectedCatalogShip)}
                        </div>
                      )}

                      {showShipSuggestions && filteredCatalogShips.length > 0 && (
                        <div
                          id="hangar-ship-listbox"
                          role="listbox"
                          aria-label="Coincidencias del catálogo de naves"
                          className="surface-monolith"
                          style={{
                            position: 'absolute',
                            top: 'calc(100% + 4px)',
                            left: 0,
                            right: 0,
                            padding: '0.35rem',
                            zIndex: 50,
                            maxHeight: '260px',
                            overflowY: 'auto',
                            boxShadow: '0 14px 32px rgba(0, 0, 0, 0.85)',
                          }}
                        >
                          {filteredCatalogShips.map((ship) => {
                            const mfr = resolveCatalogManufacturer(ship);
                            const cls = resolveCatalogClass(ship);
                            return (
                              <button
                                key={ship.id}
                                type="button"
                                role="option"
                                aria-selected={selectedCatalogShip?.id === ship.id}
                                className="nav-dropdown-item"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => handleSelectCatalogShip(ship)}
                                style={{ padding: '0.5rem 0.65rem' }}
                              >
                                <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{ship.name}</span>
                                <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                                  {mfr} · {cls}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="hangar-ship-callsign"
                        style={{ fontSize: '0.78rem', color: 'var(--secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 700 }}
                      >
                        Apodo / Callsign de Flota (Opcional)
                      </label>
                      <input
                        id="hangar-ship-callsign"
                        name="callsign"
                        type="text"
                        maxLength={64}
                        className="search-input"
                        value={shipCallsign}
                        onChange={(e) => setShipCallsign(e.target.value)}
                        placeholder="Ej. Ceniza Carmesí…"
                        autoComplete="off"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="hangar-ship-status"
                        style={{ fontSize: '0.78rem', color: 'var(--secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 700 }}
                      >
                        Estado Táctico del Arca
                      </label>
                      <select
                        id="hangar-ship-status"
                        name="status"
                        className="select-filter"
                        value={shipStatus}
                        onChange={(e) => setShipStatus(e.target.value as MemberShipStatus)}
                      >
                        {(Object.keys(SHIP_STATUS_META) as ShipStatusKey[]).map((key) => {
                          const meta = SHIP_STATUS_META[key];
                          return (
                            <option key={key} value={key}>
                              {meta.sacred} · {meta.tactical}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {SHIP_STATUS_META[shipStatus].description}
                    </span>
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={savingShip}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
                    >
                      <Plus size={15} aria-hidden="true" />
                      {savingShip ? 'Consagrando…' : 'Consagrar en Hangar'}
                    </button>
                  </div>
                </form>
              </section>

              {/* Owned Ships List */}
              <section className="surface-monolith" style={{ padding: '1.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                  <h2 style={{ margin: 0 }}>
                    <DualLabel
                      sacred={`Hangar Personal (${displayedShips.length})`}
                      tactical={`${operationalCount} operativas para Edictos de Cruzada`}
                      size="md"
                    />
                  </h2>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => void fetchPersonalShips()}
                    disabled={isFetchingShips}
                  >
                    {isFetchingShips ? 'Sincronizando…' : 'Refrescar Hangar'}
                  </button>
                </div>

                {isFetchingShips && displayedShips.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', margin: 0 }}>Consultando bóvedas del Hangar…</p>
                ) : displayedShips.length === 0 ? (
                  <div style={{ padding: '1.5rem', background: 'rgba(0, 0, 0, 0.25)', borderRadius: '4px', color: 'var(--text-muted)' }}>
                    No tienes Arcas Estelares registradas todavía. Añade tus naves operativas o metas en forja para
                    desplegarlas en las Cruzadas.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                    {displayedShips.map((ship) => {
                      const statusMeta = SHIP_STATUS_META[ship.status] || SHIP_STATUS_META.operativa;
                      const isShipEditing = editingShipId === ship.id;
                      return (
                        <article
                          key={ship.id}
                          className="surface-monolith"
                          style={{
                            padding: '1.25rem',
                            background: 'rgba(0, 0, 0, 0.32)',
                            borderLeft: `3px solid ${statusMeta.color}`,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            gap: '0.85rem',
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.35rem' }}>
                              <strong style={{ fontFamily: 'var(--cinzel-font)', fontSize: '1rem', color: 'var(--text-main)' }}>
                                {ship.ship_name}
                              </strong>

                              <TacticalTooltip text={statusMeta.description}>
                                <span
                                  style={{
                                    padding: '0.18rem 0.55rem',
                                    borderRadius: '4px',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    color: statusMeta.color,
                                    border: `1px solid ${statusMeta.color}`,
                                    background: 'rgba(0, 0, 0, 0.45)',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {statusMeta.sacred}
                                </span>
                              </TacticalTooltip>
                            </div>

                            <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                              {ship.manufacturer} · {ship.ship_class}
                            </div>

                            {ship.callsign && (
                              <div style={{ fontSize: '0.86rem', color: 'var(--secondary)', fontStyle: 'italic' }}>
                                Callsign: «{ship.callsign}»
                              </div>
                            )}

                            <div className="tabular-nums" style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                              Registrada: {formatAbyssalDate(ship.created_at, { prefixCycle: true })}
                            </div>
                          </div>

                          {isShipEditing ? (
                            <div
                              style={{
                                paddingTop: '0.75rem',
                                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.65rem',
                              }}
                            >
                              <div>
                                <label
                                  htmlFor={`edit-ship-callsign-${ship.id}`}
                                  style={{ fontSize: '0.74rem', color: 'var(--secondary)', display: 'block', marginBottom: '0.25rem' }}
                                >
                                  Callsign / Apodo
                                </label>
                                <input
                                  id={`edit-ship-callsign-${ship.id}`}
                                  name="edit_callsign"
                                  type="text"
                                  maxLength={64}
                                  className="search-input"
                                  value={editShipCallsign}
                                  onChange={(e) => setEditShipCallsign(e.target.value)}
                                  placeholder="Sin apodo…"
                                />
                              </div>

                              <div>
                                <label
                                  htmlFor={`edit-ship-status-${ship.id}`}
                                  style={{ fontSize: '0.74rem', color: 'var(--secondary)', display: 'block', marginBottom: '0.25rem' }}
                                >
                                  Estado Táctico
                                </label>
                                <select
                                  id={`edit-ship-status-${ship.id}`}
                                  name="edit_status"
                                  className="select-filter"
                                  value={editShipStatus}
                                  onChange={(e) => setEditShipStatus(e.target.value as MemberShipStatus)}
                                >
                                  {(Object.keys(SHIP_STATUS_META) as ShipStatusKey[]).map((key) => (
                                    <option key={key} value={key}>
                                      {SHIP_STATUS_META[key].sacred} · {SHIP_STATUS_META[key].tactical}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                <button
                                  type="button"
                                  className="btn-secondary"
                                  onClick={() => setEditingShipId(null)}
                                  disabled={updatingShipId === ship.id}
                                >
                                  Cancelar
                                </button>
                                <button
                                  type="button"
                                  className="btn-primary"
                                  onClick={() => void handleSaveShipEdit(ship.id)}
                                  disabled={updatingShipId === ship.id}
                                >
                                  {updatingShipId === ship.id ? 'Guardando…' : 'Guardar'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                              <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => startEditShip(ship)}
                                style={{ padding: '0.4rem 0.75rem', fontSize: '0.74rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                              >
                                <Edit3 size={13} aria-hidden="true" />
                                Ajustar
                              </button>
                              <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => setShipToDelete(ship)}
                                aria-label={`Retirar ${ship.ship_name} del hangar`}
                                style={{
                                  padding: '0.4rem 0.7rem',
                                  fontSize: '0.74rem',
                                  borderColor: 'rgba(239, 68, 68, 0.45)',
                                  color: 'var(--status-danger)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                }}
                              >
                                <Trash2 size={13} aria-hidden="true" />
                                Retirar
                              </button>
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      )}

      {/* TAB 3: MIS DESIGNIOS */}
      {activeTab === 'designios' && (
        <div
          id="panel-designios"
          role="tabpanel"
          aria-labelledby="tab-designios"
        >
          <section className="surface-monolith" style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Target size={20} aria-hidden="true" style={{ color: 'var(--secondary)' }} />
                <h2 style={{ margin: 0 }}>
                  <DualLabel
                    sacred={`${TERMINOLOGY.designios.sacred} (${displayedObjectives.length})`}
                    tactical="Misiones y Tareas Personales Asignadas"
                    size="md"
                  />
                </h2>
              </div>
              <Link to="/edictos?tab=designios" className="btn-secondary">
                Ir a Edictos Sagrados
              </Link>
            </div>

            {!isApproved ? (
              <div style={{ padding: '1.5rem', background: 'rgba(0, 0, 0, 0.25)', borderRadius: '4px', color: 'var(--text-muted)' }}>
                Los Designios Sagrados se desbloquean una vez superado el Ritual de Iniciación ante el Concilio.
              </div>
            ) : isFetchingObjectives && displayedObjectives.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>Consultando Designios encomendados…</p>
            ) : displayedObjectives.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>
                No tienes Designios individuales asignados directamente en este ciclo. Consulta los Designios
                colectivos de la Flota en Edictos Sagrados.
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                {displayedObjectives.map((obj) => {
                  const isCompleted = obj.status === 'marca_del_abismo' || obj.status === 'cumplido';
                  const isRejected = obj.status === 'ceniza_fria';
                  const isAbandoned = obj.status === 'abandonado';
                  const isClosed = isCompleted || isRejected || isAbandoned;
                  const isUpdating = updatingObjectiveId === obj.id;
                  const borderAccent = isCompleted
                    ? 'var(--status-ok)'
                    : isRejected
                      ? 'var(--status-danger)'
                      : isAbandoned
                        ? 'var(--text-muted)'
                        : 'var(--secondary)';
                  return (
                    <article
                      key={obj.id}
                      className="surface-monolith"
                      style={{
                        padding: '1.25rem',
                        background: 'rgba(0, 0, 0, 0.32)',
                        borderLeft: `3px solid ${borderAccent}`,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginBottom: '0.45rem' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--secondary)', fontFamily: 'var(--cinzel-font)', textTransform: 'uppercase' }}>
                          {obj.category}
                        </span>
                        {isCompleted ? (
                          <span
                            className="tabular-nums status-ok"
                            style={{
                              fontSize: '0.75rem',
                              fontFamily: 'var(--cinzel-font)',
                              fontWeight: 700,
                            }}
                          >
                            ☩ MARCA DEL ABISMO
                          </span>
                        ) : isRejected ? (
                          <TacticalTooltip text={TACTICAL_TOOLTIPS.la_ceniza_fria.explanation}>
                            <span
                              className="tabular-nums status-danger"
                              style={{
                                fontSize: '0.75rem',
                                fontFamily: 'var(--cinzel-font)',
                                fontWeight: 700,
                              }}
                            >
                              LA CENIZA FRÍA · Rechazado
                            </span>
                          </TacticalTooltip>
                        ) : isAbandoned ? (
                          <span
                            className="tabular-nums text-muted"
                            style={{
                              fontSize: '0.75rem',
                              fontFamily: 'var(--cinzel-font)',
                              fontWeight: 700,
                            }}
                          >
                            ABANDONADO
                          </span>
                        ) : (
                          <span
                            className="tabular-nums status-warn"
                            style={{
                              fontSize: '0.75rem',
                              fontFamily: 'var(--cinzel-font)',
                              fontWeight: 700,
                            }}
                          >
                            {obj.progress}% COMPLETADO
                          </span>
                        )}
                      </div>

                      <h3 style={{ margin: '0 0 0.45rem', fontSize: '1rem', color: 'var(--text-main)' }}>
                        {obj.title}
                      </h3>

                      {obj.description && (
                        <p className="prose-grimoire" style={{ fontSize: '0.86rem', color: 'var(--text-muted)', margin: '0 0 0.75rem' }}>
                          {obj.description}
                        </p>
                      )}

                      {obj.due_date && (
                        <div className="tabular-nums" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.8rem' }}>
                          Límite del Ciclo: {formatAbyssalDate(obj.due_date, { prefixCycle: true })}
                        </div>
                      )}

                      {!isClosed && (
                        <div style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="btn-secondary"
                            disabled={isUpdating}
                            style={{ fontSize: '0.74rem', padding: '0.35rem 0.7rem' }}
                            onClick={() =>
                              void handleUpdateMyObjectiveProgress(obj.id, Math.min(100, obj.progress + 25))
                            }
                          >
                            +25% Avance
                          </button>
                          <button
                            type="button"
                            className="btn-primary"
                            disabled={isUpdating}
                            style={{ fontSize: '0.74rem', padding: '0.35rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                            onClick={() => void handleUpdateMyObjectiveProgress(obj.id, 100)}
                          >
                            <Award size={13} aria-hidden="true" />
                            Reclamar Marca (100%)
                          </button>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* TAB 4: LA ESCALA DEL ABISMO & RITUALES DE ASCENSO */}
      {activeTab === 'rito' && (
        <div
          id="panel-rito"
          role="tabpanel"
          aria-labelledby="tab-rito"
          style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: '1.5rem' }}>
            {/* Escalation Ladder */}
            <section className="surface-monolith" style={{ padding: '1.75rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <h2 style={{ margin: 0 }}>
                  <DualLabel
                    sacred="La Escala del Abismo"
                    tactical="Los 6 Peldaños de Jerarquía en la Hermandad"
                    size="md"
                  />
                </h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                {ESCALA_RANKS.map((r) => {
                  const isCurrent = user.status === 'approved' && currentRankLevel === r.level;
                  const isPassed = user.status === 'approved' && currentRankLevel >= r.level;
                  return (
                    <div
                      key={r.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                        padding: '0.75rem 1rem',
                        background: isCurrent ? `${r.color}20` : 'rgba(0, 0, 0, 0.32)',
                        borderRadius: '4px',
                        borderLeft: `4px solid ${r.cssVar}`,
                      }}
                    >
                      <div>
                        <div
                          className="tabular-nums"
                          style={{
                            fontSize: '0.92rem',
                            color: isPassed ? 'var(--text-main)' : 'var(--text-muted)',
                            fontWeight: isCurrent ? 700 : 500,
                          }}
                        >
                          [{r.roman}] {r.name}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {r.archetype} · {r.tacticalRole}
                        </div>
                      </div>
                      {isCurrent && (
                        <span
                          style={{
                            fontSize: '0.7rem',
                            color: r.cssVar,
                            fontFamily: 'var(--cinzel-font)',
                            fontWeight: 700,
                            letterSpacing: '1px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          PELDAÑO ACTUAL
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Concrete Lectitio Requirements */}
            <section className="surface-monolith" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1.25rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
                  <DualLabel
                    sacred={TERMINOLOGY.rituales.sacred}
                    tactical="Requisitos Canónicos del Lectitio Divinitatus"
                    size="md"
                  />
                  <Link to="/divinitatus?tab=rituales" className="btn-secondary" style={{ fontSize: '0.74rem', padding: '0.4rem 0.8rem' }}>
                    Abrir Lectitio
                  </Link>
                </div>

                {nextTrial ? (
                  <div
                    style={{
                      padding: '1rem 1.15rem',
                      marginBottom: '1.15rem',
                      background: 'rgba(212, 175, 55, 0.08)',
                      border: `1px solid ${nextTrial.color}`,
                      borderRadius: '4px',
                    }}
                  >
                    <div style={{ fontFamily: 'var(--cinzel-font)', fontSize: '0.8rem', color: 'var(--secondary)', marginBottom: '0.4rem' }}>
                      PRÓXIMO ASCENSO ({nextTrial.roman}): {nextTrial.from} → {nextTrial.to}
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '1.15rem', color: 'var(--text-main)', fontSize: '0.88rem', lineHeight: 1.6 }}>
                      {nextTrial.steps.map((step, idx) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ul>
                  </div>
                ) : user.status !== 'approved' ? (
                  <div
                    style={{
                      padding: '1rem 1.15rem',
                      marginBottom: '1.15rem',
                      background: 'rgba(245, 158, 11, 0.08)',
                      border: '1px solid var(--status-warn)',
                      borderRadius: '4px',
                    }}
                  >
                    <div style={{ fontFamily: 'var(--cinzel-font)', fontSize: '0.82rem', color: 'var(--status-warn)', marginBottom: '0.35rem' }}>
                      RITUAL DE INICIACIÓN — DESPERTAR EN LAS RUINAS
                    </div>
                    <p className="prose-grimoire" style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                      Completa el Juramento del Vacío en Nyx y aguarda la consagración del Concilio para ascender al
                      primer peldaño: Sombras del Umbral.
                    </p>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: '1rem 1.15rem',
                      marginBottom: '1.15rem',
                      background: 'rgba(212, 175, 55, 0.08)',
                      border: '1px solid var(--rank-6)',
                      borderRadius: '4px',
                    }}
                  >
                    <div style={{ fontFamily: 'var(--cinzel-font)', fontSize: '0.85rem', color: 'var(--rank-6)' }}>
                      CÚSPIDE ALCANZADA — LA VOZ DEL DRAGÓN
                    </div>
                    <p className="prose-grimoire" style={{ margin: '0.35rem 0 0', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                      Has alcanzado el peldaño supremo de la Escala del Abismo. Tu palabra moldea el destino del
                      Grimoire.
                    </p>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {ASCENSION_TRIALS.map((trial) => (
                    <div
                      key={trial.roman}
                      style={{
                        padding: '0.85rem 1rem',
                        background: 'rgba(0, 0, 0, 0.28)',
                        borderRadius: '4px',
                        borderLeft: `3px solid ${trial.color}`,
                      }}
                    >
                      <div style={{ fontFamily: 'var(--cinzel-font)', fontSize: '0.8rem', color: trial.color, marginBottom: '0.35rem' }}>
                        Ascenso {trial.roman}: {trial.from} → {trial.to}
                      </div>
                      <ul style={{ margin: 0, paddingLeft: '1.1rem', color: 'var(--text-muted)', fontSize: '0.84rem', lineHeight: 1.55 }}>
                        {trial.steps.map((step, idx) => (
                          <li key={idx}>{step}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* Delete Ship Confirmation Modal */}
      <SealConfirmModal
        isOpen={Boolean(shipToDelete)}
        variant="danger"
        title="Retirar Arca Estelar del Hangar"
        message={
          shipToDelete
            ? `¿Confirmas retirar «${shipToDelete.ship_name}»${shipToDelete.callsign ? ` (${shipToDelete.callsign})` : ''} de tu Hangar Personal? Si estaba asignada a una Cruzada, su vínculo de nave se liberará.`
            : ''
        }
        confirmLabel="Retirar Arca"
        cancelLabel="Conservar"
        isLoading={deletingShip}
        onConfirm={confirmDeleteShip}
        onCancel={() => {
          if (!deletingShip) setShipToDelete(null);
        }}
      />
    </div>
  );
};

export default BrotherProfile;

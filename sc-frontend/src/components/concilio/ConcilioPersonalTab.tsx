import React, { useId, useMemo, useState } from 'react';
import {
  Award,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Edit3,
  GitMerge,
  Link2,
  Loader2,
  Lock,
  RefreshCw,
  Search,
  ShieldAlert,
  Unlink,
  UserCheck,
  UserPlus,
  UserX,
} from 'lucide-react';
import {
  approveCouncilUser,
  preregisterCouncilUser,
  rejectCouncilUser,
  unlinkCouncilUserDiscord,
} from '../../api/client';
import type { BrotherProfile, UserRole, UserStatus } from '../../types';
import {
  HOME_SYSTEMS,
  ROLE_META,
  TACTICAL_TOOLTIPS,
  getRankMeta,
} from '../../constants/terminology';
import { useToast } from '../AbyssalToast';
import DualLabel, { TacticalTooltip } from '../DualLabel';
import SealConfirmModal from '../SealConfirmModal';
import MemberEditModal from './MemberEditModal';
import MergeDiscordModal from './MergeDiscordModal';
import {
  USER_STATUS_META,
  canBeMergeTarget,
  canManageCouncilTarget,
  canRejectCouncilTarget,
  canUnlinkCouncilTarget,
  extractApiError,
  formatSqliteAbyssalTimestamp,
  getAssignableRanks,
  getAssignableRoles,
  suggestDefaultRoleForRank,
} from './concilioHelpers';

export interface ConcilioPersonalTabProps {
  actor: BrotherProfile;
  users: BrotherProfile[];
  pendingCount: number;
  loading: boolean;
  error: string | null;
  onRefresh: () => Promise<void>;
  onSelfMutated: () => Promise<void>;
}

type StatusFilter = 'all' | UserStatus;
type LinkFilter = 'all' | 'linked' | 'unlinked';

const ConcilioPersonalTab: React.FC<ConcilioPersonalTabProps> = ({
  actor,
  users,
  pendingCount,
  loading,
  error,
  onRefresh,
  onSelfMutated,
}) => {
  const { showToast } = useToast();
  const filterPrefix = useId();
  const preregPrefix = useId();

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [linkFilter, setLinkFilter] = useState<LinkFilter>('all');

  // Pre-register drawer
  const [showPreregister, setShowPreregister] = useState<boolean>(false);
  const [preregDisplayName, setPreregDisplayName] = useState<string>('');
  const [preregRsi, setPreregRsi] = useState<string>('');
  const [preregExpectedDiscord, setPreregExpectedDiscord] = useState<string>('');
  const [preregRankId, setPreregRankId] = useState<string>('sombras');
  const [preregRole, setPreregRole] = useState<UserRole>('hermano');
  const [preregCargo, setPreregCargo] = useState<string>('');
  const [preregHomeSystem, setPreregHomeSystem] = useState<string>('Pyro');
  const [preregCombatRole, setPreregCombatRole] = useState<string>('Vanguardia');
  const [preregSpecialties, setPreregSpecialties] = useState<string>('');
  const [preregBio, setPreregBio] = useState<string>('');
  const [isPreregistering, setIsPreregistering] = useState<boolean>(false);

  // Action states
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [mergeModalState, setMergeModalState] = useState<{
    mode: 'pick-target' | 'pick-source';
    anchorUser: BrotherProfile;
  } | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'reject' | 'unlink';
    target: BrotherProfile;
  } | null>(null);
  const [isConfirming, setIsConfirming] = useState<boolean>(false);

  const pendingUsers = useMemo(
    () => users.filter((u) => u.status === 'pending'),
    [users],
  );

  const editingMember = useMemo(
    () =>
      editingMemberId
        ? users.find((u) => u.id === editingMemberId) ?? null
        : null,
    [editingMemberId, users],
  );

  const assignableRanks = useMemo(
    () => getAssignableRanks(actor.role, false),
    [actor.role],
  );
  const assignableRoles = useMemo(
    () => getAssignableRoles(actor.role),
    [actor.role],
  );

  const filteredUsers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return users.filter((u) => {
      if (statusFilter !== 'all' && u.status !== statusFilter) return false;
      if (linkFilter === 'linked' && !u.is_discord_linked) return false;
      if (linkFilter === 'unlinked' && u.is_discord_linked) return false;
      if (!q) return true;
      return (
        u.display_name.toLowerCase().includes(q) ||
        (u.rsi_handle ?? '').toLowerCase().includes(q) ||
        (u.discord_username ?? '').toLowerCase().includes(q) ||
        (u.expected_discord_username ?? '').toLowerCase().includes(q) ||
        (u.cargo ?? '').toLowerCase().includes(q)
      );
    });
  }, [linkFilter, searchTerm, statusFilter, users]);

  const handlePreregRankChange = (nextRankId: string) => {
    setPreregRankId(nextRankId);
    setPreregRole(suggestDefaultRoleForRank(nextRankId, actor.role));
  };

  const handlePreregisterSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleanName = preregDisplayName.trim();
    if (!cleanName) {
      showToast('El nombre de combate es obligatorio para pre-registrar.', 'error');
      return;
    }

    const parsedSpecialties = preregSpecialties
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    setIsPreregistering(true);
    try {
      const res = await preregisterCouncilUser({
        display_name: cleanName,
        rsi_handle: preregRsi.trim() || null,
        expected_discord_username: preregExpectedDiscord.trim() || null,
        rank_id: preregRankId,
        role: preregRole,
        cargo: preregCargo.trim() || undefined,
        home_system: preregHomeSystem,
        combat_role: preregCombatRole.trim() || 'Vanguardia',
        bio: preregBio.trim() || null,
        specialties: parsedSpecialties,
      });
      showToast(
        res.message ?? `Expediente de ${cleanName} pre-registrado.`,
        'success',
      );
      setPreregDisplayName('');
      setPreregRsi('');
      setPreregExpectedDiscord('');
      setPreregCargo('');
      setPreregSpecialties('');
      setPreregBio('');
      setPreregRankId('sombras');
      setPreregRole('hermano');
      setShowPreregister(false);
      await onRefresh();
    } catch (err: unknown) {
      showToast(
        extractApiError(err, 'No se pudo pre-registrar el expediente ORG.'),
        'error',
      );
    } finally {
      setIsPreregistering(false);
    }
  };

  const handleApprovePending = async (candidate: BrotherProfile) => {
    if (!canManageCouncilTarget(actor, candidate)) return;
    setBusyUserId(candidate.id);
    try {
      const res = await approveCouncilUser(candidate.id);
      showToast(
        res.message ??
          `${candidate.display_name} consagrado en Rango I (Sombras del Umbral).`,
        'success',
      );
      await onRefresh();
    } catch (err: unknown) {
      showToast(
        extractApiError(err, 'No se pudo aprobar al candidato.'),
        'error',
      );
    } finally {
      setBusyUserId(null);
    }
  };

  const handleConfirmModalAction = async () => {
    if (!confirmAction) return;
    setIsConfirming(true);
    try {
      if (confirmAction.type === 'reject') {
        const res = await rejectCouncilUser(confirmAction.target.id);
        showToast(
          res.message ??
            `${confirmAction.target.display_name} arrojado a La Ceniza Fría.`,
          'info',
        );
      } else {
        const res = await unlinkCouncilUserDiscord(confirmAction.target.id);
        showToast(
          res.message ??
            `Discord desvinculado de ${confirmAction.target.display_name}.`,
          'success',
        );
      }
      setConfirmAction(null);
      await onRefresh();
    } catch (err: unknown) {
      showToast(
        extractApiError(err, 'No se pudo completar la acción del Concilio.'),
        'error',
      );
    } finally {
      setIsConfirming(false);
    }
  };

  if (loading && users.length === 0) {
    return (
      <div
        className="surface-monolith"
        style={{ padding: '3rem 2rem', textAlign: 'center' }}
      >
        <Loader2
          size={32}
          className="spin"
          aria-hidden="true"
          style={{ color: 'var(--secondary)', marginBottom: '0.8rem' }}
        />
        <p style={{ color: 'var(--text-muted)', margin: 0 }}>
          Consultando registros de la Hermandad…
        </p>
      </div>
    );
  }

  if (error && users.length === 0) {
    return (
      <div
        className="surface-monolith"
        style={{
          padding: '2rem',
          borderLeft: '3px solid var(--primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <ShieldAlert size={22} aria-hidden="true" style={{ color: 'var(--primary)' }} />
          <div>
            <strong style={{ color: 'var(--text-main)' }}>Fallo al cargar el censo</strong>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{error}</div>
          </div>
        </div>
        <button type="button" className="btn-secondary" onClick={() => void onRefresh()}>
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Sub-section A: Pending Umbral Queue */}
      <section className="surface-monolith" style={{ padding: '1.5rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            marginBottom: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <UserCheck size={20} aria-hidden="true" style={{ color: 'var(--status-warn)' }} />
            <h2 style={{ margin: 0 }}>
              <DualLabel
                sacred="CANDIDATOS EN EL UMBRAL"
                tactical="Cola de Aprobación, Fusión 1-Clic o Rechazo"
                size="md"
              />
            </h2>
            <span
              className="tabular-nums"
              style={{
                padding: '0.2rem 0.6rem',
                borderRadius: '999px',
                background:
                  pendingCount > 0
                    ? 'rgba(245, 158, 11, 0.16)'
                    : 'rgba(148, 163, 184, 0.12)',
                border: `1px solid ${pendingCount > 0 ? 'rgba(245, 158, 11, 0.45)' : 'rgba(148, 163, 184, 0.25)'}`,
                color: pendingCount > 0 ? 'var(--status-warn)' : 'var(--text-muted)',
                fontSize: '0.78rem',
                fontWeight: 700,
              }}
            >
              {pendingCount} pendientes
            </span>
          </div>

          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowPreregister((prev) => !prev)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
          >
            <UserPlus size={15} aria-hidden="true" />
            Pre-registrar Miembro ORG
            {showPreregister ? (
              <ChevronUp size={15} aria-hidden="true" />
            ) : (
              <ChevronDown size={15} aria-hidden="true" />
            )}
          </button>
        </div>

        {pendingUsers.length === 0 ? (
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.92rem' }}>
            No hay aspirantes aguardando en el Umbral en este ciclo.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {pendingUsers.map((candidate) => {
              const isBusy = busyUserId === candidate.id;
              const canManage = canManageCouncilTarget(actor, candidate);
              const canReject = canRejectCouncilTarget(actor, candidate);
              const canMerge =
                Boolean(candidate.is_discord_linked) && canManage;
              return (
                <div
                  key={candidate.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    flexWrap: 'wrap',
                    padding: '0.9rem 1rem',
                    borderRadius: '4px',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    background: 'rgba(245, 158, 11, 0.05)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: 0 }}>
                    {candidate.discord_avatar ? (
                      <img
                        src={candidate.discord_avatar}
                        alt={`Avatar de ${candidate.display_name}`}
                        width={42}
                        height={42}
                        loading="lazy"
                        style={{
                          borderRadius: '50%',
                          border: '1px solid rgba(212, 175, 55, 0.45)',
                          objectFit: 'cover',
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <div
                        aria-hidden="true"
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '50%',
                          border: '1px solid rgba(212, 175, 55, 0.35)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--secondary)',
                          fontFamily: 'var(--cinzel-font)',
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        ☩
                      </div>
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <strong style={{ color: 'var(--text-main)', fontSize: '1rem' }}>
                          {candidate.display_name}
                        </strong>
                        {candidate.discord_username && (
                          <span
                            translate="no"
                            style={{ color: 'var(--accent-rsi)', fontSize: '0.84rem' }}
                          >
                            @{candidate.discord_username}
                          </span>
                        )}
                      </div>
                      <div
                        className="tabular-nums"
                        style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}
                      >
                        Llegada al Umbral: {formatSqliteAbyssalTimestamp(candidate.created_at)}
                        {candidate.rsi_handle ? ` · RSI: ${candidate.rsi_handle}` : ''}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
                    {!canManage && (
                      <TacticalTooltip text="Autoridad exclusiva del Heraldo (Admin): el Consejo no puede modificar miembros de Rango V–VI ni otros miembros del Consejo">
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.4rem 0.65rem',
                            borderRadius: '4px',
                            border: '1px solid rgba(212, 175, 55, 0.3)',
                            color: 'var(--secondary)',
                            fontSize: '0.78rem',
                          }}
                        >
                          <Lock size={13} aria-hidden="true" />
                          Solo Heraldo
                        </span>
                      </TacticalTooltip>
                    )}

                    <button
                      type="button"
                      className="btn-primary"
                      disabled={isBusy || !canManage}
                      onClick={() => void handleApprovePending(candidate)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.9rem' }}
                    >
                      {isBusy ? (
                        <Loader2 size={14} className="spin" aria-hidden="true" />
                      ) : (
                        <CheckCircle2 size={14} aria-hidden="true" />
                      )}
                      Consagrar (Rango I)
                    </button>

                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={isBusy || !canMerge}
                      onClick={() =>
                        setMergeModalState({ mode: 'pick-target', anchorUser: candidate })
                      }
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.85rem' }}
                    >
                      <GitMerge size={14} aria-hidden="true" />
                      Vincular con Miembro ORG
                    </button>

                    <TacticalTooltip text={TACTICAL_TOOLTIPS.la_ceniza_fria.explanation} focusable={false}>
                      <button
                        type="button"
                        className="btn-secondary"
                        disabled={isBusy || !canReject}
                        onClick={() =>
                          setConfirmAction({ type: 'reject', target: candidate })
                        }
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          padding: '0.5rem 0.85rem',
                          borderColor: 'rgba(196, 30, 58, 0.45)',
                          color: '#fca5a5',
                        }}
                      >
                        <UserX size={14} aria-hidden="true" />
                        La Ceniza Fría
                      </button>
                    </TacticalTooltip>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Sub-section B: Pre-register ORG Member Form */}
      {showPreregister && (
        <section className="surface-monolith" style={{ padding: '1.5rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <DualLabel
              sacred="PRE-REGISTRO DE MIEMBRO ORG"
              tactical="Crear Asiento Pendiente sin Login Previo en Discord (Auto-vínculo OAuth2)"
              size="md"
            />
          </div>

          <form
            onSubmit={handlePreregisterSubmit}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '0.9rem',
            }}
          >
            <div>
              <label
                htmlFor={`${preregPrefix}-display`}
                style={{ display: 'block', fontSize: '0.82rem', color: 'var(--secondary)', marginBottom: '0.3rem' }}
              >
                Nombre de Combate (Requerido)
              </label>
              <input
                id={`${preregPrefix}-display`}
                type="text"
                className="search-input"
                value={preregDisplayName}
                onChange={(e) => setPreregDisplayName(e.target.value)}
                placeholder="Ej. KaelenVoss…"
                spellCheck={false}
                autoComplete="off"
                required
              />
            </div>

            <div>
              <label
                htmlFor={`${preregPrefix}-rsi`}
                style={{ display: 'block', fontSize: '0.82rem', color: 'var(--accent-rsi)', marginBottom: '0.3rem' }}
              >
                Handle RSI
              </label>
              <input
                id={`${preregPrefix}-rsi`}
                type="text"
                className="search-input"
                value={preregRsi}
                onChange={(e) => setPreregRsi(e.target.value)}
                placeholder="Citizen Handle…"
                spellCheck={false}
                autoComplete="off"
              />
            </div>

            <div>
              <label
                htmlFor={`${preregPrefix}-discord`}
                style={{ display: 'block', fontSize: '0.82rem', color: 'var(--accent-silver)', marginBottom: '0.3rem' }}
              >
                @Discord Esperado
              </label>
              <input
                id={`${preregPrefix}-discord`}
                type="text"
                className="search-input"
                value={preregExpectedDiscord}
                onChange={(e) => setPreregExpectedDiscord(e.target.value)}
                placeholder="usuario_discord…"
                spellCheck={false}
                autoComplete="off"
              />
            </div>

            <div>
              <label
                htmlFor={`${preregPrefix}-rank`}
                style={{ display: 'block', fontSize: '0.82rem', color: 'var(--secondary)', marginBottom: '0.3rem' }}
              >
                Rango en La Escala
              </label>
              <select
                id={`${preregPrefix}-rank`}
                className="select-filter"
                value={preregRankId}
                onChange={(e) => handlePreregRankChange(e.target.value)}
              >
                {assignableRanks.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.roman} — {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor={`${preregPrefix}-role`}
                style={{ display: 'block', fontSize: '0.82rem', color: 'var(--accent-conclave)', marginBottom: '0.3rem' }}
              >
                Rol Técnico
              </label>
              <select
                id={`${preregPrefix}-role`}
                className="select-filter"
                value={preregRole}
                onChange={(e) => setPreregRole(e.target.value as UserRole)}
              >
                {assignableRoles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.sacred} ({r.tactical})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor={`${preregPrefix}-cargo`}
                style={{ display: 'block', fontSize: '0.82rem', color: 'var(--accent-silver)', marginBottom: '0.3rem' }}
              >
                Cargo (Opcional)
              </label>
              <input
                id={`${preregPrefix}-cargo`}
                type="text"
                className="search-input"
                value={preregCargo}
                onChange={(e) => setPreregCargo(e.target.value)}
                placeholder="Se autogenera si queda vacío…"
                autoComplete="off"
              />
            </div>

            <div>
              <label
                htmlFor={`${preregPrefix}-system`}
                style={{ display: 'block', fontSize: '0.82rem', color: 'var(--accent-silver)', marginBottom: '0.3rem' }}
              >
                Sistema de Origen
              </label>
              <select
                id={`${preregPrefix}-system`}
                className="select-filter"
                value={preregHomeSystem}
                onChange={(e) => setPreregHomeSystem(e.target.value)}
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
                htmlFor={`${preregPrefix}-combat`}
                style={{ display: 'block', fontSize: '0.82rem', color: 'var(--accent-silver)', marginBottom: '0.3rem' }}
              >
                Rol de Combate
              </label>
              <input
                id={`${preregPrefix}-combat`}
                type="text"
                className="search-input"
                value={preregCombatRole}
                onChange={(e) => setPreregCombatRole(e.target.value)}
                placeholder="Vanguardia…"
                autoComplete="off"
              />
            </div>

            <div>
              <label
                htmlFor={`${preregPrefix}-specialties`}
                style={{ display: 'block', fontSize: '0.82rem', color: 'var(--accent-silver)', marginBottom: '0.3rem' }}
              >
                Especialidades (Coma)
              </label>
              <input
                id={`${preregPrefix}-specialties`}
                type="text"
                className="search-input"
                value={preregSpecialties}
                onChange={(e) => setPreregSpecialties(e.target.value)}
                placeholder="Escolta, Minería…"
                autoComplete="off"
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label
                htmlFor={`${preregPrefix}-bio`}
                style={{ display: 'block', fontSize: '0.82rem', color: 'var(--accent-silver)', marginBottom: '0.3rem' }}
              >
                Biografía Inicial (Opcional)
              </label>
              <textarea
                id={`${preregPrefix}-bio`}
                className="search-input"
                rows={2}
                value={preregBio}
                onChange={(e) => setPreregBio(e.target.value)}
                placeholder="Registro inicial del miembro en el Ciclo 2956…"
                style={{ resize: 'vertical' }}
              />
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '0.7rem' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowPreregister(false)}
                disabled={isPreregistering}
              >
                Cerrar
              </button>
              <button type="submit" className="btn-primary" disabled={isPreregistering}>
                {isPreregistering ? (
                  <span className="seal-modal-loading">
                    <Loader2 size={14} className="spin" aria-hidden="true" />
                    Registrando…
                  </span>
                ) : (
                  'Crear Asiento ORG'
                )}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Sub-section C: Filterable Roster & Management */}
      <section className="surface-monolith" style={{ padding: '1.5rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            marginBottom: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <DualLabel
            sacred="CENSO DE LA HERMANDAD"
            tactical={`Gestión de Rangos, Roles Técnicos, Vínculos Discord & Marcas (${filteredUsers.length}/${users.length})`}
            size="md"
          />

          <button
            type="button"
            className="btn-secondary"
            onClick={() => void onRefresh()}
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : undefined} aria-hidden="true" />
            Actualizar Censo
          </button>
        </div>

        {/* Filter Controls */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
            gap: '0.8rem',
            marginBottom: '1.25rem',
          }}
        >
          <div>
            <label
              htmlFor={`${filterPrefix}-search`}
              style={{ display: 'block', fontSize: '0.78rem', color: 'var(--accent-silver)', marginBottom: '0.25rem' }}
            >
              Buscar Hermano
            </label>
            <div style={{ position: 'relative' }}>
              <Search
                size={15}
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  left: '0.8rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  pointerEvents: 'none',
                }}
              />
              <input
                id={`${filterPrefix}-search`}
                type="text"
                className="search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nombre, Handle RSI, @discord, cargo…"
                spellCheck={false}
                autoComplete="off"
                style={{ paddingLeft: '2.3rem' }}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor={`${filterPrefix}-status`}
              style={{ display: 'block', fontSize: '0.78rem', color: 'var(--accent-silver)', marginBottom: '0.25rem' }}
            >
              Estado en la Orden
            </label>
            <select
              id={`${filterPrefix}-status`}
              className="select-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            >
              <option value="all">Todos los estados</option>
              <option value="approved">Consagrado (Aprobado)</option>
              <option value="pending">En el Umbral (Pendiente)</option>
              <option value="suspended">Velo Suspendido</option>
              <option value="rejected">La Ceniza Fría (Rechazado)</option>
            </select>
          </div>

          <div>
            <label
              htmlFor={`${filterPrefix}-link`}
              style={{ display: 'block', fontSize: '0.78rem', color: 'var(--accent-silver)', marginBottom: '0.25rem' }}
            >
              Vínculo Discord
            </label>
            <select
              id={`${filterPrefix}-link`}
              className="select-filter"
              value={linkFilter}
              onChange={(e) => setLinkFilter(e.target.value as LinkFilter)}
            >
              <option value="all">Todos los vínculos</option>
              <option value="linked">Vinculado (OAuth2 activo)</option>
              <option value="unlinked">Asiento Pendiente (Sin Discord)</option>
            </select>
          </div>
        </div>

        {filteredUsers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.2rem 1rem', color: 'var(--text-muted)' }}>
            <p style={{ margin: '0 0 0.8rem' }}>
              Ningún expediente coincide con los filtros seleccionados.
            </p>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setLinkFilter('all');
              }}
            >
              Limpiar filtros
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {filteredUsers.map((m) => {
              const rankMeta = getRankMeta(m.rank_id ?? m.rank_level);
              const roleMeta = ROLE_META[m.role] ?? ROLE_META.hermano;
              const statusMeta = USER_STATUS_META[m.status];
              const canManage = canManageCouncilTarget(actor, m);
              const canUnlink = canUnlinkCouncilTarget(actor, m);
              const canMergeSeat = canBeMergeTarget(actor, m);
              const marksCount = m.abyssal_marks?.length ?? 0;

              return (
                <article
                  key={m.id}
                  style={{
                    padding: '1rem 1.15rem',
                    borderRadius: '4px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderLeft: `4px solid ${rankMeta.color}`,
                    background: 'rgba(10, 4, 5, 0.72)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: '1rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ minWidth: 0, flex: '1 1 300px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                        <strong style={{ color: 'var(--text-main)', fontSize: '1.08rem', fontFamily: 'var(--cinzel-font)' }}>
                          {m.display_name}
                        </strong>

                        {m.id === actor.id && (
                          <span
                            style={{
                              fontSize: '0.68rem',
                              padding: '0.12rem 0.45rem',
                              borderRadius: '3px',
                              border: '1px solid rgba(212, 175, 55, 0.45)',
                              color: 'var(--secondary)',
                            }}
                          >
                            Tu Expediente
                          </span>
                        )}

                        <span
                          style={{
                            fontSize: '0.72rem',
                            padding: '0.15rem 0.55rem',
                            borderRadius: '3px',
                            border: `1px solid ${rankMeta.color}`,
                            color: rankMeta.color,
                            fontWeight: 700,
                          }}
                        >
                          {rankMeta.roman !== '0' ? `Rango ${rankMeta.roman} · ` : ''}
                          {rankMeta.name}
                        </span>

                        <span
                          style={{
                            fontSize: '0.72rem',
                            padding: '0.15rem 0.55rem',
                            borderRadius: '3px',
                            border: `1px solid ${roleMeta.color}`,
                            color: roleMeta.color,
                            fontWeight: 700,
                          }}
                        >
                          {roleMeta.sacred}
                        </span>

                        {m.status === 'rejected' ? (
                          <TacticalTooltip text={TACTICAL_TOOLTIPS.la_ceniza_fria.explanation}>
                            <span
                              style={{
                                fontSize: '0.72rem',
                                padding: '0.15rem 0.55rem',
                                borderRadius: '3px',
                                border: `1px solid ${statusMeta.color}`,
                                color: statusMeta.color,
                                fontWeight: 700,
                              }}
                            >
                              {statusMeta.sacred}
                            </span>
                          </TacticalTooltip>
                        ) : (
                          <span
                            style={{
                              fontSize: '0.72rem',
                              padding: '0.15rem 0.55rem',
                              borderRadius: '3px',
                              border: `1px solid ${statusMeta.color}`,
                              color: statusMeta.color,
                              fontWeight: 700,
                            }}
                          >
                            {statusMeta.sacred}
                          </span>
                        )}
                      </div>

                      <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '0.35rem' }}>
                        {m.cargo}
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.85rem',
                          flexWrap: 'wrap',
                          fontSize: '0.82rem',
                        }}
                      >
                        {m.is_discord_linked ? (
                          <TacticalTooltip text="Cuenta de Discord vinculada y verificada en el Umbral">
                            <span
                              translate="no"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                color: 'var(--status-ok)',
                              }}
                            >
                              <Link2 size={13} aria-hidden="true" />
                              Vinculado: @{m.discord_username || m.display_name}
                            </span>
                          </TacticalTooltip>
                        ) : (
                          <TacticalTooltip text="Expediente ORG pre-registrado sin Discord vinculado; listo para auto-vínculo OAuth2 o fusión 1-clic">
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                color: 'var(--status-warn)',
                              }}
                            >
                              <Unlink size={13} aria-hidden="true" />
                              Asiento Pendiente
                              {m.expected_discord_username
                                ? ` (espera: @${m.expected_discord_username})`
                                : ' (sin Discord esperado)'}
                            </span>
                          </TacticalTooltip>
                        )}

                        {m.rsi_handle && (
                          <span translate="no" style={{ color: 'var(--accent-rsi)' }}>
                            RSI: {m.rsi_handle}
                          </span>
                        )}

                        <span style={{ color: 'var(--accent-silver)' }}>
                          Sistema: {m.home_system || 'Pyro'} · {m.combat_role || 'Vanguardia'}
                        </span>

                        <TacticalTooltip text={TACTICAL_TOOLTIPS.marca_del_abismo.explanation}>
                          <span
                            className="tabular-nums"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              color: marksCount > 0 ? 'var(--secondary)' : 'var(--text-muted)',
                            }}
                          >
                            <Award size={13} aria-hidden="true" />
                            {marksCount} {marksCount === 1 ? 'Marca' : 'Marcas'}
                          </span>
                        </TacticalTooltip>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {!canManage && (
                        <TacticalTooltip text="Autoridad exclusiva del Heraldo (Admin): el Consejo no puede modificar miembros de Rango V–VI ni otros miembros del Consejo">
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.4rem 0.65rem',
                              borderRadius: '4px',
                              border: '1px solid rgba(212, 175, 55, 0.3)',
                              color: 'var(--secondary)',
                              fontSize: '0.78rem',
                            }}
                          >
                            <Lock size={13} aria-hidden="true" />
                            Solo Heraldo
                          </span>
                        </TacticalTooltip>
                      )}

                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => setEditingMemberId(m.id)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.85rem' }}
                      >
                        <Edit3 size={14} aria-hidden="true" />
                        {canManage ? 'Editar & Marcas' : 'Ver Expediente'}
                      </button>

                      {!m.is_discord_linked && canMergeSeat && (
                        <button
                          type="button"
                          className="btn-primary"
                          onClick={() =>
                            setMergeModalState({ mode: 'pick-source', anchorUser: m })
                          }
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.85rem' }}
                        >
                          <GitMerge size={14} aria-hidden="true" />
                          Vincular Discord
                        </button>
                      )}

                      {m.is_discord_linked && (
                        <button
                          type="button"
                          className="btn-secondary"
                          disabled={!canUnlink}
                          onClick={() => setConfirmAction({ type: 'unlink', target: m })}
                          title={
                            m.id === actor.id
                              ? 'No puedes desvincular tu propia cuenta activa'
                              : undefined
                          }
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.45rem 0.8rem',
                            borderColor: 'rgba(196, 30, 58, 0.45)',
                            color: '#fca5a5',
                          }}
                        >
                          <Unlink size={14} aria-hidden="true" />
                          Desvincular
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {editingMember && (
        <MemberEditModal
          key={editingMember.id}
          member={editingMember}
          actor={actor}
          onClose={() => setEditingMemberId(null)}
          onUpdated={async (editedId) => {
            await onRefresh();
            if (editedId === actor.id) {
              await onSelfMutated();
            }
          }}
        />
      )}

      {mergeModalState && (
        <MergeDiscordModal
          key={`${mergeModalState.anchorUser.id}-${mergeModalState.mode}`}
          isOpen
          mode={mergeModalState.mode}
          anchorUser={mergeModalState.anchorUser}
          allUsers={users}
          actor={actor}
          onClose={() => setMergeModalState(null)}
          onMerged={async () => {
            await onRefresh();
          }}
        />
      )}

      <SealConfirmModal
        isOpen={Boolean(confirmAction)}
        title={
          confirmAction?.type === 'reject'
            ? 'Arrojar a La Ceniza Fría'
            : 'Desvincular Identidad de Discord'
        }
        message={
          confirmAction?.type === 'reject'
            ? `¿Confirmas rechazar la solicitud de ${confirmAction.target.display_name} y marcar su expediente como La Ceniza Fría?`
            : `¿Confirmas desvincular la cuenta Discord de ${confirmAction?.target.display_name ?? ''}? Su sesión JWT activa quedará revocada de inmediato y el expediente pasará a Asiento Pendiente.`
        }
        confirmLabel={
          confirmAction?.type === 'reject'
            ? 'Confirmar Rechazo'
            : 'Desvincular Discord'
        }
        variant="danger"
        isLoading={isConfirming}
        onCancel={() => setConfirmAction(null)}
        onConfirm={handleConfirmModalAction}
      />
    </div>
  );
};

export default ConcilioPersonalTab;

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Award, Loader2, ShieldAlert, Trash2, X } from 'lucide-react';
import {
  grantAbyssalMark,
  revokeAbyssalMark,
  updateCouncilUser,
} from '../../api/client';
import type {
  AbyssalMark,
  BrotherProfile,
  UserRole,
  UserStatus,
} from '../../types';
import {
  HOME_SYSTEMS,
  ROLE_META,
  TACTICAL_TOOLTIPS,
} from '../../constants/terminology';
import { useToast } from '../AbyssalToast';
import DualLabel, { TacticalTooltip } from '../DualLabel';
import SealConfirmModal from '../SealConfirmModal';
import {
  DIALOG_FOCUSABLE_SELECTOR,
  HERALDO_SUPREMO_ID,
  USER_STATUS_META,
  canManageCouncilTarget,
  extractApiError,
  formatSqliteAbyssalTimestamp,
  getAssignableRanks,
  getAssignableRoles,
  suggestDefaultRoleForRank,
} from './concilioHelpers';

export interface MemberEditModalProps {
  member: BrotherProfile | null;
  actor: BrotherProfile;
  onClose: () => void;
  onUpdated: (editedUserId: string) => Promise<void>;
}

const VALID_EDIT_STATUSES: readonly UserStatus[] = [
  'pending',
  'approved',
  'suspended',
  'rejected',
] as const;

const MemberEditModal: React.FC<MemberEditModalProps> = ({
  member,
  actor,
  onClose,
  onUpdated,
}) => {
  const { showToast } = useToast();
  const titleId = useId();
  const formPrefix = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const [displayName, setDisplayName] = useState<string>(member?.display_name ?? '');
  const [rsiHandle, setRsiHandle] = useState<string>(member?.rsi_handle ?? '');
  const [expectedDiscord, setExpectedDiscord] = useState<string>(
    member?.expected_discord_username ?? '',
  );
  const [rankId, setRankId] = useState<string>(member?.rank_id ?? 'sombras');
  const [role, setRole] = useState<UserRole>(member?.role ?? 'hermano');
  const [cargo, setCargo] = useState<string>(member?.cargo ?? '');
  const [status, setStatus] = useState<UserStatus>(member?.status ?? 'approved');
  const [homeSystem, setHomeSystem] = useState<string>(member?.home_system ?? 'Pyro');
  const [combatRole, setCombatRole] = useState<string>(member?.combat_role ?? 'Vanguardia');
  const [bio, setBio] = useState<string>(member?.bio ?? '');
  const [specialtiesText, setSpecialtiesText] = useState<string>(
    (member?.specialties ?? []).join(', '),
  );

  const [markTitle, setMarkTitle] = useState<string>('');
  const [markReason, setMarkReason] = useState<string>('');
  const [markToRevoke, setMarkToRevoke] = useState<AbyssalMark | null>(null);

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isGrantingMark, setIsGrantingMark] = useState<boolean>(false);
  const [isRevokingMark, setIsRevokingMark] = useState<boolean>(false);

  const onCloseRef = useRef(onClose);
  const escapeBlockedRef = useRef(false);
  const nestedModalOpenRef = useRef(false);

  useEffect(() => {
    onCloseRef.current = onClose;
    escapeBlockedRef.current = Boolean(markToRevoke) || isSaving || isGrantingMark;
    nestedModalOpenRef.current = Boolean(markToRevoke);
  }, [onClose, markToRevoke, isSaving, isGrantingMark]);

  const canManage = member ? canManageCouncilTarget(actor, member) : false;
  const isSelf = member ? member.id === actor.id : false;
  const isHeraldoSupremo = member ? member.id === HERALDO_SUPREMO_ID : false;

  const assignableRanks = useMemo(
    () => getAssignableRanks(actor.role, member?.rank_id === 'candidato'),
    [actor.role, member?.rank_id],
  );
  const assignableRoles = useMemo(
    () => getAssignableRoles(actor.role),
    [actor.role],
  );

  const memberId = member?.id ?? null;

  useEffect(() => {
    if (!memberId) return;

    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const raf = window.requestAnimationFrame(() => {
      closeBtnRef.current?.focus();
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (nestedModalOpenRef.current) return;

      if (event.key === 'Escape') {
        if (!escapeBlockedRef.current) {
          event.preventDefault();
          onCloseRef.current();
        }
        return;
      }

      if (event.key !== 'Tab') return;
      const dialog = dialogRef.current;
      if (!dialog) return;

      const focusables = Array.from(
        dialog.querySelectorAll<HTMLElement>(DIALOG_FOCUSABLE_SELECTOR),
      ).filter((el) => el.getClientRects().length > 0 || el === document.activeElement);

      if (focusables.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (event.shiftKey) {
        if (active === first || !dialog.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last || !dialog.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    };
  }, [memberId]);

  if (!member) return null;

  const handleRankChange = (nextRankId: string) => {
    setRankId(nextRankId);
    // Sugerir rol por defecto solo si no es self admin ni Heraldo Supremo
    if (!isHeraldoSupremo && !(isSelf && actor.role === 'admin') && nextRankId !== 'candidato') {
      const suggested = suggestDefaultRoleForRank(nextRankId, actor.role);
      setRole(suggested);
    }
  };

  const handleStatusChange = (nextStatus: UserStatus) => {
    setStatus(nextStatus);
    if (nextStatus === 'approved' && rankId === 'candidato') {
      setRankId('sombras');
      if (!isHeraldoSupremo && !(isSelf && actor.role === 'admin')) {
        setRole(suggestDefaultRoleForRank('sombras', actor.role));
      }
      showToast(
        'Rango ajustado automáticamente a Rango I (Sombras del Umbral) para consagrar al miembro.',
        'info',
      );
    }
  };

  const handleSaveDossier = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canManage) return;
    const cleanDisplay = displayName.trim();
    if (!cleanDisplay) {
      showToast('El nombre de combate es obligatorio.', 'error');
      return;
    }
    if (status === 'approved' && rankId === 'candidato') {
      showToast(
        'Un miembro Consagrado (aprobado) debe tener al menos Rango I (Sombras del Umbral) en La Escala del Abismo.',
        'error',
      );
      return;
    }

    const parsedSpecialties = specialtiesText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    setIsSaving(true);
    try {
      const res = await updateCouncilUser(member.id, {
        display_name: cleanDisplay,
        rsi_handle: rsiHandle.trim() || null,
        expected_discord_username: expectedDiscord.trim() || null,
        rank_id: rankId,
        role,
        cargo: cargo.trim(),
        status,
        home_system: homeSystem.trim() || 'Pyro',
        combat_role: combatRole.trim() || 'Vanguardia',
        bio: bio.trim() || null,
        specialties: parsedSpecialties,
      });
      showToast(
        res.message ?? `Expediente de ${cleanDisplay} actualizado.`,
        'success',
      );
      await onUpdated(member.id);
      onClose();
    } catch (err: unknown) {
      showToast(
        extractApiError(err, 'No se pudo guardar el expediente del Hermano.'),
        'error',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleGrantMark = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canManage) return;
    const cleanTitle = markTitle.trim();
    if (!cleanTitle) {
      showToast('Indica el título de la Marca del Abismo.', 'error');
      return;
    }
    setIsGrantingMark(true);
    try {
      await grantAbyssalMark(member.id, {
        title: cleanTitle,
        reason: markReason.trim(),
      });
      showToast(`Marca del Abismo otorgada a ${member.display_name}.`, 'success');
      setMarkTitle('');
      setMarkReason('');
      await onUpdated(member.id);
    } catch (err: unknown) {
      showToast(
        extractApiError(err, 'No se pudo otorgar la Marca del Abismo.'),
        'error',
      );
    } finally {
      setIsGrantingMark(false);
    }
  };

  const handleConfirmRevokeMark = async () => {
    if (!markToRevoke) return;
    setIsRevokingMark(true);
    try {
      await revokeAbyssalMark(markToRevoke.id);
      showToast(`Marca "${markToRevoke.title}" revocada.`, 'success');
      setMarkToRevoke(null);
      await onUpdated(member.id);
    } catch (err: unknown) {
      showToast(
        extractApiError(err, 'No se pudo revocar la Marca del Abismo.'),
        'error',
      );
    } finally {
      setIsRevokingMark(false);
    }
  };

  const roleLocked =
    !canManage || isHeraldoSupremo || (isSelf && actor.role === 'admin');
  const statusLocked = !canManage || isHeraldoSupremo || isSelf;
  const marks = member.abyssal_marks ?? [];

  return (
    <>
      <div
        className="seal-modal-backdrop"
        style={{ overscrollBehavior: 'contain' }}
        onClick={() => {
          if (!isSaving && !isGrantingMark && !markToRevoke) onClose();
        }}
      >
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="surface-monolith seal-modal-dialog"
          style={{
            maxWidth: '820px',
            maxHeight: '92vh',
            overflowY: 'auto',
            overscrollBehavior: 'contain',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            ref={closeBtnRef}
            type="button"
            className="seal-modal-close"
            onClick={onClose}
            disabled={isSaving || isGrantingMark}
            aria-label="Cerrar editor de expediente"
          >
            <X size={18} aria-hidden="true" />
          </button>

          <div className="seal-modal-header" style={{ marginBottom: '1rem' }}>
            <h2 id={titleId} className="seal-modal-title" style={{ margin: 0 }}>
              <DualLabel
                sacred={`EXPEDIENTE: ${member.display_name}`}
                tactical="Edición de Rango, Rol Técnico, Vínculo & Marcas"
                size="md"
              />
            </h2>
          </div>

          {!canManage && (
            <div
              role="status"
              style={{
                padding: '0.85rem 1rem',
                borderRadius: '4px',
                border: '1px solid rgba(212, 175, 55, 0.4)',
                background: 'rgba(212, 175, 55, 0.08)',
                color: 'var(--secondary)',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                fontSize: '0.9rem',
              }}
            >
              <ShieldAlert size={18} aria-hidden="true" style={{ flexShrink: 0 }} />
              <span>
                Autoridad exclusiva del Heraldo (Admin): como miembro del Consejo no
                puedes alterar expedientes de Rango V–VI ni de otros miembros del Consejo.
              </span>
            </div>
          )}

          <form
            onSubmit={handleSaveDossier}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
              gap: '0.9rem',
              marginBottom: '1.8rem',
            }}
          >
            <div>
              <label
                htmlFor={`${formPrefix}-display`}
                style={{ display: 'block', fontSize: '0.82rem', color: 'var(--secondary)', marginBottom: '0.3rem' }}
              >
                Nombre de Combate
              </label>
              <input
                id={`${formPrefix}-display`}
                type="text"
                className="search-input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={!canManage}
                spellCheck={false}
                autoComplete="off"
                required
              />
            </div>

            <div>
              <label
                htmlFor={`${formPrefix}-rsi`}
                style={{ display: 'block', fontSize: '0.82rem', color: 'var(--accent-rsi)', marginBottom: '0.3rem' }}
              >
                Handle RSI (Citizen)
              </label>
              <input
                id={`${formPrefix}-rsi`}
                type="text"
                className="search-input"
                value={rsiHandle}
                onChange={(e) => setRsiHandle(e.target.value)}
                disabled={!canManage}
                placeholder="Ej. Quaker…"
                spellCheck={false}
                autoComplete="off"
              />
            </div>

            <div>
              <label
                htmlFor={`${formPrefix}-expected-discord`}
                style={{ display: 'block', fontSize: '0.82rem', color: 'var(--accent-silver)', marginBottom: '0.3rem' }}
              >
                Discord Esperado (Auto-vínculo OAuth2)
              </label>
              <input
                id={`${formPrefix}-expected-discord`}
                type="text"
                className="search-input"
                value={expectedDiscord}
                onChange={(e) => setExpectedDiscord(e.target.value)}
                disabled={!canManage}
                placeholder="usuario_discord…"
                spellCheck={false}
                autoComplete="off"
              />
            </div>

            <div>
              <label
                htmlFor={`${formPrefix}-rank`}
                style={{ display: 'block', fontSize: '0.82rem', color: 'var(--secondary)', marginBottom: '0.3rem' }}
              >
                Rango en La Escala del Abismo
              </label>
              <select
                id={`${formPrefix}-rank`}
                className="select-filter"
                value={rankId}
                onChange={(e) => handleRankChange(e.target.value)}
                disabled={!canManage}
              >
                {assignableRanks.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.roman !== '0' ? `${r.roman} — ` : ''}
                    {r.name} ({r.tacticalRole})
                  </option>
                ))}
                {!assignableRanks.some((r) => r.id === rankId) && member.rank && (
                  <option value={member.rank.id} disabled>
                    {member.rank.name} (Solo Heraldo)
                  </option>
                )}
              </select>
            </div>

            <div>
              <label
                htmlFor={`${formPrefix}-role`}
                style={{ display: 'block', fontSize: '0.82rem', color: 'var(--accent-conclave)', marginBottom: '0.3rem' }}
              >
                Rol Técnico (Permisos)
              </label>
              <select
                id={`${formPrefix}-role`}
                className="select-filter"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                disabled={roleLocked}
              >
                {assignableRoles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.sacred} — {r.tactical}
                  </option>
                ))}
                {!assignableRoles.some((r) => r.id === role) && (
                  <option value={role} disabled>
                    {ROLE_META[role]?.sacred ?? role} (Solo Heraldo)
                  </option>
                )}
              </select>
            </div>

            <div>
              <label
                htmlFor={`${formPrefix}-status`}
                style={{ display: 'block', fontSize: '0.82rem', color: 'var(--accent-silver)', marginBottom: '0.3rem' }}
              >
                Estado en la Orden
              </label>
              <select
                id={`${formPrefix}-status`}
                className="select-filter"
                value={status}
                onChange={(e) => handleStatusChange(e.target.value as UserStatus)}
                disabled={statusLocked}
              >
                {VALID_EDIT_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {USER_STATUS_META[st].sacred} ({USER_STATUS_META[st].tactical})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor={`${formPrefix}-cargo`}
                style={{ display: 'block', fontSize: '0.82rem', color: 'var(--accent-silver)', marginBottom: '0.3rem' }}
              >
                Cargo / Título en la Hermandad
              </label>
              <input
                id={`${formPrefix}-cargo`}
                type="text"
                className="search-input"
                value={cargo}
                onChange={(e) => setCargo(e.target.value)}
                disabled={!canManage}
                placeholder="El Estratega Oscuro — Profeta…"
                autoComplete="off"
              />
            </div>

            <div>
              <label
                htmlFor={`${formPrefix}-system`}
                style={{ display: 'block', fontSize: '0.82rem', color: 'var(--accent-silver)', marginBottom: '0.3rem' }}
              >
                Sistema de Origen
              </label>
              <select
                id={`${formPrefix}-system`}
                className="select-filter"
                value={homeSystem}
                onChange={(e) => setHomeSystem(e.target.value)}
                disabled={!canManage}
              >
                {HOME_SYSTEMS.map((sys) => (
                  <option key={sys} value={sys}>
                    {sys}
                  </option>
                ))}
                {!(HOME_SYSTEMS as readonly string[]).includes(homeSystem) && homeSystem && (
                  <option value={homeSystem}>{homeSystem}</option>
                )}
              </select>
            </div>

            <div>
              <label
                htmlFor={`${formPrefix}-combat-role`}
                style={{ display: 'block', fontSize: '0.82rem', color: 'var(--accent-silver)', marginBottom: '0.3rem' }}
              >
                Doctrina / Rol de Combate
              </label>
              <input
                id={`${formPrefix}-combat-role`}
                type="text"
                className="search-input"
                value={combatRole}
                onChange={(e) => setCombatRole(e.target.value)}
                disabled={!canManage}
                placeholder="Vanguardia / Logística / Asalto…"
                autoComplete="off"
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label
                htmlFor={`${formPrefix}-specialties`}
                style={{ display: 'block', fontSize: '0.82rem', color: 'var(--accent-silver)', marginBottom: '0.3rem' }}
              >
                Especialidades (separadas por coma)
              </label>
              <input
                id={`${formPrefix}-specialties`}
                type="text"
                className="search-input"
                value={specialtiesText}
                onChange={(e) => setSpecialtiesText(e.target.value)}
                disabled={!canManage}
                placeholder="Asedio Capital, Minería Pyro, Escolta…"
                autoComplete="off"
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label
                htmlFor={`${formPrefix}-bio`}
                style={{ display: 'block', fontSize: '0.82rem', color: 'var(--accent-silver)', marginBottom: '0.3rem' }}
              >
                Crónica Personal / Biografía
              </label>
              <textarea
                id={`${formPrefix}-bio`}
                className="search-input"
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                disabled={!canManage}
                placeholder="Testimonio del hermano en el Ciclo 2956…"
                style={{ resize: 'vertical' }}
              />
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={onClose}
                disabled={isSaving || isGrantingMark}
              >
                Cerrar
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={!canManage || isSaving || isGrantingMark}
              >
                {isSaving ? (
                  <span className="seal-modal-loading">
                    <Loader2 size={14} className="spin" aria-hidden="true" />
                    Guardando…
                  </span>
                ) : (
                  'Guardar Expediente'
                )}
              </button>
            </div>
          </form>

          {/* Marcas del Abismo section */}
          <div
            style={{
              borderTop: '1px solid rgba(212, 175, 55, 0.25)',
              paddingTop: '1.35rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.9rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                <Award size={18} aria-hidden="true" style={{ color: 'var(--secondary)' }} />
                <TacticalTooltip text={TACTICAL_TOOLTIPS.marca_del_abismo.explanation}>
                  <DualLabel
                    sacred="MARCAS DEL ABISMO"
                    tactical={`Logros y Condecoraciones Verificadas (${marks.length})`}
                    size="sm"
                  />
                </TacticalTooltip>
              </div>
            </div>

            {marks.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: '0 0 1rem' }}>
                Este hermano aún no porta Marcas del Abismo grabadas en su expediente.
              </p>
            ) : (
              <ul
                style={{
                  listStyle: 'none',
                  margin: '0 0 1rem',
                  padding: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                {marks.map((m) => (
                  <li
                    key={m.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.8rem',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '4px',
                      border: '1px solid rgba(212, 175, 55, 0.22)',
                      background: 'rgba(212, 175, 55, 0.05)',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: 'var(--secondary)', fontWeight: 700, fontSize: '0.92rem' }}>
                        ☩ {m.title}
                      </div>
                      {m.reason && (
                        <div style={{ color: 'var(--accent-silver)', fontSize: '0.84rem' }}>
                          {m.reason}
                        </div>
                      )}
                      <div
                        className="tabular-nums"
                        style={{ color: 'var(--text-muted)', fontSize: '0.76rem', marginTop: '0.15rem' }}
                      >
                        Otorgada por {m.awarded_by_name ?? 'El Concilio'} ·{' '}
                        {formatSqliteAbyssalTimestamp(m.created_at)}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setMarkToRevoke(m)}
                      disabled={!canManage}
                      aria-label={`Revocar Marca ${m.title}`}
                      style={{
                        padding: '0.4rem 0.65rem',
                        borderColor: 'rgba(196, 30, 58, 0.45)',
                        color: '#fca5a5',
                        flexShrink: 0,
                      }}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <form
              onSubmit={handleGrantMark}
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))',
                gap: '0.65rem',
                alignItems: 'end',
              }}
            >
              <div>
                <label
                  htmlFor={`${formPrefix}-mark-title`}
                  style={{ display: 'block', fontSize: '0.78rem', color: 'var(--secondary)', marginBottom: '0.25rem' }}
                >
                  Título de la Marca
                </label>
                <input
                  id={`${formPrefix}-mark-title`}
                  type="text"
                  className="search-input"
                  value={markTitle}
                  onChange={(e) => setMarkTitle(e.target.value)}
                  disabled={!canManage}
                  placeholder="Ej. Vigía de Ruin Station…"
                  autoComplete="off"
                />
              </div>

              <div>
                <label
                  htmlFor={`${formPrefix}-mark-reason`}
                  style={{ display: 'block', fontSize: '0.78rem', color: 'var(--accent-silver)', marginBottom: '0.25rem' }}
                >
                  Motivo / Hazaña (Opcional)
                </label>
                <input
                  id={`${formPrefix}-mark-reason`}
                  type="text"
                  className="search-input"
                  value={markReason}
                  onChange={(e) => setMarkReason(e.target.value)}
                  disabled={!canManage}
                  placeholder="Aseguró el corredor en Pyro VI…"
                  autoComplete="off"
                />
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={!canManage || isGrantingMark}
                style={{ whiteSpace: 'nowrap' }}
              >
                {isGrantingMark ? (
                  <span className="seal-modal-loading">
                    <Loader2 size={14} className="spin" aria-hidden="true" />
                    Grabando…
                  </span>
                ) : (
                  'Otorgar Marca'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      <SealConfirmModal
        isOpen={Boolean(markToRevoke)}
        title="Revocar Marca del Abismo"
        message={`¿Confirmas revocar la Marca "${markToRevoke?.title ?? ''}" del expediente de ${member.display_name}?`}
        confirmLabel="Revocar Marca"
        variant="danger"
        isLoading={isRevokingMark}
        onCancel={() => setMarkToRevoke(null)}
        onConfirm={handleConfirmRevokeMark}
      />
    </>
  );
};

export default MemberEditModal;

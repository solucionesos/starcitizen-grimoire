import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { GitMerge, Link2, Loader2, ShieldAlert, X } from 'lucide-react';
import { mergeCouncilUser } from '../../api/client';
import type { BrotherProfile } from '../../types';
import { getRankMeta } from '../../constants/terminology';
import { useToast } from '../AbyssalToast';
import DualLabel from '../DualLabel';
import {
  DIALOG_FOCUSABLE_SELECTOR,
  HERALDO_SUPREMO_ID,
  canBeMergeSource,
  canBeMergeTarget,
  extractApiError,
} from './concilioHelpers';

export interface MergeDiscordModalProps {
  isOpen: boolean;
  mode: 'pick-target' | 'pick-source';
  anchorUser: BrotherProfile | null;
  allUsers: BrotherProfile[];
  actor: BrotherProfile;
  onClose: () => void;
  onMerged: (mergedUser: BrotherProfile | undefined) => Promise<void>;
}

const MergeDiscordModal: React.FC<MergeDiscordModalProps> = ({
  isOpen,
  mode,
  anchorUser,
  allUsers,
  actor,
  onClose,
  onMerged,
}) => {
  const { showToast } = useToast();
  const titleId = useId();
  const selectId = useId();
  const searchId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const cancelBtnRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const [selectedId, setSelectedId] = useState<string>('');
  const [filterText, setFilterText] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const onCloseRef = useRef(onClose);
  const isSubmittingRef = useRef(isSubmitting);

  useEffect(() => {
    onCloseRef.current = onClose;
    isSubmittingRef.current = isSubmitting;
  }, [onClose, isSubmitting]);

  const candidates = useMemo(() => {
    if (!anchorUser) return [];
    const q = filterText.trim().toLowerCase();
    return allUsers
      .filter((u) => u.id !== anchorUser.id)
      .filter((u) => {
        if (!q) return true;
        return (
          u.display_name.toLowerCase().includes(q) ||
          (u.rsi_handle ?? '').toLowerCase().includes(q) ||
          (u.discord_username ?? '').toLowerCase().includes(q) ||
          (u.expected_discord_username ?? '').toLowerCase().includes(q)
        );
      });
  }, [allUsers, anchorUser, filterText]);

  const selectableCandidates = useMemo(() => {
    if (!anchorUser) return [];
    return candidates.filter((u) =>
      mode === 'pick-target'
        ? canBeMergeTarget(actor, u)
        : canBeMergeSource(actor, u),
    );
  }, [actor, anchorUser, candidates, mode]);

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const raf = window.requestAnimationFrame(() => {
      cancelBtnRef.current?.focus();
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (!isSubmittingRef.current) {
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
  }, [isOpen]);

  if (!isOpen || !anchorUser) return null;

  const effectiveSelectedId = selectableCandidates.some((c) => c.id === selectedId)
    ? selectedId
    : (selectableCandidates[0]?.id ?? '');

  const anchorRank = getRankMeta(anchorUser.rank_id ?? anchorUser.rank_level);
  const selectedCandidate =
    selectableCandidates.find((c) => c.id === effectiveSelectedId) ?? null;

  const sourceUser = mode === 'pick-target' ? anchorUser : selectedCandidate;
  const targetUser = mode === 'pick-target' ? selectedCandidate : anchorUser;

  const handleConfirmMerge = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!sourceUser || !targetUser) return;
    setIsSubmitting(true);
    try {
      const res = await mergeCouncilUser(targetUser.id, sourceUser.id);
      showToast(
        res.message ??
          `Cuenta de Discord vinculada en el expediente de ${targetUser.display_name}.`,
        'success',
      );
      await onMerged(res.user);
      onClose();
    } catch (err: unknown) {
      showToast(
        extractApiError(err, 'No se pudo completar la fusión del expediente.'),
        'error',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="seal-modal-backdrop"
      style={{ overscrollBehavior: 'contain' }}
      onClick={() => {
        if (!isSubmitting) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="surface-monolith seal-modal-dialog"
        style={{ maxWidth: '640px', overscrollBehavior: 'contain' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="seal-modal-close"
          onClick={onClose}
          disabled={isSubmitting}
          aria-label="Cerrar modal de vinculación"
        >
          <X size={18} aria-hidden="true" />
        </button>

        <div className="seal-modal-header" style={{ marginBottom: '0.75rem' }}>
          <GitMerge size={22} aria-hidden="true" style={{ color: 'var(--secondary)' }} />
          <h2 id={titleId} className="seal-modal-title" style={{ margin: 0 }}>
            <DualLabel
              sacred="VINCULAR CON EXPEDIENTE ORG"
              tactical="Fusión 1-Clic Discord ↔ Miembro Existente"
              size="md"
            />
          </h2>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '0 0 1.2rem' }}>
          {mode === 'pick-target'
            ? 'Transfiere la identidad verificada de Discord al asiento ORG pre-registrado. La cuenta temporal en el Umbral se absorberá sin perder votos, naves ni marcas.'
            : 'Selecciona una cuenta de Discord entrante para vincularla a este expediente sin conexión previa.'}
        </p>

        {/* Anchor card */}
        <div
          style={{
            padding: '0.9rem 1rem',
            borderRadius: '4px',
            border: '1px solid rgba(212, 175, 55, 0.28)',
            background: 'rgba(10, 4, 5, 0.72)',
            marginBottom: '1rem',
          }}
        >
          <div
            style={{
              fontSize: '0.74rem',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              color: 'var(--secondary)',
              marginBottom: '0.35rem',
            }}
          >
            {mode === 'pick-target'
              ? 'Cuenta Discord Entrante (Origen)'
              : 'Expediente ORG Destino (Asiento Pendiente)'}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div>
              <strong style={{ color: 'var(--text-main)', fontSize: '1.05rem' }}>
                {anchorUser.display_name}
              </strong>
              <div style={{ color: 'var(--accent-silver)', fontSize: '0.85rem' }}>
                {anchorUser.discord_username
                  ? `Discord: @${anchorUser.discord_username}`
                  : anchorUser.expected_discord_username
                    ? `Discord esperado: @${anchorUser.expected_discord_username}`
                    : 'Sin usuario Discord asignado'}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span
                style={{
                  color: anchorRank.color,
                  fontFamily: 'var(--cinzel-font)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                }}
              >
                {anchorRank.roman !== '0' ? `Rango ${anchorRank.roman} · ` : ''}
                {anchorRank.name}
              </span>
              {anchorUser.rsi_handle && (
                <div style={{ color: 'var(--accent-rsi)', fontSize: '0.82rem' }}>
                  RSI: {anchorUser.rsi_handle}
                </div>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleConfirmMerge} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label
              htmlFor={searchId}
              style={{
                display: 'block',
                fontSize: '0.82rem',
                color: 'var(--accent-silver)',
                marginBottom: '0.35rem',
              }}
            >
              Filtrar candidatos disponibles
            </label>
            <input
              id={searchId}
              type="text"
              className="search-input"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Buscar por nombre, Handle RSI o @discord…"
              spellCheck={false}
              autoComplete="off"
            />
          </div>

          <div>
            <label
              htmlFor={selectId}
              style={{
                display: 'block',
                fontSize: '0.82rem',
                color: 'var(--secondary)',
                marginBottom: '0.35rem',
                fontWeight: 700,
              }}
            >
              {mode === 'pick-target'
                ? 'Expediente ORG destino (Asiento Pendiente)'
                : 'Cuenta de Discord entrante (Origen)'}
            </label>

            {selectableCandidates.length === 0 ? (
              <div
                style={{
                  padding: '0.9rem',
                  borderRadius: '4px',
                  border: '1px solid rgba(196, 30, 58, 0.35)',
                  background: 'rgba(196, 30, 58, 0.08)',
                  color: 'var(--accent-silver)',
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                }}
              >
                <ShieldAlert size={18} aria-hidden="true" style={{ color: 'var(--primary)', flexShrink: 0 }} />
                <span>
                  {mode === 'pick-target'
                    ? 'No hay expedientes ORG sin vincular elegibles bajo tu autoridad actual. Pre-registra primero al miembro o desvincula su asiento previo.'
                    : 'No hay cuentas Discord vinculadas elegibles para absorber en este expediente.'}
                </span>
              </div>
            ) : (
              <select
                id={selectId}
                className="select-filter"
                value={effectiveSelectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                required
              >
                {candidates.map((cand) => {
                  const isEligible =
                    mode === 'pick-target'
                      ? canBeMergeTarget(actor, cand)
                      : canBeMergeSource(actor, cand);
                  const candRank = getRankMeta(cand.rank_id ?? cand.rank_level);
                  let reason = '';
                  if (!isEligible) {
                    if (mode === 'pick-source') {
                      if (cand.id === actor.id) reason = ' — Tu sesión activa';
                      else if (cand.id === HERALDO_SUPREMO_ID) reason = ' — Heraldo Supremo protegido';
                      else if (!cand.is_discord_linked) reason = ' — Sin Discord vinculado';
                      else reason = ' — Protegido por jerarquía';
                    } else if (cand.is_discord_linked) {
                      reason = ' — Ya vinculado (desvincular primero)';
                    } else if (cand.id === actor.id) {
                      reason = ' — Tu sesión activa';
                    } else {
                      reason = ' — Protegido por jerarquía';
                    }
                  }
                  const discordTag = cand.discord_username
                    ? `@${cand.discord_username}`
                    : cand.expected_discord_username
                      ? `espera @${cand.expected_discord_username}`
                      : 'sin Discord';
                  return (
                    <option key={cand.id} value={cand.id} disabled={!isEligible}>
                      {cand.display_name} ({candRank.name} · {discordTag}){reason}
                    </option>
                  );
                })}
              </select>
            )}
          </div>

          {sourceUser && targetUser && (
            <div
              style={{
                padding: '0.75rem 0.9rem',
                borderRadius: '4px',
                border: '1px dashed rgba(16, 185, 129, 0.45)',
                background: 'rgba(16, 185, 129, 0.06)',
                fontSize: '0.86rem',
                color: 'var(--accent-silver)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
              }}
            >
              <Link2 size={16} aria-hidden="true" style={{ color: 'var(--status-ok)', flexShrink: 0 }} />
              <span>
                Resultado: la cuenta Discord{' '}
                <strong style={{ color: 'var(--text-main)' }}>
                  @{sourceUser.discord_username || sourceUser.display_name}
                </strong>{' '}
                quedará vinculada permanentemente al expediente{' '}
                <strong style={{ color: 'var(--secondary)' }}>
                  {targetUser.display_name}
                </strong>
                .
              </span>
            </div>
          )}

          <div className="seal-modal-actions" style={{ marginTop: '0.4rem' }}>
            <button
              ref={cancelBtnRef}
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting || !sourceUser || !targetUser}
            >
              {isSubmitting ? (
                <span className="seal-modal-loading">
                  <Loader2 size={14} className="spin" aria-hidden="true" />
                  Fusionando…
                </span>
              ) : (
                'Confirmar Vinculación'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MergeDiscordModal;

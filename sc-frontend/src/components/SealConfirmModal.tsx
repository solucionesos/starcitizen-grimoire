import React, { useEffect, useId, useRef } from 'react';
import { AlertTriangle, Loader2, ShieldAlert, X } from 'lucide-react';

export interface SealConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'gold';
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const SealConfirmModal: React.FC<SealConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'gold',
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  const titleId = useId();
  const descId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const cancelBtnRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCancelRef = useRef(onCancel);
  const isLoadingRef = useRef(isLoading);

  useEffect(() => {
    onCancelRef.current = onCancel;
    isLoadingRef.current = isLoading;
  }, [onCancel, isLoading]);

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const rafId = window.requestAnimationFrame(() => {
      cancelBtnRef.current?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (!isLoadingRef.current) {
          event.preventDefault();
          onCancelRef.current();
        }
        return;
      }

      if (event.key !== 'Tab') return;
      const dialog = dialogRef.current;
      if (!dialog) return;

      const focusables = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => el.getClientRects().length > 0 || el === document.activeElement,
      );

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

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(rafId);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const HeaderIcon = variant === 'danger' ? AlertTriangle : ShieldAlert;

  return (
    <div
      className="seal-modal-backdrop"
      onClick={() => {
        if (!isLoading) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className={`surface-monolith seal-modal-dialog seal-modal-dialog--${variant}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="seal-modal-close"
          onClick={onCancel}
          disabled={isLoading}
          aria-label="Cerrar diálogo"
        >
          <X size={18} aria-hidden="true" />
        </button>

        <div className="seal-modal-header">
          <HeaderIcon
            size={22}
            aria-hidden="true"
            className={variant === 'danger' ? 'seal-modal-icon--danger' : 'seal-modal-icon--gold'}
          />
          <h2 id={titleId} className="seal-modal-title">
            {title}
          </h2>
        </div>

        <p id={descId} className="seal-modal-body">
          {message}
        </p>

        <div className="seal-modal-actions">
          <button
            ref={cancelBtnRef}
            type="button"
            className="btn-secondary"
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn-primary ${variant === 'danger' ? 'seal-modal-confirm--danger' : 'seal-modal-confirm--gold'}`}
            onClick={() => {
              void onConfirm();
            }}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="seal-modal-loading">
                <Loader2 size={14} className="spin" aria-hidden="true" />
                Procesando…
              </span>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SealConfirmModal;

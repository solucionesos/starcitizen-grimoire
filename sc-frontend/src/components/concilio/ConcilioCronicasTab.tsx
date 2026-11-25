import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Eye,
  FilePlus2,
  LayoutGrid,
  Loader2,
  Pencil,
  Plus,
  Quote as QuoteIcon,
  ScrollText,
  ShieldAlert,
  Sparkles,
  Trash2,
  Type,
} from 'lucide-react';
import {
  createCouncilChronicle,
  deleteCouncilChronicle,
  getCouncilChronicles,
  updateCouncilChronicle,
} from '../../api/client';
import type {
  Chronicle,
  ChronicleBlock,
  ChronicleBlockType,
  ChronicleGridItem,
  SaveChroniclePayload,
} from '../../types';
import { useToast } from '../AbyssalToast';
import DragonIcon from '../DragonIcon';
import DualLabel from '../DualLabel';
import SealConfirmModal from '../SealConfirmModal';
import {
  CHRONICLE_CLASSIFICATIONS,
  CHRONICLE_COLORS,
  CHRONICLE_SIGILS,
  extractApiError,
  sanitizeChronicleHtml,
  validateChronicleClient,
} from './concilioHelpers';

interface DraftChronicle {
  id: number | null;
  title: string;
  subtitle: string;
  date: string;
  dateSort: number;
  classification: string;
  icon: string;
  color: string;
  blocks: ChronicleBlock[];
}

function createEmptyDraft(): DraftChronicle {
  return {
    id: null,
    title: '',
    subtitle: '',
    date: 'Ciclo 2956',
    dateSort: Date.now(),
    classification: 'Crónica de Guerra',
    icon: 'dragon',
    color: 'var(--secondary)',
    blocks: [
      {
        type: 'p',
        text: '',
        muted: false,
      },
    ],
  };
}

function draftFromChronicle(c: Chronicle): DraftChronicle {
  return {
    id: c.id,
    title: c.title,
    subtitle: c.subtitle,
    date: c.date,
    dateSort: c.dateSort,
    classification: c.classification,
    icon: c.icon || 'dragon',
    color: c.color || 'var(--secondary)',
    blocks: c.blocks.map((b) => ({
      ...b,
      items: b.items ? b.items.map((item) => ({ ...item })) : undefined,
    })),
  };
}

const BLOCK_TYPE_LABEL: Record<ChronicleBlockType, string> = {
  p: 'Párrafo Narrativo',
  quote: 'Cita Ritual',
  header: 'Encabezado de Sección',
  grid: 'Cuadrícula de Hitos',
};

export interface ConcilioCronicasTabProps {
  onDirtyChange?: (dirty: boolean) => void;
}

const ConcilioCronicasTab: React.FC<ConcilioCronicasTabProps> = ({
  onDirtyChange,
}) => {
  const { showToast } = useToast();
  const fieldPrefix = useId();

  const [chronicles, setChronicles] = useState<Chronicle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState<DraftChronicle>(() => createEmptyDraft());
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [showPreviewMobile, setShowPreviewMobile] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Chronicle | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [pendingSwitchAction, setPendingSwitchAction] = useState<(() => void) | null>(null);

  const onDirtyChangeRef = useRef(onDirtyChange);
  useEffect(() => {
    onDirtyChangeRef.current = onDirtyChange;
  }, [onDirtyChange]);

  useEffect(() => {
    return () => {
      onDirtyChangeRef.current?.(false);
    };
  }, []);

  const updateDirtyState = useCallback((nextDirty: boolean) => {
    setIsDirty(nextDirty);
    onDirtyChangeRef.current?.(nextDirty);
  }, []);

  const loadChronicles = useCallback(async (selectId?: number) => {
    try {
      const list = await getCouncilChronicles();
      const sorted = [...list].sort((a, b) => b.dateSort - a.dateSort);
      setChronicles(sorted);
      setError(null);
      if (typeof selectId === 'number') {
        const match = sorted.find((c) => c.id === selectId);
        if (match) {
          setDraft(draftFromChronicle(match));
          updateDirtyState(false);
        }
      }
    } catch (err: unknown) {
      setError(extractApiError(err, 'No se pudieron cargar las Crónicas del Lectitio Divinitatus.'));
    } finally {
      setLoading(false);
    }
  }, [updateDirtyState]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const list = await getCouncilChronicles();
        if (!active) return;
        const sorted = [...list].sort((a, b) => b.dateSort - a.dateSort);
        setChronicles(sorted);
        if (sorted.length > 0) {
          setDraft(draftFromChronicle(sorted[0]));
        }
        setError(null);
      } catch (err: unknown) {
        if (!active) return;
        setError(
          extractApiError(err, 'No se pudieron cargar las Crónicas del Lectitio Divinitatus.'),
        );
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const payloadForValidation: SaveChroniclePayload = useMemo(
    () => ({
      title: draft.title,
      subtitle: draft.subtitle,
      date: draft.date,
      dateSort: draft.dateSort,
      classification: draft.classification,
      icon: draft.icon,
      color: draft.color,
      blocks: draft.blocks,
    }),
    [draft],
  );

  const validation = useMemo(
    () => validateChronicleClient(payloadForValidation),
    [payloadForValidation],
  );

  const updateDraft = (updater: (prev: DraftChronicle) => DraftChronicle) => {
    setDraft((prev) => updater(prev));
    updateDirtyState(true);
    setServerError(null);
  };

  const requestSwitchDraft = (action: () => void) => {
    if (isDirty) {
      setPendingSwitchAction(() => action);
    } else {
      action();
    }
  };

  const addBlock = (type: ChronicleBlockType) => {
    const newBlock: ChronicleBlock =
      type === 'p'
        ? { type: 'p', text: '', muted: false }
        : type === 'quote'
          ? { type: 'quote', text: '' }
          : type === 'header'
            ? { type: 'header', icon: '⚔', title: '' }
            : {
                type: 'grid',
                items: [{ icon: '☩', title: '', text: '' }],
              };
    updateDraft((prev) => ({
      ...prev,
      blocks: [...prev.blocks, newBlock],
    }));
  };

  const moveBlock = (index: number, direction: -1 | 1) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= draft.blocks.length) return;
    updateDraft((prev) => {
      const next = [...prev.blocks];
      const [moved] = next.splice(index, 1);
      next.splice(targetIdx, 0, moved);
      return { ...prev, blocks: next };
    });
  };

  const removeBlock = (index: number) => {
    updateDraft((prev) => ({
      ...prev,
      blocks: prev.blocks.filter((_, idx) => idx !== index),
    }));
  };

  const updateBlockAt = (index: number, patch: Partial<ChronicleBlock>) => {
    updateDraft((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b, idx) => (idx === index ? { ...b, ...patch } : b)),
    }));
  };

  const addGridItem = (blockIdx: number) => {
    updateDraft((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b, idx) =>
        idx === blockIdx
          ? {
              ...b,
              items: [...(b.items ?? []), { icon: '◈', title: '', text: '' }],
            }
          : b,
      ),
    }));
  };

  const updateGridItem = (
    blockIdx: number,
    itemIdx: number,
    patch: Partial<ChronicleGridItem>,
  ) => {
    updateDraft((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b, idx) =>
        idx === blockIdx
          ? {
              ...b,
              items: (b.items ?? []).map((it, j) =>
                j === itemIdx ? { ...it, ...patch } : it,
              ),
            }
          : b,
      ),
    }));
  };

  const removeGridItem = (blockIdx: number, itemIdx: number) => {
    updateDraft((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b, idx) =>
        idx === blockIdx
          ? {
              ...b,
              items: (b.items ?? []).filter((_, j) => j !== itemIdx),
            }
          : b,
      ),
    }));
  };

  const insertSacredClosing = () => {
    updateDraft((prev) => ({
      ...prev,
      blocks: [
        ...prev.blocks,
        {
          type: 'quote',
          text: 'Que el Vacío guarde lo que fue aprendido.<br /><br /><span style="color: var(--text-main); font-size: 0.9rem;">☩ IN NOMINI OBLIVIONIS ☩</span>',
        },
      ],
    }));
  };

  const handleSaveChronicle = async (event: React.FormEvent) => {
    event.preventDefault();
    setServerError(null);

    if (!validation.valid) {
      setServerError(validation.errors[0]);
      showToast(validation.errors[0], 'error');
      return;
    }

    const payload: SaveChroniclePayload = {
      title: draft.title.trim(),
      subtitle: draft.subtitle.trim() || 'TESTIMONIO DEL VACÍO',
      date: draft.date.trim() || 'Ciclo 2956',
      dateSort: draft.dateSort,
      classification: draft.classification.trim() || 'Crónica Sagrada',
      icon: draft.icon || 'dragon',
      color: draft.color || 'var(--secondary)',
      blocks: draft.blocks,
    };

    setIsSaving(true);
    try {
      if (draft.id !== null) {
        const res = await updateCouncilChronicle(draft.id, payload);
        showToast(`Crónica "${res.chronicle.title}" actualizada en el Lectitio Divinitatus.`, 'success');
        await loadChronicles(res.chronicle.id);
      } else {
        const res = await createCouncilChronicle(payload);
        showToast(`Crónica "${res.chronicle.title}" grabada en el Lectitio Divinitatus.`, 'success');
        await loadChronicles(res.chronicle.id);
      }
      updateDirtyState(false);
    } catch (err: unknown) {
      const msg = extractApiError(err, 'No se pudo guardar la Crónica Sagrada.');
      setServerError(msg);
      showToast(msg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteCouncilChronicle(deleteTarget.id);
      showToast(`Crónica "${deleteTarget.title}" removida del Lectitio Divinitatus.`, 'info');
      const deletedId = deleteTarget.id;
      setDeleteTarget(null);
      if (draft.id === deletedId) {
        setDraft(createEmptyDraft());
        updateDirtyState(false);
      }
      await loadChronicles();
    } catch (err: unknown) {
      showToast(extractApiError(err, 'No se pudo eliminar la Crónica.'), 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading && chronicles.length === 0) {
    return (
      <div className="surface-monolith" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
        <Loader2
          size={32}
          className="spin"
          aria-hidden="true"
          style={{ color: 'var(--secondary)', marginBottom: '0.8rem' }}
        />
        <p style={{ color: 'var(--text-muted)', margin: 0 }}>
          Abriendo los pergaminos del Lectitio Divinitatus…
        </p>
      </div>
    );
  }

  if (error && chronicles.length === 0) {
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
            <strong style={{ color: 'var(--text-main)' }}>Fallo al cargar Crónicas</strong>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{error}</div>
          </div>
        </div>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            setLoading(true);
            void loadChronicles();
          }}
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Registry Bar + New Chronicle */}
      <section className="surface-monolith" style={{ padding: '1.25rem 1.5rem' }}>
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
          <h2 style={{ margin: 0 }}>
            <DualLabel
              sacred="ESCRIBA DEL DIVINITATUS"
              tactical={`Editor Visual de Crónicas Sagradas (${chronicles.length} en el Grimoire)`}
              size="md"
            />
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowPreviewMobile((v) => !v)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
            >
              {showPreviewMobile ? (
                <>
                  <Pencil size={14} aria-hidden="true" />
                  Mostrar Editor
                </>
              ) : (
                <>
                  <Eye size={14} aria-hidden="true" />
                  Solo Vista Previa
                </>
              )}
            </button>

            <button
              type="button"
              className="btn-primary"
              onClick={() =>
                requestSwitchDraft(() => {
                  setDraft(createEmptyDraft());
                  updateDirtyState(false);
                  setServerError(null);
                })
              }
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
            >
              <FilePlus2 size={15} aria-hidden="true" />
              Nueva Crónica
            </button>
          </div>
        </div>

        {/* Chronicle Selector Strip */}
        {chronicles.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>
            Aún no hay Crónicas escritas. Redacta la primera en el editor inferior.
          </p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
              gap: '0.65rem',
            }}
          >
            {chronicles.map((c) => {
              const selected = draft.id === c.id;
              return (
                <div
                  key={c.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                    padding: '0.55rem 0.7rem',
                    borderRadius: '4px',
                    border: `1px solid ${selected ? 'var(--secondary)' : 'rgba(255, 255, 255, 0.08)'}`,
                    borderLeft: `3px solid ${c.color || 'var(--secondary)'}`,
                    background: selected ? 'rgba(212, 175, 55, 0.08)' : 'rgba(10, 4, 5, 0.65)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      requestSwitchDraft(() => {
                        setDraft(draftFromChronicle(c));
                        updateDirtyState(false);
                        setServerError(null);
                      })
                    }
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      margin: 0,
                      textAlign: 'left',
                      cursor: 'pointer',
                      flex: 1,
                      minWidth: 0,
                      color: 'inherit',
                    }}
                  >
                    <div
                      style={{
                        fontFamily: 'var(--cinzel-font)',
                        fontSize: '0.78rem',
                        color: selected ? 'var(--secondary)' : 'var(--text-main)',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {c.title}
                    </div>
                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {c.date} · {c.classification}
                    </div>
                  </button>

                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setDeleteTarget(c)}
                    aria-label={`Eliminar Crónica ${c.title}`}
                    style={{
                      padding: '0.32rem 0.5rem',
                      borderColor: 'rgba(196, 30, 58, 0.45)',
                      color: '#fca5a5',
                      flexShrink: 0,
                    }}
                  >
                    <Trash2 size={13} aria-hidden="true" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Main Split Workspace: Editor + Live Preview */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
          gap: '1.25rem',
          alignItems: 'start',
        }}
      >
        {/* Editor Pane */}
        <section
          className="surface-monolith"
          style={{
            padding: '1.5rem',
            display: showPreviewMobile ? 'none' : 'block',
          }}
        >
          <form onSubmit={handleSaveChronicle} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
              <strong style={{ fontFamily: 'var(--cinzel-font)', color: 'var(--secondary)', letterSpacing: '1.5px' }}>
                {draft.id !== null ? `EDITANDO CRÓNICA #${draft.id}` : 'NUEVA CRÓNICA SAGRADA'}
              </strong>
              {isDirty && (
                <span style={{ fontSize: '0.78rem', color: 'var(--status-warn)' }}>
                  Cambios sin sellar
                </span>
              )}
            </div>

            {/* Codex Compliance Bar */}
            <div
              style={{
                padding: '0.8rem 0.95rem',
                borderRadius: '4px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(10, 4, 5, 0.8)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.84rem' }}>
                {validation.hasForbiddenYear ? (
                  <>
                    <AlertTriangle size={15} aria-hidden="true" style={{ color: 'var(--primary)', flexShrink: 0 }} />
                    <span style={{ color: '#fca5a5' }}>
                      Regla +930 infringida en: {validation.forbiddenFields.join(', ')} (elimina años 202x, usa Ciclo 2956).
                    </span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={15} aria-hidden="true" style={{ color: 'var(--status-ok)', flexShrink: 0 }} />
                    <span style={{ color: 'var(--status-ok)' }}>
                      Regla temporal +930 correcta (sin años del siglo XXI).
                    </span>
                  </>
                )}
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.6rem',
                  flexWrap: 'wrap',
                  fontSize: '0.84rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {validation.hasSacredClosing ? (
                    <>
                      <CheckCircle2 size={15} aria-hidden="true" style={{ color: 'var(--status-ok)', flexShrink: 0 }} />
                      <span style={{ color: 'var(--status-ok)' }}>
                        Cierre sagrado IN NOMINI OBLIVIONIS presente.
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={15} aria-hidden="true" style={{ color: 'var(--status-warn)', flexShrink: 0 }} />
                      <span style={{ color: 'var(--status-warn)' }}>
                        Falta el cierre obligatorio IN NOMINI OBLIVIONIS en los bloques visibles.
                      </span>
                    </>
                  )}
                </div>

                {!validation.hasSacredClosing && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={insertSacredClosing}
                    style={{
                      padding: '0.32rem 0.65rem',
                      fontSize: '0.72rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <Sparkles size={13} aria-hidden="true" />
                    Insertar Cierre Sagrado
                  </button>
                )}
              </div>
            </div>

            {serverError && (
              <div
                role="alert"
                style={{
                  padding: '0.8rem 1rem',
                  borderRadius: '4px',
                  border: '1px solid rgba(196, 30, 58, 0.55)',
                  background: 'rgba(196, 30, 58, 0.12)',
                  color: '#fca5a5',
                  fontSize: '0.88rem',
                }}
              >
                {serverError}
              </div>
            )}

            {/* Metadata Fields */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
                gap: '0.8rem',
              }}
            >
              <div>
                <label
                  htmlFor={`${fieldPrefix}-title`}
                  style={{ display: 'block', fontSize: '0.8rem', color: 'var(--secondary)', marginBottom: '0.25rem' }}
                >
                  Título de la Crónica
                </label>
                <input
                  id={`${fieldPrefix}-title`}
                  type="text"
                  className="search-input"
                  value={draft.title}
                  onChange={(e) => updateDraft((p) => ({ ...p, title: e.target.value }))}
                  placeholder="CRÓNICA XV…"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor={`${fieldPrefix}-subtitle`}
                  style={{ display: 'block', fontSize: '0.8rem', color: 'var(--accent-silver)', marginBottom: '0.25rem' }}
                >
                  Subtítulo
                </label>
                <input
                  id={`${fieldPrefix}-subtitle`}
                  type="text"
                  className="search-input"
                  value={draft.subtitle}
                  onChange={(e) => updateDraft((p) => ({ ...p, subtitle: e.target.value }))}
                  placeholder="EL DESPERTAR EN LAS CENIZAS…"
                />
              </div>

              <div>
                <label
                  htmlFor={`${fieldPrefix}-date`}
                  style={{ display: 'block', fontSize: '0.8rem', color: 'var(--accent-silver)', marginBottom: '0.25rem' }}
                >
                  Fecha In-Game (+930)
                </label>
                <input
                  id={`${fieldPrefix}-date`}
                  type="text"
                  className="search-input"
                  value={draft.date}
                  onChange={(e) => updateDraft((p) => ({ ...p, date: e.target.value }))}
                  placeholder="Ciclo 2956…"
                />
              </div>

              <div>
                <label
                  htmlFor={`${fieldPrefix}-class`}
                  style={{ display: 'block', fontSize: '0.8rem', color: 'var(--accent-silver)', marginBottom: '0.25rem' }}
                >
                  Clasificación
                </label>
                <select
                  id={`${fieldPrefix}-class`}
                  className="select-filter"
                  value={draft.classification}
                  onChange={(e) => updateDraft((p) => ({ ...p, classification: e.target.value }))}
                >
                  {CHRONICLE_CLASSIFICATIONS.map((cls) => (
                    <option key={cls} value={cls}>
                      {cls}
                    </option>
                  ))}
                  {!CHRONICLE_CLASSIFICATIONS.includes(draft.classification) &&
                    draft.classification && (
                      <option value={draft.classification}>{draft.classification}</option>
                    )}
                </select>
              </div>

              <div>
                <label
                  htmlFor={`${fieldPrefix}-icon`}
                  style={{ display: 'block', fontSize: '0.8rem', color: 'var(--accent-silver)', marginBottom: '0.25rem' }}
                >
                  Emblema / Sigilo
                </label>
                <select
                  id={`${fieldPrefix}-icon`}
                  className="select-filter"
                  value={draft.icon}
                  onChange={(e) => updateDraft((p) => ({ ...p, icon: e.target.value }))}
                >
                  {CHRONICLE_SIGILS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                  {!CHRONICLE_SIGILS.some((s) => s.value === draft.icon) && draft.icon && (
                    <option value={draft.icon}>{draft.icon}</option>
                  )}
                </select>
              </div>

              <div>
                <label
                  htmlFor={`${fieldPrefix}-color`}
                  style={{ display: 'block', fontSize: '0.8rem', color: 'var(--accent-silver)', marginBottom: '0.25rem' }}
                >
                  Color Litúrgico
                </label>
                <select
                  id={`${fieldPrefix}-color`}
                  className="select-filter"
                  value={draft.color}
                  onChange={(e) => updateDraft((p) => ({ ...p, color: e.target.value }))}
                >
                  {CHRONICLE_COLORS.map((col) => (
                    <option key={col.value} value={col.value}>
                      {col.label}
                    </option>
                  ))}
                  {!CHRONICLE_COLORS.some((col) => col.value === draft.color) && draft.color && (
                    <option value={draft.color}>{draft.color}</option>
                  )}
                </select>
              </div>
            </div>

            {/* Visual Block Builder */}
            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                  marginBottom: '0.85rem',
                  flexWrap: 'wrap',
                }}
              >
                <strong
                  className="tabular-nums"
                  style={{ fontFamily: 'var(--cinzel-font)', fontSize: '0.85rem', color: 'var(--text-main)' }}
                >
                  BLOQUES LITÚRGICOS ({draft.blocks.length})
                </strong>

                <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="filter-btn"
                    onClick={() => addBlock('p')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                  >
                    <Type size={12} aria-hidden="true" />
                    + Párrafo
                  </button>
                  <button
                    type="button"
                    className="filter-btn"
                    onClick={() => addBlock('quote')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                  >
                    <QuoteIcon size={12} aria-hidden="true" />
                    + Cita
                  </button>
                  <button
                    type="button"
                    className="filter-btn"
                    onClick={() => addBlock('header')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                  >
                    <ScrollText size={12} aria-hidden="true" />
                    + Encabezado
                  </button>
                  <button
                    type="button"
                    className="filter-btn"
                    onClick={() => addBlock('grid')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                  >
                    <LayoutGrid size={12} aria-hidden="true" />
                    + Cuadrícula
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {draft.blocks.map((block, bIdx) => {
                  const hasEmptyIssue = validation.emptyBlockIndices.includes(bIdx);
                  return (
                    <div
                      key={bIdx}
                      style={{
                        padding: '0.9rem',
                        borderRadius: '4px',
                        border: `1px solid ${hasEmptyIssue ? 'rgba(196, 30, 58, 0.55)' : 'rgba(212, 175, 55, 0.2)'}`,
                        background: 'rgba(10, 4, 5, 0.7)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.65rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                        <span
                          className="tabular-nums"
                          style={{
                            fontSize: '0.74rem',
                            fontFamily: 'var(--cinzel-font)',
                            color: 'var(--secondary)',
                            fontWeight: 700,
                          }}
                        >
                          #{bIdx + 1} · {BLOCK_TYPE_LABEL[block.type]}
                        </span>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <button
                            type="button"
                            className="btn-secondary"
                            disabled={bIdx === 0}
                            onClick={() => moveBlock(bIdx, -1)}
                            aria-label={`Subir bloque ${bIdx + 1}`}
                            style={{ padding: '0.28rem 0.45rem' }}
                          >
                            <ArrowUp size={13} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="btn-secondary"
                            disabled={bIdx === draft.blocks.length - 1}
                            onClick={() => moveBlock(bIdx, 1)}
                            aria-label={`Bajar bloque ${bIdx + 1}`}
                            style={{ padding: '0.28rem 0.45rem' }}
                          >
                            <ArrowDown size={13} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => removeBlock(bIdx)}
                            aria-label={`Eliminar bloque ${bIdx + 1}`}
                            style={{
                              padding: '0.28rem 0.45rem',
                              borderColor: 'rgba(196, 30, 58, 0.45)',
                              color: '#fca5a5',
                            }}
                          >
                            <Trash2 size={13} aria-hidden="true" />
                          </button>
                        </div>
                      </div>

                      {(block.type === 'p' || block.type === 'quote') && (
                        <>
                          <div>
                            <label
                              htmlFor={`${fieldPrefix}-btext-${bIdx}`}
                              className="sr-only"
                            >
                              Contenido del bloque {bIdx + 1}
                            </label>
                            <textarea
                              id={`${fieldPrefix}-btext-${bIdx}`}
                              className="search-input"
                              rows={block.type === 'quote' ? 3 : 4}
                              value={block.text ?? ''}
                              onChange={(e) => updateBlockAt(bIdx, { text: e.target.value })}
                              placeholder={
                                block.type === 'quote'
                                  ? 'Cita litúrgica o cierre IN NOMINI OBLIVIONIS…'
                                  : 'Texto del párrafo (admite <strong>, <em>, <br />)…'
                              }
                            />
                          </div>
                          {block.type === 'p' && (
                            <label
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.45rem',
                                fontSize: '0.82rem',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                width: 'max-content',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={Boolean(block.muted)}
                                onChange={(e) => updateBlockAt(bIdx, { muted: e.target.checked })}
                              />
                              Tono atenuado (muted)
                            </label>
                          )}
                        </>
                      )}

                      {block.type === 'header' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '0.6rem' }}>
                          <div>
                            <label
                              htmlFor={`${fieldPrefix}-bhicon-${bIdx}`}
                              style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}
                            >
                              Sigilo
                            </label>
                            <select
                              id={`${fieldPrefix}-bhicon-${bIdx}`}
                              className="select-filter"
                              value={block.icon ?? '⚔'}
                              onChange={(e) => updateBlockAt(bIdx, { icon: e.target.value })}
                            >
                              {CHRONICLE_SIGILS.filter((s) => s.value !== 'dragon').map((s) => (
                                <option key={s.value} value={s.value}>
                                  {s.label}
                                </option>
                              ))}
                              {block.icon &&
                                !CHRONICLE_SIGILS.some((s) => s.value === block.icon) && (
                                  <option value={block.icon}>{block.icon}</option>
                                )}
                            </select>
                          </div>
                          <div>
                            <label
                              htmlFor={`${fieldPrefix}-bhtitle-${bIdx}`}
                              style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}
                            >
                              Título de Sección
                            </label>
                            <input
                              id={`${fieldPrefix}-bhtitle-${bIdx}`}
                              type="text"
                              className="search-input"
                              value={block.title ?? ''}
                              onChange={(e) => updateBlockAt(bIdx, { title: e.target.value })}
                              placeholder="I. El Decreto del Concilio…"
                            />
                          </div>
                        </div>
                      )}

                      {block.type === 'grid' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                          {(block.items ?? []).map((item, itemIdx) => (
                            <div
                              key={itemIdx}
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 110px), 1fr))',
                                gap: '0.45rem',
                                alignItems: 'center',
                              }}
                            >
                              <label
                                htmlFor={`${fieldPrefix}-gicon-${bIdx}-${itemIdx}`}
                                className="sr-only"
                              >
                                Sigilo tarjeta {itemIdx + 1}
                              </label>
                              <input
                                id={`${fieldPrefix}-gicon-${bIdx}-${itemIdx}`}
                                type="text"
                                className="search-input"
                                value={item.icon}
                                onChange={(e) =>
                                  updateGridItem(bIdx, itemIdx, { icon: e.target.value })
                                }
                                placeholder="☩…"
                              />

                              <label
                                htmlFor={`${fieldPrefix}-gtitle-${bIdx}-${itemIdx}`}
                                className="sr-only"
                              >
                                Título tarjeta {itemIdx + 1}
                              </label>
                              <input
                                id={`${fieldPrefix}-gtitle-${bIdx}-${itemIdx}`}
                                type="text"
                                className="search-input"
                                value={item.title}
                                onChange={(e) =>
                                  updateGridItem(bIdx, itemIdx, { title: e.target.value })
                                }
                                placeholder="Título…"
                              />

                              <label
                                htmlFor={`${fieldPrefix}-gtext-${bIdx}-${itemIdx}`}
                                className="sr-only"
                              >
                                Texto tarjeta {itemIdx + 1}
                              </label>
                              <input
                                id={`${fieldPrefix}-gtext-${bIdx}-${itemIdx}`}
                                type="text"
                                className="search-input"
                                value={item.text}
                                onChange={(e) =>
                                  updateGridItem(bIdx, itemIdx, { text: e.target.value })
                                }
                                placeholder="Descripción…"
                              />

                              <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => removeGridItem(bIdx, itemIdx)}
                                aria-label={`Eliminar tarjeta ${itemIdx + 1} de cuadrícula ${bIdx + 1}`}
                                style={{ padding: '0.45rem 0.55rem', color: '#fca5a5' }}
                              >
                                <Trash2 size={13} aria-hidden="true" />
                              </button>
                            </div>
                          ))}

                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => addGridItem(bIdx)}
                            style={{
                              width: 'max-content',
                              padding: '0.35rem 0.7rem',
                              fontSize: '0.75rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                            }}
                          >
                            <Plus size={13} aria-hidden="true" />
                            Añadir Tarjeta a Cuadrícula
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.7rem', flexWrap: 'wrap' }}>
              <button type="submit" className="btn-primary" disabled={isSaving}>
                {isSaving ? (
                  <span className="seal-modal-loading">
                    <Loader2 size={14} className="spin" aria-hidden="true" />
                    Sellando Crónica…
                  </span>
                ) : draft.id !== null ? (
                  'Guardar Cambios de Crónica'
                ) : (
                  'Grabar Crónica en el Grimoire'
                )}
              </button>
            </div>
          </form>
        </section>

        {/* Live Formatted Preview */}
        <section
          className="surface-monolith"
          style={{
            padding: '1.75rem',
            borderLeft: `4px solid ${draft.color || 'var(--secondary)'}`,
          }}
        >
          <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <DualLabel
              sacred="VISTA PREVIA LITÚRGICA"
              tactical="Renderizado equivalente en /divinitatus (72ch)"
              size="sm"
            />
          </div>

          <div
            className="prose-grimoire"
            style={{
              background: '#0a0505',
              padding: '1.75rem',
              borderRadius: '4px',
              border: '1px solid rgba(212, 175, 55, 0.14)',
              margin: '0 auto',
            }}
          >
            <div
              style={{
                textAlign: 'center',
                marginBottom: '2rem',
                paddingBottom: '1.25rem',
                borderBottom: '1px solid rgba(212, 175, 55, 0.12)',
              }}
            >
              <div style={{ marginBottom: '0.75rem' }}>
                {draft.icon === 'dragon' ? (
                  <DragonIcon size={40} />
                ) : (
                  <span style={{ fontSize: '2rem', color: draft.color || 'var(--secondary)' }}>
                    {draft.icon}
                  </span>
                )}
              </div>
              <h3
                style={{
                  fontFamily: 'var(--cinzel-font)',
                  fontSize: '1.05rem',
                  color: draft.color || 'var(--secondary)',
                  letterSpacing: '4px',
                  margin: '0 0 0.4rem',
                }}
              >
                {draft.title || 'TÍTULO DE LA CRÓNICA'}
              </h3>
              <p
                style={{
                  fontFamily: 'var(--cinzel-font)',
                  fontSize: '1.25rem',
                  color: 'var(--text-main)',
                  letterSpacing: '2px',
                  margin: '0 0 0.6rem',
                  fontWeight: 700,
                }}
              >
                {draft.subtitle || 'SUBTÍTULO DE LA CRÓNICA'}
              </p>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', fontFamily: 'var(--cinzel-font)' }}>
                {draft.date || 'Ciclo 2956'} · {draft.classification}
              </div>
            </div>

            {draft.blocks.map((block, idx) => {
              if (block.type === 'p') {
                return (
                  <p
                    key={idx}
                    style={{
                      color: block.muted ? 'var(--text-muted)' : 'var(--text-main)',
                      fontSize: '0.98rem',
                      lineHeight: 1.85,
                      margin: '0.75rem 0',
                    }}
                    dangerouslySetInnerHTML={{
                      __html: sanitizeChronicleHtml(block.text || '…'),
                    }}
                  />
                );
              }
              if (block.type === 'quote') {
                return (
                  <div
                    key={idx}
                    style={{
                      margin: '1.3rem 0',
                      padding: '1rem 1.4rem',
                      background: 'rgba(196, 30, 58, 0.06)',
                      border: '1px solid rgba(212, 175, 55, 0.25)',
                      borderLeft: '3px solid var(--secondary)',
                      borderRadius: '2px',
                      fontFamily: 'var(--cinzel-font)',
                      fontSize: '0.92rem',
                      fontStyle: 'italic',
                      color: 'var(--secondary)',
                      lineHeight: 1.8,
                      textAlign: 'center',
                    }}
                    dangerouslySetInnerHTML={{
                      __html: sanitizeChronicleHtml(block.text || '…'),
                    }}
                  />
                );
              }
              if (block.type === 'header') {
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      margin: '1.6rem 0 0.85rem',
                      paddingBottom: '0.4rem',
                      borderBottom: '1px solid rgba(212, 175, 55, 0.18)',
                    }}
                  >
                    <span>{block.icon || '⚔'}</span>
                    <h4
                      style={{
                        margin: 0,
                        fontFamily: 'var(--cinzel-font)',
                        fontSize: '0.82rem',
                        letterSpacing: '2.5px',
                        color: 'var(--secondary)',
                      }}
                    >
                      {block.title || 'Encabezado de Sección'}
                    </h4>
                  </div>
                );
              }
              if (block.type === 'grid') {
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                      gap: '0.8rem',
                      margin: '1.2rem 0',
                    }}
                  >
                    {(block.items ?? []).map((item, i) => (
                      <div
                        key={i}
                        style={{
                          padding: '0.9rem',
                          borderRadius: '4px',
                          border: '1px solid rgba(212, 175, 55, 0.2)',
                          borderTop: '2px solid rgba(212, 175, 55, 0.45)',
                          background: 'rgba(20, 10, 10, 0.7)',
                          textAlign: 'center',
                        }}
                      >
                        <div style={{ fontSize: '1.4rem', marginBottom: '0.4rem' }}>
                          {item.icon || '☩'}
                        </div>
                        <div
                          style={{
                            color: 'var(--secondary)',
                            fontFamily: 'var(--cinzel-font)',
                            fontSize: '0.75rem',
                            letterSpacing: '1.5px',
                            marginBottom: '0.4rem',
                          }}
                        >
                          {item.title || 'Hito'}
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                          {item.text || '…'}
                        </p>
                      </div>
                    ))}
                  </div>
                );
              }
              return null;
            })}
          </div>
        </section>
      </div>

      <SealConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Remover Crónica Sagrada"
        message={`¿Confirmas eliminar "${deleteTarget?.title ?? ''}" del Lectitio Divinitatus? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar Crónica"
        variant="danger"
        isLoading={isDeleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />

      <SealConfirmModal
        isOpen={Boolean(pendingSwitchAction)}
        title="Descartar Cambios Sin Sellar"
        message="Tienes cambios sin guardar en la Crónica actual. ¿Deseas descartarlos y continuar?"
        confirmLabel="Descartar Cambios"
        variant="gold"
        onCancel={() => setPendingSwitchAction(null)}
        onConfirm={() => {
          const fn = pendingSwitchAction;
          setPendingSwitchAction(null);
          if (fn) fn();
        }}
      />
    </div>
  );
};

export default ConcilioCronicasTab;

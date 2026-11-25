import React, { useCallback, useEffect, useId, useState } from 'react';
import {
  Award,
  CheckCircle2,
  Edit3,
  Gavel,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Star,
  Swords,
  Target,
  Trash2,
  Vote,
} from 'lucide-react';
import {
  closePoll,
  deleteCouncilVerdict,
  deleteCrusade,
  deleteObjective,
  deletePoll,
  getCouncilVerdicts,
  getCrusades,
  getObjectives,
  getPolls,
  updateCouncilVerdict,
  updateCrusade,
  updateObjective,
  verifyObjective,
} from '../../api/client';
import type {
  Crusade,
  CrusadeStatus,
  Objective,
  ObjectiveStatus,
  Poll,
  Verdict,
} from '../../types';
import { TACTICAL_TOOLTIPS } from '../../constants/terminology';
import { useToast } from '../AbyssalToast';
import DualLabel, { TacticalTooltip } from '../DualLabel';
import SealConfirmModal from '../SealConfirmModal';
import {
  CRUSADE_STATUS_META,
  CRUSADE_TRANSITIONS,
  OBJECTIVE_STATUS_META,
  OBJECTIVE_STATUS_OPTIONS,
  extractApiError,
  formatSqliteAbyssalTimestamp,
} from './concilioHelpers';

type OperativoSubTab = 'verdicts' | 'crusades' | 'objectives' | 'polls';

type PendingConfirm =
  | { kind: 'delete-verdict'; item: Verdict }
  | { kind: 'delete-crusade'; item: Crusade }
  | { kind: 'delete-objective'; item: Objective }
  | { kind: 'close-poll'; item: Poll }
  | { kind: 'delete-poll'; item: Poll };

const ConcilioOperativoTab: React.FC = () => {
  const { showToast } = useToast();
  const fieldPrefix = useId();

  const [subTab, setSubTab] = useState<OperativoSubTab>('verdicts');
  const [verdicts, setVerdicts] = useState<Verdict[]>([]);
  const [crusades, setCrusades] = useState<Crusade[]>([]);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Verdict inline edit
  const [editingVerdictId, setEditingVerdictId] = useState<string | null>(null);
  const [verdictTitle, setVerdictTitle] = useState<string>('');
  const [verdictSummary, setVerdictSummary] = useState<string>('');
  const [verdictAction, setVerdictAction] = useState<string>('');

  // Confirm modal
  const [confirmState, setConfirmState] = useState<PendingConfirm | null>(null);
  const [isConfirming, setIsConfirming] = useState<boolean>(false);

  const loadAll = useCallback(async () => {
    try {
      const [v, c, o, p] = await Promise.all([
        getCouncilVerdicts(),
        getCrusades(),
        getObjectives(),
        getPolls(),
      ]);
      setVerdicts(v);
      setCrusades(c);
      setObjectives(o);
      setPolls(p);
      setError(null);
    } catch (err: unknown) {
      setError(extractApiError(err, 'No se pudo cargar el Mando Operativo.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [v, c, o, p] = await Promise.all([
          getCouncilVerdicts(),
          getCrusades(),
          getObjectives(),
          getPolls(),
        ]);
        if (!active) return;
        setVerdicts(v);
        setCrusades(c);
        setObjectives(o);
        setPolls(p);
        setError(null);
      } catch (err: unknown) {
        if (!active) return;
        setError(extractApiError(err, 'No se pudo cargar el Mando Operativo.'));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleToggleFeatured = async (verdict: Verdict) => {
    const nextFeatured = !verdict.featured_in_home;
    setBusyId(verdict.id);
    try {
      await updateCouncilVerdict(verdict.id, { featured_in_home: nextFeatured });
      showToast(
        nextFeatured
          ? 'Veredicto fijado en la Portada del Umbral.'
          : 'Veredicto retirado de la Portada.',
        'success',
      );
      await loadAll();
    } catch (err: unknown) {
      showToast(extractApiError(err, 'No se pudo actualizar el Veredicto.'), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleSaveVerdictEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingVerdictId) return;
    if (!verdictTitle.trim()) {
      showToast('El título del Veredicto no puede quedar vacío.', 'error');
      return;
    }
    setBusyId(editingVerdictId);
    try {
      await updateCouncilVerdict(editingVerdictId, {
        title: verdictTitle.trim(),
        summary: verdictSummary.trim(),
        action_taken: verdictAction.trim(),
      });
      showToast('Veredicto actualizado en los registros.', 'success');
      setEditingVerdictId(null);
      await loadAll();
    } catch (err: unknown) {
      showToast(extractApiError(err, 'No se pudo editar el Veredicto.'), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleCrusadeStatusChange = async (
    crusade: Crusade,
    nextStatus: CrusadeStatus,
  ) => {
    if (nextStatus === crusade.status) return;
    setBusyId(crusade.id);
    try {
      await updateCrusade(crusade.id, { status: nextStatus });
      showToast(
        `Cruzada "${crusade.title}" actualizada a ${CRUSADE_STATUS_META[nextStatus]?.label ?? nextStatus}.`,
        'success',
      );
      await loadAll();
    } catch (err: unknown) {
      showToast(extractApiError(err, 'Transición de Cruzada rechazada.'), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleObjectiveStatusChange = async (
    objective: Objective,
    nextStatus: ObjectiveStatus,
  ) => {
    if (nextStatus === objective.status) return;
    setBusyId(objective.id);
    try {
      await updateObjective(objective.id, {
        status: nextStatus,
        progress:
          nextStatus === 'marca_del_abismo' || nextStatus === 'cumplido'
            ? 100
            : objective.progress,
      });
      showToast(`Designio "${objective.title}" actualizado.`, 'success');
      await loadAll();
    } catch (err: unknown) {
      showToast(extractApiError(err, 'No se pudo actualizar el Designio.'), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleObjectiveProgressChange = async (
    objective: Objective,
    nextProgress: number,
  ) => {
    if (nextProgress === objective.progress) return;
    setBusyId(objective.id);
    try {
      await updateObjective(objective.id, { progress: nextProgress });
      showToast(`Progreso de "${objective.title}" actualizado a ${nextProgress}%.`, 'success');
      await loadAll();
    } catch (err: unknown) {
      showToast(extractApiError(err, 'No se pudo actualizar el progreso.'), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleVerifyObjective = async (objective: Objective) => {
    setBusyId(objective.id);
    try {
      await verifyObjective(objective.id);
      showToast(
        `Designio "${objective.title}" sellado con la Marca del Abismo.`,
        'success',
      );
      await loadAll();
    } catch (err: unknown) {
      showToast(extractApiError(err, 'No se pudo verificar el Designio.'), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmState) return;
    setIsConfirming(true);
    try {
      switch (confirmState.kind) {
        case 'delete-verdict':
          await deleteCouncilVerdict(confirmState.item.id);
          showToast('Veredicto retirado de los registros.', 'info');
          break;
        case 'delete-crusade':
          await deleteCrusade(confirmState.item.id);
          showToast('Edicto de Cruzada eliminado.', 'info');
          break;
        case 'delete-objective':
          await deleteObjective(confirmState.item.id);
          showToast('Designio eliminado.', 'info');
          break;
        case 'close-poll': {
          const res = await closePoll(confirmState.item.id);
          showToast(
            res.message ?? 'Deliberación sellada y Veredicto dictado.',
            'success',
          );
          break;
        }
        case 'delete-poll':
          await deletePoll(confirmState.item.id);
          showToast('Deliberación del Cónclave eliminada.', 'info');
          break;
      }
      setConfirmState(null);
      await loadAll();
    } catch (err: unknown) {
      showToast(extractApiError(err, 'No se pudo ejecutar la orden.'), 'error');
    } finally {
      setIsConfirming(false);
    }
  };

  if (loading) {
    return (
      <div className="surface-monolith" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
        <Loader2
          size={32}
          className="spin"
          aria-hidden="true"
          style={{ color: 'var(--secondary)', marginBottom: '0.8rem' }}
        />
        <p style={{ color: 'var(--text-muted)', margin: 0 }}>
          Sincronizando mesa de mando operativa…
        </p>
      </div>
    );
  }

  if (error) {
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
            <strong style={{ color: 'var(--text-main)' }}>Fallo al cargar Mando Operativo</strong>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{error}</div>
          </div>
        </div>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            setLoading(true);
            void loadAll();
          }}
        >
          Reintentar
        </button>
      </div>
    );
  }

  const subTabs: Array<{
    id: OperativoSubTab;
    label: string;
    count: number;
    icon: React.ReactNode;
  }> = [
    {
      id: 'verdicts',
      label: 'Veredictos',
      count: verdicts.length,
      icon: <Gavel size={15} aria-hidden="true" />,
    },
    {
      id: 'crusades',
      label: 'Edictos de Cruzada',
      count: crusades.length,
      icon: <Swords size={15} aria-hidden="true" />,
    },
    {
      id: 'objectives',
      label: 'Designios',
      count: objectives.length,
      icon: <Target size={15} aria-hidden="true" />,
    },
    {
      id: 'polls',
      label: 'Cónclaves',
      count: polls.length,
      icon: <Vote size={15} aria-hidden="true" />,
    },
  ];

  const getConfirmCopy = (state: PendingConfirm | null) => {
    if (!state) return { title: '', message: '', label: '', variant: 'danger' as const };
    switch (state.kind) {
      case 'delete-verdict':
        return {
          title: 'Eliminar Veredicto',
          message: `¿Confirmas eliminar el Veredicto "${state.item.title}"? Desaparecerá del Cónclave y de la Portada.`,
          label: 'Eliminar Veredicto',
          variant: 'danger' as const,
        };
      case 'delete-crusade':
        return {
          title: 'Eliminar Edicto de Cruzada',
          message: `¿Confirmas eliminar la Cruzada "${state.item.title}" y todas sus inscripciones de flota?`,
          label: 'Eliminar Cruzada',
          variant: 'danger' as const,
        };
      case 'delete-objective':
        return {
          title: 'Eliminar Designio',
          message: `¿Confirmas eliminar el Designio "${state.item.title}"?`,
          label: 'Eliminar Designio',
          variant: 'danger' as const,
        };
      case 'close-poll':
        return {
          title: 'Sellar Deliberación y Dictar Veredicto',
          message: `¿Confirmas cerrar la votación "${state.item.title}"? Se calculará el resultado ganador, se emitirá un Veredicto oficial y se ejecutará su acción vinculante.`,
          label: 'Sellar Cónclave',
          variant: 'gold' as const,
        };
      case 'delete-poll':
        return {
          title: 'Eliminar Deliberación del Cónclave',
          message: `¿Confirmas eliminar la votación "${state.item.title}" junto con sus votos y veredictos vinculados?`,
          label: 'Eliminar Votación',
          variant: 'danger' as const,
        };
    }
  };

  const confirmCopy = getConfirmCopy(confirmState);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Sub-navigation */}
      <div
        className="surface-monolith"
        style={{
          padding: '1rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.85rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
          {subTabs.map((t) => {
            const active = subTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                className={`filter-btn ${active ? 'active' : ''}`}
                onClick={() => setSubTab(t.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.55rem 0.9rem',
                  fontSize: '0.78rem',
                }}
              >
                {t.icon}
                <span>{t.label}</span>
                <span className="tabular-nums" style={{ opacity: 0.85 }}>
                  ({t.count})
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className="btn-secondary"
          onClick={() => void loadAll()}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.45rem 0.85rem' }}
        >
          <RefreshCw size={14} aria-hidden="true" />
          Recargar
        </button>
      </div>

      {/* 1. Verdicts */}
      {subTab === 'verdicts' && (
        <section className="surface-monolith" style={{ padding: '1.5rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <h2 style={{ margin: 0 }}>
              <DualLabel
                sacred="VEREDICTOS DEL CÓNCLAVE"
                tactical="Control de Portada (Destacados), Edición de Texto y Retiro"
                size="md"
              />
            </h2>
          </div>

          {verdicts.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>
              No existen Veredictos dictados todavía. Sella una deliberación abierta en Cónclaves para generar uno.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {verdicts.map((v) => {
                const isFeatured = Boolean(v.featured_in_home);
                const isEditing = editingVerdictId === v.id;
                const isBusy = busyId === v.id;
                return (
                  <article
                    key={v.id}
                    style={{
                      padding: '1rem 1.1rem',
                      borderRadius: '4px',
                      border: `1px solid ${isFeatured ? 'rgba(212, 175, 55, 0.45)' : 'rgba(255, 255, 255, 0.08)'}`,
                      background: isFeatured ? 'rgba(212, 175, 55, 0.05)' : 'rgba(10, 4, 5, 0.72)',
                    }}
                  >
                    {isEditing ? (
                      <form
                        onSubmit={handleSaveVerdictEdit}
                        style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
                      >
                        <div>
                          <label
                            htmlFor={`${fieldPrefix}-vt-${v.id}`}
                            style={{ display: 'block', fontSize: '0.78rem', color: 'var(--secondary)', marginBottom: '0.25rem' }}
                          >
                            Título del Veredicto
                          </label>
                          <input
                            id={`${fieldPrefix}-vt-${v.id}`}
                            type="text"
                            className="search-input"
                            value={verdictTitle}
                            onChange={(e) => setVerdictTitle(e.target.value)}
                            required
                          />
                        </div>
                        <div>
                          <label
                            htmlFor={`${fieldPrefix}-vs-${v.id}`}
                            style={{ display: 'block', fontSize: '0.78rem', color: 'var(--accent-silver)', marginBottom: '0.25rem' }}
                          >
                            Resumen del Fallo
                          </label>
                          <textarea
                            id={`${fieldPrefix}-vs-${v.id}`}
                            className="search-input"
                            rows={2}
                            value={verdictSummary}
                            onChange={(e) => setVerdictSummary(e.target.value)}
                          />
                        </div>
                        <div>
                          <label
                            htmlFor={`${fieldPrefix}-va-${v.id}`}
                            style={{ display: 'block', fontSize: '0.78rem', color: 'var(--accent-silver)', marginBottom: '0.25rem' }}
                          >
                            Acción Ejecutada
                          </label>
                          <input
                            id={`${fieldPrefix}-va-${v.id}`}
                            type="text"
                            className="search-input"
                            value={verdictAction}
                            onChange={(e) => setVerdictAction(e.target.value)}
                          />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => setEditingVerdictId(null)}
                            disabled={isBusy}
                          >
                            Cancelar
                          </button>
                          <button type="submit" className="btn-primary" disabled={isBusy}>
                            {isBusy ? 'Guardando…' : 'Guardar Veredicto'}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          gap: '1rem',
                          flexWrap: 'wrap',
                        }}
                      >
                        <div style={{ minWidth: 0, flex: '1 1 320px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
                            <strong style={{ color: 'var(--secondary)', fontFamily: 'var(--cinzel-font)' }}>
                              {v.title}
                            </strong>
                            <span
                              style={{
                                fontSize: '0.72rem',
                                padding: '0.12rem 0.5rem',
                                borderRadius: '3px',
                                border: '1px solid rgba(168, 85, 247, 0.4)',
                                color: 'var(--accent-conclave)',
                              }}
                            >
                              {v.poll_type}
                            </span>
                            {isFeatured && (
                              <span
                                style={{
                                  fontSize: '0.72rem',
                                  padding: '0.12rem 0.5rem',
                                  borderRadius: '3px',
                                  border: '1px solid rgba(212, 175, 55, 0.5)',
                                  color: 'var(--secondary)',
                                  fontWeight: 700,
                                }}
                              >
                                Destacado en Portada
                              </span>
                            )}
                          </div>
                          <div style={{ color: 'var(--text-main)', fontSize: '0.92rem', marginBottom: '0.25rem' }}>
                            Resolución ganadora: <strong>{v.winner_label}</strong>
                          </div>
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: '0 0 0.3rem' }}>
                            {v.summary}
                          </p>
                          <div className="tabular-nums" style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                            Sellado: {formatSqliteAbyssalTimestamp(v.closed_at)}
                            {typeof v.total_votes === 'number' ? ` · ${v.total_votes} votos` : ''}
                            {v.action_taken ? ` · ${v.action_taken}` : ''}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className={isFeatured ? 'btn-primary' : 'btn-secondary'}
                            disabled={isBusy}
                            onClick={() => void handleToggleFeatured(v)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.85rem' }}
                          >
                            <Star size={14} aria-hidden="true" />
                            {isFeatured ? 'En Portada' : 'Fijar en Portada'}
                          </button>

                          <button
                            type="button"
                            className="btn-secondary"
                            disabled={isBusy}
                            onClick={() => {
                              setEditingVerdictId(v.id);
                              setVerdictTitle(v.title);
                              setVerdictSummary(v.summary);
                              setVerdictAction(v.action_taken ?? '');
                            }}
                            aria-label={`Editar Veredicto ${v.title}`}
                            style={{ padding: '0.45rem 0.7rem' }}
                          >
                            <Edit3 size={14} aria-hidden="true" />
                          </button>

                          <button
                            type="button"
                            className="btn-secondary"
                            disabled={isBusy}
                            onClick={() => setConfirmState({ kind: 'delete-verdict', item: v })}
                            aria-label={`Eliminar Veredicto ${v.title}`}
                            style={{
                              padding: '0.45rem 0.7rem',
                              borderColor: 'rgba(196, 30, 58, 0.45)',
                              color: '#fca5a5',
                            }}
                          >
                            <Trash2 size={14} aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* 2. Crusades */}
      {subTab === 'crusades' && (
        <section className="surface-monolith" style={{ padding: '1.5rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <h2 style={{ margin: 0 }}>
              <DualLabel
                sacred="EDICTOS DE CRUZADA"
                tactical="Transiciones de Estado Válidas y Moderación de Operaciones"
                size="md"
              />
            </h2>
          </div>

          {crusades.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>
              No hay Edictos de Cruzada registrados en el Calendario Abisal.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {crusades.map((c) => {
                const allowedNext = CRUSADE_TRANSITIONS[c.status] ?? [c.status];
                const meta = CRUSADE_STATUS_META[c.status] ?? {
                  label: c.status,
                  color: 'var(--text-muted)',
                };
                const isBusy = busyId === c.id;
                const selectId = `${fieldPrefix}-crusade-${c.id}`;

                return (
                  <article
                    key={c.id}
                    style={{
                      padding: '1rem 1.1rem',
                      borderRadius: '4px',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderLeft: `4px solid ${meta.color}`,
                      background: 'rgba(10, 4, 5, 0.72)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '1rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ minWidth: 0, flex: '1 1 300px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                        <strong style={{ color: 'var(--text-main)', fontFamily: 'var(--cinzel-font)' }}>
                          {c.title}
                        </strong>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            padding: '0.12rem 0.5rem',
                            borderRadius: '3px',
                            border: `1px solid ${meta.color}`,
                            color: meta.color,
                            fontWeight: 700,
                          }}
                        >
                          {meta.label}
                        </span>
                      </div>
                      <div className="tabular-nums" style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>
                        {formatSqliteAbyssalTimestamp(c.operation_date)} ·{' '}
                        {c.location} · Cupo: {c.signups_count}/{c.max_brothers}
                        {c.creator_name ? ` · Emisor: ${c.creator_name}` : ''}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                      <label htmlFor={selectId} className="sr-only">
                        Estado de Cruzada {c.title}
                      </label>
                      <select
                        id={selectId}
                        className="select-filter"
                        style={{ width: 'auto', minWidth: '175px', padding: '0.45rem 0.75rem' }}
                        value={c.status}
                        disabled={isBusy}
                        onChange={(e) =>
                          void handleCrusadeStatusChange(c, e.target.value as CrusadeStatus)
                        }
                      >
                        {allowedNext.map((st) => (
                          <option key={st} value={st}>
                            {CRUSADE_STATUS_META[st]?.label ?? st}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        className="btn-secondary"
                        disabled={isBusy}
                        onClick={() => setConfirmState({ kind: 'delete-crusade', item: c })}
                        aria-label={`Eliminar Cruzada ${c.title}`}
                        style={{
                          padding: '0.48rem 0.75rem',
                          borderColor: 'rgba(196, 30, 58, 0.45)',
                          color: '#fca5a5',
                        }}
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* 3. Objectives */}
      {subTab === 'objectives' && (
        <section className="surface-monolith" style={{ padding: '1.5rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <h2 style={{ margin: 0 }}>
              <DualLabel
                sacred="DESIGNIOS DE LA FLOTA"
                tactical="Verificación con Marca del Abismo, Estado y Moderación"
                size="md"
              />
            </h2>
          </div>

          {objectives.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>
              No hay Designios activos o históricos en el registro.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {objectives.map((o) => {
                const meta = OBJECTIVE_STATUS_META[o.status] ?? {
                  label: o.status,
                  color: 'var(--text-muted)',
                };
                const isVerified = o.status === 'marca_del_abismo';
                const isBusy = busyId === o.id;
                const selectId = `${fieldPrefix}-obj-${o.id}`;
                const progressSelectId = `${fieldPrefix}-obj-prog-${o.id}`;
                const progressSteps = [0, 25, 50, 75, 100];
                if (!progressSteps.includes(o.progress)) {
                  progressSteps.push(o.progress);
                  progressSteps.sort((a, b) => a - b);
                }

                return (
                  <article
                    key={o.id}
                    style={{
                      padding: '1rem 1.1rem',
                      borderRadius: '4px',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderLeft: `4px solid ${meta.color}`,
                      background: 'rgba(10, 4, 5, 0.72)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '1rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ minWidth: 0, flex: '1 1 300px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                        <strong style={{ color: 'var(--text-main)', fontFamily: 'var(--cinzel-font)' }}>
                          {o.title}
                        </strong>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            padding: '0.12rem 0.5rem',
                            borderRadius: '3px',
                            border: `1px solid ${meta.color}`,
                            color: meta.color,
                            fontWeight: 700,
                          }}
                        >
                          {meta.label}
                        </span>
                        <span
                          className="tabular-nums"
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--secondary)',
                            fontWeight: 700,
                          }}
                        >
                          {o.progress}%
                        </span>
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>
                        Alcance: {o.scope} · Categoría: {o.category}
                        {o.assignee_name ? ` · Asignado a: ${o.assignee_name}` : ''}
                        {o.due_date
                          ? ` · Plazo: ${formatSqliteAbyssalTimestamp(o.due_date, { includeTime: false })}`
                          : ''}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
                      <label htmlFor={progressSelectId} className="sr-only">
                        Progreso de Designio {o.title}
                      </label>
                      <select
                        id={progressSelectId}
                        className="select-filter tabular-nums"
                        style={{ width: 'auto', minWidth: '92px', padding: '0.45rem 0.6rem' }}
                        value={o.progress}
                        disabled={isBusy}
                        onChange={(e) =>
                          void handleObjectiveProgressChange(o, Number(e.target.value))
                        }
                      >
                        {progressSteps.map((pct) => (
                          <option key={pct} value={pct}>
                            {pct}%
                          </option>
                        ))}
                      </select>

                      <label htmlFor={selectId} className="sr-only">
                        Estado de Designio {o.title}
                      </label>
                      <select
                        id={selectId}
                        className="select-filter"
                        style={{ width: 'auto', minWidth: '165px', padding: '0.45rem 0.75rem' }}
                        value={o.status}
                        disabled={isBusy}
                        onChange={(e) =>
                          void handleObjectiveStatusChange(o, e.target.value as ObjectiveStatus)
                        }
                      >
                        {OBJECTIVE_STATUS_OPTIONS.map((st) => (
                          <option key={st} value={st}>
                            {OBJECTIVE_STATUS_META[st].label}
                          </option>
                        ))}
                      </select>

                      <TacticalTooltip text={TACTICAL_TOOLTIPS.marca_del_abismo.explanation} focusable={false}>
                        <button
                          type="button"
                          className="btn-primary"
                          disabled={isBusy || isVerified}
                          onClick={() => void handleVerifyObjective(o)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.48rem 0.85rem',
                          }}
                        >
                          <Award size={14} aria-hidden="true" />
                          {isVerified ? 'Verificado' : 'Otorgar Marca'}
                        </button>
                      </TacticalTooltip>

                      <button
                        type="button"
                        className="btn-secondary"
                        disabled={isBusy}
                        onClick={() => setConfirmState({ kind: 'delete-objective', item: o })}
                        aria-label={`Eliminar Designio ${o.title}`}
                        style={{
                          padding: '0.48rem 0.75rem',
                          borderColor: 'rgba(196, 30, 58, 0.45)',
                          color: '#fca5a5',
                        }}
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* 4. Polls */}
      {subTab === 'polls' && (
        <section className="surface-monolith" style={{ padding: '1.5rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <h2 style={{ margin: 0 }}>
              <DualLabel
                sacred="DELIBERACIONES DEL CÓNCLAVE"
                tactical="Cerrar Votaciones Abiertas (Dictar Veredicto) o Eliminar"
                size="md"
              />
            </h2>
          </div>

          {polls.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>
              No hay deliberaciones registradas en el Cónclave.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {polls.map((p) => {
                const isOpen = p.status === 'open';
                const isBusy = busyId === p.id;
                return (
                  <article
                    key={p.id}
                    style={{
                      padding: '1rem 1.1rem',
                      borderRadius: '4px',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderLeft: `4px solid ${isOpen ? 'var(--status-ok)' : 'var(--accent-conclave)'}`,
                      background: 'rgba(10, 4, 5, 0.72)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '1rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ minWidth: 0, flex: '1 1 300px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                        <strong style={{ color: 'var(--text-main)', fontFamily: 'var(--cinzel-font)' }}>
                          {p.title}
                        </strong>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            padding: '0.12rem 0.5rem',
                            borderRadius: '3px',
                            border: `1px solid ${isOpen ? 'var(--status-ok)' : 'var(--accent-conclave)'}`,
                            color: isOpen ? 'var(--status-ok)' : 'var(--accent-conclave)',
                            fontWeight: 700,
                          }}
                        >
                          {isOpen ? 'Abierta' : 'Sellada'}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Tipo: {p.poll_type}
                        </span>
                      </div>
                      <div className="tabular-nums" style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>
                        {p.total_votes} votos · Cierre:{' '}
                        {formatSqliteAbyssalTimestamp(p.closes_at)} ·
                        Mín. Rango {p.min_rank_level}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn-primary"
                        disabled={isBusy || !isOpen}
                        onClick={() => setConfirmState({ kind: 'close-poll', item: p })}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.48rem 0.85rem' }}
                      >
                        <CheckCircle2 size={14} aria-hidden="true" />
                        {isOpen ? 'Sellar y Dictar Veredicto' : 'Ya Sellada'}
                      </button>

                      <button
                        type="button"
                        className="btn-secondary"
                        disabled={isBusy}
                        onClick={() => setConfirmState({ kind: 'delete-poll', item: p })}
                        aria-label={`Eliminar Cónclave ${p.title}`}
                        style={{
                          padding: '0.48rem 0.75rem',
                          borderColor: 'rgba(196, 30, 58, 0.45)',
                          color: '#fca5a5',
                        }}
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      <SealConfirmModal
        isOpen={Boolean(confirmState)}
        title={confirmCopy.title}
        message={confirmCopy.message}
        confirmLabel={confirmCopy.label}
        variant={confirmCopy.variant}
        isLoading={isConfirming}
        onCancel={() => setConfirmState(null)}
        onConfirm={handleConfirmAction}
      />
    </div>
  );
};

export default ConcilioOperativoTab;

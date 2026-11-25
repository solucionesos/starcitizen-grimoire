import React, { useCallback, useEffect, useId, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
  Shield,
  CheckCircle2,
  Plus,
  Sparkles,
  Trash2,
  X,
  Lock,
} from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { closePoll, createPoll, deletePoll, getPolls, votePoll } from '../api/client';
import type { Poll, PollType } from '../types';
import { TERMINOLOGY, getRankMeta } from '../constants/terminology';
import DragonIcon from '../components/DragonIcon';
import DualLabel from '../components/DualLabel';
import { useToast } from '../components/AbyssalToast';
import SealConfirmModal from '../components/SealConfirmModal';
import { toAbyssalYear } from '../utils/abyssalDate';

type PollStatusFilter = 'open' | 'closed' | 'all';

const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'] as const;

function formatAbyssalUtc(raw: string | null | undefined): string {
  if (!raw) return 'Ciclo Indeterminado';
  const trimmed = raw.trim();
  if (!trimmed) return 'Ciclo Indeterminado';
  const sqliteUtcRe = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/;
  const isoNaiveRe = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/;
  const normalized = sqliteUtcRe.test(trimmed)
    ? `${trimmed.replace(' ', 'T')}Z`
    : isoNaiveRe.test(trimmed)
      ? `${trimmed}Z`
      : trimmed;

  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) {
    return trimmed.replace(/\b(202\d)\b/g, (_, y: string) => String(Number(y) + 930));
  }
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = MONTHS_ES[d.getUTCMonth()] ?? 'Ene';
  const year = toAbyssalYear(d.getUTCFullYear());
  const hours = String(d.getUTCHours()).padStart(2, '0');
  const mins = String(d.getUTCMinutes()).padStart(2, '0');
  return `${day} ${month} Ciclo ${year} · ${hours}:${mins} UTC`;
}

function extractApiErr(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: unknown; message?: unknown } | undefined;
    if (typeof data?.error === 'string' && data.error.trim()) return data.error;
    if (typeof data?.message === 'string' && data.message.trim()) return data.message;
  }
  if (err instanceof Error && err.message.trim()) return err.message;
  return fallback;
}

function parseStatusFilter(raw: string | null): PollStatusFilter {
  if (raw === 'open' || raw === 'closed' || raw === 'all') return raw;
  return 'open';
}

export const Conclave: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const formId = useId();

  const statusFilter = parseStatusFilter(searchParams.get('status'));
  const prefillCruzada = searchParams.get('propose_cruzada');

  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [votingPollId, setVotingPollId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    mode: 'close' | 'delete';
    pollId: string;
    title: string;
  } | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Create Poll Form State
  const [showCreatePoll, setShowCreatePoll] = useState<boolean>(() => Boolean(prefillCruzada));
  const [pollTitle, setPollTitle] = useState<string>(() =>
    prefillCruzada ? `Deliberación de Cruzada: ${prefillCruzada}` : '',
  );
  const [pollDesc, setPollDesc] = useState('');
  const [pollType, setPollType] = useState<PollType>('cruzada');
  const [pollMinRank, setPollMinRank] = useState<number>(1);
  const [pollCloseDate, setPollCloseDate] = useState('');
  const [optionsInputs, setOptionsInputs] = useState<{ label: string; description: string }[]>(() =>
    prefillCruzada
      ? [
          {
            label: `Aprobar Cruzada: ${prefillCruzada}`,
            description: 'Despliegue inmediato en este ciclo',
          },
          {
            label: 'Aplazar Operación para el próximo ciclo',
            description: 'Priorizar acopio logístico previo',
          },
          {
            label: 'Descartar Mandato',
            description: 'Rechazar encargo por bajo valor estratégico',
          },
        ]
      : [
          { label: '', description: '' },
          { label: '', description: '' },
        ],
  );

  const isApproved = Boolean(user && user.status === 'approved');
  const isOfficerOrCouncil = Boolean(user && ['oficial', 'consejo', 'admin'].includes(user.role));
  const isCouncilOrAdmin = Boolean(user && ['consejo', 'admin'].includes(user.role));
  const userRankLevel = user?.rank_level ?? 0;

  const setStatusFilter = (nextStatus: PollStatusFilter) => {
    const next = new URLSearchParams(searchParams);
    next.set('status', nextStatus);
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    document.title = 'Star Grimoire | El Cónclave';
  }, []);

  useEffect(() => {
    if (!prefillCruzada) return;
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      setPollTitle(`Deliberación de Cruzada: ${prefillCruzada}`);
      setPollType('cruzada');
      setOptionsInputs([
        { label: `Aprobar Cruzada: ${prefillCruzada}`, description: 'Despliegue inmediato en este ciclo' },
        { label: 'Aplazar Operación para el próximo ciclo', description: 'Priorizar acopio logístico previo' },
        { label: 'Descartar Mandato', description: 'Rechazar encargo por bajo valor estratégico' },
      ]);
      setShowCreatePoll(true);
    });
    return () => {
      active = false;
    };
  }, [prefillCruzada]);

  const fetchPolls = useCallback(async () => {
    if (!isApproved) return;
    setLoading(true);
    try {
      const data = await getPolls();
      setPolls(data);
    } catch (err) {
      showToast(extractApiErr(err, 'No se pudieron cargar las deliberaciones del Cónclave'), 'error');
    } finally {
      setLoading(false);
    }
  }, [isApproved, showToast]);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(async () => {
      if (!cancelled) {
        await fetchPolls();
      }
    });
    return () => {
      cancelled = true;
    };
  }, [fetchPolls]);

  const handleCastVote = async (pollId: string, optionId: string) => {
    setVotingPollId(pollId);
    try {
      await votePoll(pollId, optionId);
      showToast('Voto sellado ante el Concilio del Vacío.', 'success');
      await fetchPolls();
    } catch (err) {
      showToast(extractApiErr(err, 'Error al sellar el voto'), 'error');
    } finally {
      setVotingPollId(null);
    }
  };

  const handleConfirmModalAction = async () => {
    if (!confirmModal) return;
    setModalLoading(true);
    try {
      if (confirmModal.mode === 'close') {
        const res = await closePoll(confirmModal.pollId);
        showToast(res.message || 'Veredicto emitido y publicado en el Grimoire.', 'success');
      } else {
        const res = await deletePoll(confirmModal.pollId);
        showToast(res.message || 'Deliberación purgada del registro.', 'info');
      }
      setConfirmModal(null);
      await fetchPolls();
    } catch (err) {
      showToast(
        extractApiErr(
          err,
          confirmModal.mode === 'close'
            ? 'Error al sellar la deliberación'
            : 'Error al eliminar la deliberación',
        ),
        'error',
      );
    } finally {
      setModalLoading(false);
    }
  };

  const handleAddOption = () => {
    setOptionsInputs((prev) => [...prev, { label: '', description: '' }]);
  };

  const handleRemoveOption = (index: number) => {
    if (optionsInputs.length <= 2) return;
    setOptionsInputs((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleOptionChange = (index: number, field: 'label' | 'description', val: string) => {
    setOptionsInputs((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    const validOptions = optionsInputs
      .map((o) => ({ label: o.label.trim(), description: o.description.trim() || undefined }))
      .filter((o) => Boolean(o.label));

    if (!pollTitle.trim() || !pollCloseDate || validOptions.length < 2) {
      showToast('Debes indicar título, fecha de cierre y al menos 2 opciones válidas.', 'error');
      return;
    }

    const parsedClose = new Date(pollCloseDate);
    if (Number.isNaN(parsedClose.getTime()) || parsedClose.getTime() <= Date.now()) {
      showToast('La fecha de cierre debe ser una fecha y hora futura válida.', 'error');
      return;
    }

    try {
      await createPoll({
        title: pollTitle.trim(),
        description: pollDesc.trim() || undefined,
        poll_type: pollType,
        closes_at: parsedClose.toISOString(),
        min_rank_level: pollMinRank,
        options: validOptions,
      });
      setShowCreatePoll(false);
      setPollTitle('');
      setPollDesc('');
      setPollMinRank(1);
      setPollCloseDate('');
      setOptionsInputs([
        { label: '', description: '' },
        { label: '', description: '' },
      ]);
      showToast('Deliberación convocada en el Cónclave.', 'success');
      await fetchPolls();
    } catch (err) {
      showToast(extractApiErr(err, 'Error al convocar el Cónclave'), 'error');
    }
  };

  const filteredPolls = polls.filter((p) => {
    if (statusFilter === 'all') return true;
    return p.status === statusFilter;
  });

  const currentAbyssalCycle = toAbyssalYear(new Date().getFullYear());

  return (
    <div style={{ padding: '0 2rem 5rem', maxWidth: '1100px', margin: '0 auto' }}>
      <SealConfirmModal
        isOpen={Boolean(confirmModal)}
        title={
          confirmModal?.mode === 'close'
            ? 'Sellar Cónclave y Emitir Veredicto'
            : 'Purgar Deliberación del Cónclave'
        }
        message={
          confirmModal?.mode === 'close'
            ? `¿Deseas sellar «${confirmModal.title}», proclamar la senda ganadora y emitir el Veredicto oficial para la portada?`
            : `¿Confirmas eliminar permanentemente la deliberación «${confirmModal?.title ?? ''}» y sus votos registrados?`
        }
        confirmLabel={confirmModal?.mode === 'close' ? 'Sellar Veredicto' : 'Eliminar Deliberación'}
        cancelLabel="Cancelar"
        variant={confirmModal?.mode === 'close' ? 'gold' : 'danger'}
        isLoading={modalLoading}
        onConfirm={handleConfirmModalAction}
        onCancel={() => setConfirmModal(null)}
      />

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', marginBottom: '0.6rem' }}>
          <DragonIcon size={36} />
          <h1 style={{ margin: 0 }}>
            <DualLabel
              sacred={TERMINOLOGY.conclave.sacred}
              tactical={TERMINOLOGY.conclave.tactical}
              size="lg"
              align="center"
              sacredColor="var(--secondary)"
            />
          </h1>
        </div>
        <p className="prose-grimoire" style={{ color: 'var(--text-muted)', fontSize: '1.05rem', margin: '0 auto' }}>
          Cámara sagrada de deliberación soberana del Ciclo {currentAbyssalCycle}. Solo los hermanos consagrados en La
          Escala del Abismo tienen voz y voto.
        </p>
      </div>

      {/* Restricted screen if visitor/pending */}
      {!isApproved && (
        <div
          className="surface-monolith"
          style={{
            textAlign: 'center',
            padding: '3.5rem 2rem',
            borderTop: '3px solid var(--secondary)',
            maxWidth: '650px',
            margin: '0 auto',
            boxShadow: '0 0 40px rgba(212, 175, 55, 0.15)',
          }}
        >
          <Shield size={48} aria-hidden="true" style={{ color: 'var(--secondary)', marginBottom: '1.2rem' }} />
          <h2 style={{ fontFamily: 'var(--cinzel-font)', color: 'var(--secondary)', fontSize: '1.5rem', margin: '0 0 0.8rem' }}>
            SELLADO POR EL CONCILIO DEL VACÍO
          </h2>
          <p className="prose-grimoire" style={{ color: 'var(--text-muted)', margin: '0 auto 1.5rem', fontSize: '0.95rem' }}>
            Las deliberaciones estratégicas de <strong>Ancalagon Oblivion Fleet</strong> están vedadas a Los Ciegos y a
            quienes aún aguardan en el Umbral. Para alzar tu voz en la elección de Edictos de Sangre, fechas de salto y
            Designios de la Flota, debes superar el Ritual de Iniciación ante el Concilio del Vacío.
          </p>
          <div style={{ fontSize: '0.85rem', color: 'var(--accent-silver)', fontStyle: 'italic', borderTop: '1px solid rgba(212,175,55,0.1)', paddingTop: '1rem' }}>
            «Un solo voto por hermano. Un solo destino hacia el Quiebre. IN NOMINI OBLIVIONIS.»
          </div>
        </div>
      )}

      {/* Approved Brothers Content */}
      {isApproved && (
        <div>
          {/* Actions Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div role="tablist" aria-label="Filtrar deliberaciones del Cónclave" style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              <button
                id={`${formId}-tab-open`}
                type="button"
                role="tab"
                aria-selected={statusFilter === 'open'}
                aria-controls={statusFilter === 'open' ? `${formId}-panel-open` : undefined}
                className={`filter-btn ${statusFilter === 'open' ? 'active' : ''}`}
                onClick={() => setStatusFilter('open')}
                style={{ padding: '0.5rem 1rem' }}
              >
                <DualLabel sacred="Deliberaciones Activas" tactical="Votaciones Abiertas" size="sm" />
              </button>
              <button
                id={`${formId}-tab-closed`}
                type="button"
                role="tab"
                aria-selected={statusFilter === 'closed'}
                aria-controls={statusFilter === 'closed' ? `${formId}-panel-closed` : undefined}
                className={`filter-btn ${statusFilter === 'closed' ? 'active' : ''}`}
                onClick={() => setStatusFilter('closed')}
                style={{ padding: '0.5rem 1rem' }}
              >
                <DualLabel sacred={TERMINOLOGY.veredictos.sacred} tactical={TERMINOLOGY.veredictos.tactical} size="sm" />
              </button>
              <button
                id={`${formId}-tab-all`}
                type="button"
                role="tab"
                aria-selected={statusFilter === 'all'}
                aria-controls={statusFilter === 'all' ? `${formId}-panel-all` : undefined}
                className={`filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
                onClick={() => setStatusFilter('all')}
                style={{ padding: '0.5rem 1rem' }}
              >
                <DualLabel sacred="Archivo Completo" tactical="Todas las Votaciones" size="sm" />
              </button>
            </div>

            {isOfficerOrCouncil && (
              <button
                type="button"
                onClick={() => setShowCreatePoll((v) => !v)}
                className="btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', padding: '0.6rem 1.3rem' }}
              >
                <Plus size={16} aria-hidden="true" />
                CONVOCAR VOTACIÓN
              </button>
            )}
          </div>

          {/* Create Poll Form */}
          <AnimatePresence>
            {showCreatePoll && (
              <motion.form
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                onSubmit={handleCreatePoll}
                className="surface-monolith"
                style={{
                  padding: '2.2rem',
                  marginBottom: '2.5rem',
                  borderLeft: '4px solid var(--secondary)',
                  borderTop: '1px solid rgba(212, 175, 55, 0.35)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    borderBottom: '1px solid rgba(212, 175, 55, 0.15)',
                    paddingBottom: '1rem',
                    marginBottom: '1.5rem',
                    gap: '1rem',
                  }}
                >
                  <div>
                    <h2 style={{ margin: '0 0 0.3rem' }}>
                      <DualLabel
                        sacred="☩ CONVOCAR NUEVA DELIBERACIÓN EN EL CÓNCLAVE"
                        tactical="Crear encuesta vinculante de la Hermandad"
                        size="md"
                        sacredColor="var(--secondary)"
                      />
                    </h2>
                    <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                      Toda deliberación sellada emitirá un Veredicto en la portada y ejecutará su mandato en Edictos Sagrados.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCreatePoll(false)}
                    aria-label="Cerrar formulario de votación"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '0.25rem',
                    }}
                  >
                    <X size={20} aria-hidden="true" />
                  </button>
                </div>

                {/* Fila 1: Título */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label
                    htmlFor={`${formId}-poll-title`}
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--secondary)',
                      display: 'block',
                      marginBottom: '0.4rem',
                      fontFamily: 'var(--cinzel-font)',
                      letterSpacing: '1.5px',
                    }}
                  >
                    TEMA O TÍTULO DE LA VOTACIÓN
                  </label>
                  <input
                    id={`${formId}-poll-title`}
                    name="pollTitle"
                    type="text"
                    className="search-input"
                    placeholder="Ej. Deliberación del Concilio: Próximo Edicto de Sangre en Pyro…"
                    value={pollTitle}
                    onChange={(e) => setPollTitle(e.target.value)}
                    required
                  />
                </div>

                {/* Fila 2: Naturaleza, Rango Mínimo, Fecha de Cierre */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
                    gap: '1.2rem',
                    marginBottom: '1.25rem',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <label
                      htmlFor={`${formId}-poll-type`}
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--secondary)',
                        display: 'block',
                        marginBottom: '0.4rem',
                        fontFamily: 'var(--cinzel-font)',
                        letterSpacing: '1.5px',
                      }}
                    >
                      NATURALEZA DE LA DELIBERACIÓN
                    </label>
                    <select
                      id={`${formId}-poll-type`}
                      name="pollType"
                      className="select-filter"
                      value={pollType}
                      onChange={(e) => setPollType(e.target.value as PollType)}
                    >
                      <option value="cruzada">Cruzada (Misión u Operación de la Flota)</option>
                      <option value="convocatoria">Convocatoria (Fecha y Hora de Operación)</option>
                      <option value="designio">Designio (Objetivo Estratégico de la Flota)</option>
                      <option value="libre">Deliberación Doctrinal Libre</option>
                    </select>
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <label
                      htmlFor={`${formId}-poll-min-rank`}
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--secondary)',
                        display: 'block',
                        marginBottom: '0.4rem',
                        fontFamily: 'var(--cinzel-font)',
                        letterSpacing: '1.5px',
                      }}
                    >
                      PELDAÑO MÍNIMO PARA VOTAR
                    </label>
                    <select
                      id={`${formId}-poll-min-rank`}
                      name="pollMinRank"
                      className="select-filter"
                      value={pollMinRank}
                      onChange={(e) => setPollMinRank(Number(e.target.value))}
                    >
                      <option value={1}>[I] Sombras del Umbral (Todos los Consagrados)</option>
                      <option value={2}>[II] Iniciados del Vacío o superior</option>
                      <option value={3}>[III] Portadores de Ceniza o superior</option>
                      <option value={4}>[IV] Voces del Abismo o superior</option>
                      <option value={5}>[V] Solo el Concilio del Vacío (Profetas / Heraldo)</option>
                    </select>
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <label
                      htmlFor={`${formId}-poll-closes-at`}
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--secondary)',
                        display: 'block',
                        marginBottom: '0.4rem',
                        fontFamily: 'var(--cinzel-font)',
                        letterSpacing: '1.5px',
                      }}
                    >
                      CIERRE DE LA VOTACIÓN (HORA LOCAL → UTC)
                    </label>
                    <input
                      id={`${formId}-poll-closes-at`}
                      name="pollCloseDate"
                      type="datetime-local"
                      className="search-input"
                      value={pollCloseDate}
                      onChange={(e) => setPollCloseDate(e.target.value)}
                      required
                    />
                    <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                      El Grimoire proyecta automáticamente +930 años (Ciclo {currentAbyssalCycle}).
                    </span>
                  </div>
                </div>

                {/* Fila 3: Contexto */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label
                    htmlFor={`${formId}-poll-description`}
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--secondary)',
                      display: 'block',
                      marginBottom: '0.4rem',
                      fontFamily: 'var(--cinzel-font)',
                      letterSpacing: '1.5px',
                    }}
                  >
                    CONTEXTO Y ANÁLISIS ESTRATÉGICO
                  </label>
                  <textarea
                    id={`${formId}-poll-description`}
                    name="pollDescription"
                    rows={3}
                    className="search-input"
                    placeholder="Explica a los hermanos las implicaciones tácticas, riesgos y propósito de esta deliberación…"
                    value={pollDesc}
                    onChange={(e) => setPollDesc(e.target.value)}
                  />
                </div>

                {/* Fila 4: Opciones */}
                <div
                  style={{
                    marginBottom: '1.8rem',
                    padding: '1.25rem',
                    background: 'rgba(0, 0, 0, 0.35)',
                    borderRadius: '6px',
                    border: '1px solid rgba(212, 175, 55, 0.15)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '1rem',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.78rem',
                        color: 'var(--secondary)',
                        fontFamily: 'var(--cinzel-font)',
                        letterSpacing: '1.5px',
                      }}
                    >
                      SENDAS / OPCIONES A DELIBERAR (MÍNIMO 2)
                    </span>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={handleAddOption}
                      style={{ fontSize: '0.72rem', padding: '0.4rem 0.9rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <Plus size={14} aria-hidden="true" /> AGREGAR OTRA OPCIÓN
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {optionsInputs.map((opt, i) => {
                      const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][i] || String(i + 1);
                      return (
                        <div
                          key={i}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '38px minmax(0, 1fr) minmax(0, 1fr) auto',
                            gap: '0.75rem',
                            alignItems: 'center',
                            background: 'rgba(255, 255, 255, 0.02)',
                            padding: '0.65rem',
                            borderRadius: '6px',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                          }}
                        >
                          <div
                            aria-hidden="true"
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '4px',
                              background: 'rgba(196, 30, 58, 0.2)',
                              border: '1px solid rgba(196, 30, 58, 0.5)',
                              color: 'var(--secondary)',
                              fontFamily: 'var(--cinzel-font)',
                              fontSize: '0.8rem',
                              fontWeight: 'bold',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {roman}
                          </div>

                          <input
                            id={`${formId}-opt-label-${i}`}
                            name={`pollOptionLabel_${i}`}
                            type="text"
                            aria-label={`Senda ${roman}: título de la opción`}
                            className="search-input"
                            placeholder={`Senda / Opción ${i + 1} (Obligatorio)…`}
                            value={opt.label}
                            onChange={(e) => handleOptionChange(i, 'label', e.target.value)}
                            required
                          />

                          <input
                            id={`${formId}-opt-desc-${i}`}
                            name={`pollOptionDesc_${i}`}
                            type="text"
                            aria-label={`Senda ${roman}: detalle táctico opcional`}
                            className="search-input"
                            placeholder="Detalle táctico o sector (Opcional)…"
                            value={opt.description}
                            onChange={(e) => handleOptionChange(i, 'description', e.target.value)}
                          />

                          {optionsInputs.length > 2 ? (
                            <button
                              type="button"
                              onClick={() => handleRemoveOption(i)}
                              aria-label={`Eliminar Senda ${roman}`}
                              style={{
                                background: 'rgba(196, 30, 58, 0.15)',
                                border: '1px solid rgba(196, 30, 58, 0.4)',
                                color: '#fca5a5',
                                borderRadius: '4px',
                                padding: '0.55rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Trash2 size={15} aria-hidden="true" />
                            </button>
                          ) : (
                            <div style={{ width: '33px' }} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTop: '1px solid rgba(212, 175, 55, 0.15)',
                    paddingTop: '1.2rem',
                    flexWrap: 'wrap',
                    gap: '1rem',
                  }}
                >
                  <span style={{ fontSize: '0.72rem', color: 'var(--secondary)', fontFamily: 'var(--cinzel-font)', letterSpacing: '2px' }}>
                    IN NOMINI OBLIVIONIS
                  </span>

                  <div style={{ display: 'flex', gap: '0.8rem' }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setShowCreatePoll(false)}
                    >
                      CANCELAR
                    </button>
                    <button type="submit" className="btn-primary">
                      SELLAR Y ABRIR CÓNCLAVE
                    </button>
                  </div>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Polls Listing */}
          <div
            id={`${formId}-panel-${statusFilter}`}
            role="tabpanel"
            aria-labelledby={`${formId}-tab-${statusFilter}`}
          >
            <h2 style={{ margin: '0 0 1.4rem' }}>
              <DualLabel
                sacred={
                  statusFilter === 'open'
                    ? 'DELIBERACIONES ACTIVAS DEL CÓNCLAVE'
                    : statusFilter === 'closed'
                      ? 'VEREDICTOS SELLADOS DEL CÓNCLAVE'
                      : 'ARCHIVO COMPLETO DEL CÓNCLAVE'
                }
                tactical={
                  statusFilter === 'open'
                    ? 'Votaciones abiertas de la Hermandad'
                    : statusFilter === 'closed'
                      ? TERMINOLOGY.veredictos.tactical
                      : 'Todas las deliberaciones registradas'
                }
                size="md"
                sacredColor="var(--secondary)"
              />
            </h2>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--secondary)', fontFamily: 'var(--cinzel-font)' }}>
                ABRIENDO LOS ROLLOS DEL CÓNCLAVE…
              </div>
            ) : filteredPolls.length === 0 ? (
              <div className="surface-monolith" style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>
                No hay deliberaciones en este estado en el Cónclave.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {filteredPolls.map((poll) => {
                const isOpen = poll.status === 'open';
                const hasVoted = Boolean(poll.user_voted_option_id);
                const requiredRank = getRankMeta(poll.min_rank_level);
                const canVoteByRank = userRankLevel >= poll.min_rank_level;
                const canCloseThisPoll =
                  isOpen &&
                  Boolean(user) &&
                  (isCouncilOrAdmin || (user!.role === 'oficial' && poll.creator_id === user!.id));

                return (
                  <article
                    key={poll.id}
                    className="surface-monolith"
                    style={{
                      padding: '2rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1.2rem',
                      borderTop: `4px solid ${isOpen ? 'var(--secondary)' : 'var(--rank-1)'}`,
                      position: 'relative',
                    }}
                  >
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                          <span
                            style={{
                              fontSize: '0.65rem',
                              fontFamily: 'var(--cinzel-font)',
                              padding: '0.2rem 0.6rem',
                              borderRadius: '3px',
                              background: isOpen ? 'rgba(212,175,55,0.15)' : 'rgba(100,100,100,0.2)',
                              color: isOpen ? 'var(--secondary)' : 'var(--accent-silver)',
                              border: `1px solid ${isOpen ? 'rgba(212,175,55,0.3)' : 'rgba(255,255,255,0.18)'}`,
                              textTransform: 'uppercase',
                              fontWeight: 'bold',
                            }}
                          >
                            {isOpen ? '● DELIBERACIÓN ABIERTA' : '✔ CÓNCLAVE SELLADO'}
                          </span>

                          <span
                            style={{
                              fontSize: '0.7rem',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '3px',
                              background: 'rgba(255,255,255,0.04)',
                              color: 'var(--accent-silver)',
                              textTransform: 'uppercase',
                            }}
                          >
                            TIPO: {poll.poll_type}
                          </span>

                          <span
                            style={{
                              fontSize: '0.7rem',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '3px',
                              background: 'rgba(168, 85, 247, 0.12)',
                              color: requiredRank.color,
                              border: '1px solid rgba(168, 85, 247, 0.28)',
                            }}
                          >
                            Rango mínimo: [{requiredRank.roman}] {requiredRank.name}
                          </span>

                          {poll.creator_name && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              Convocada por <strong style={{ color: 'var(--text-main)' }}>{poll.creator_name}</strong>
                            </span>
                          )}
                        </div>

                        <h3
                          style={{
                            margin: 0,
                            fontFamily: 'var(--cinzel-font)',
                            fontSize: '1.35rem',
                            color: 'var(--text-main)',
                            letterSpacing: '1px',
                          }}
                        >
                          {poll.title}
                        </h3>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--cinzel-font)' }}>
                          {isOpen ? 'CIERRA EN EL CICLO' : 'SELLADO EN EL CICLO'}
                        </div>
                        <div className="tabular-nums" style={{ fontSize: '0.95rem', color: isOpen ? 'var(--secondary)' : 'var(--text-muted)', fontWeight: 'bold' }}>
                          {formatAbyssalUtc(poll.closes_at)}
                        </div>
                      </div>
                    </div>

                    {poll.description && (
                      <p className="prose-grimoire" style={{ margin: 0, fontSize: '0.92rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                        {poll.description}
                      </p>
                    )}

                    {isOpen && !canVoteByRank && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.6rem',
                          padding: '0.65rem 0.9rem',
                          borderRadius: '4px',
                          background: 'rgba(245, 158, 11, 0.08)',
                          border: '1px solid rgba(245, 158, 11, 0.3)',
                          fontSize: '0.82rem',
                          color: 'var(--status-warn)',
                        }}
                      >
                        <Lock size={15} aria-hidden="true" style={{ flexShrink: 0 }} />
                        <span>
                          Tu rango actual no alcanza el peldaño [{requiredRank.roman}] {requiredRank.name} requerido para emitir voto en esta deliberación.
                        </span>
                      </div>
                    )}

                    {/* Options List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '0.5rem' }}>
                      {poll.options.map((option) => {
                        const isSelected = poll.user_voted_option_id === option.id;
                        const isWinner = poll.winner_option_id === option.id;
                        const pct = poll.total_votes > 0 ? Math.round((option.votes_count / poll.total_votes) * 100) : 0;

                        return (
                          <div
                            key={option.id}
                            style={{
                              position: 'relative',
                              padding: '1rem 1.2rem',
                              background: isSelected
                                ? 'rgba(212,175,55,0.08)'
                                : isWinner
                                  ? 'rgba(16, 185, 129, 0.08)'
                                  : 'rgba(0,0,0,0.3)',
                              borderRadius: '6px',
                              border: `1px solid ${
                                isWinner
                                  ? 'var(--status-ok)'
                                  : isSelected
                                    ? 'var(--secondary)'
                                    : 'rgba(255,255,255,0.06)'
                              }`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '1rem',
                              flexWrap: 'wrap',
                              transition: 'border-color 0.2s ease, background-color 0.2s ease',
                            }}
                          >
                            <div
                              style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                bottom: 0,
                                width: `${pct}%`,
                                background: isWinner
                                  ? 'rgba(16, 185, 129, 0.14)'
                                  : isSelected
                                    ? 'rgba(212,175,55,0.12)'
                                    : 'rgba(255,255,255,0.03)',
                                borderRadius: '6px',
                                pointerEvents: 'none',
                                transition: 'width 0.4s ease',
                              }}
                            />

                            <div style={{ zIndex: 1, display: 'flex', alignItems: 'center', gap: '0.8rem', flex: 1, minWidth: '200px' }}>
                              {isWinner ? (
                                <CheckCircle2 size={18} color="var(--status-ok)" aria-hidden="true" style={{ flexShrink: 0 }} />
                              ) : isSelected ? (
                                <Sparkles size={18} color="var(--secondary)" aria-hidden="true" style={{ flexShrink: 0 }} />
                              ) : null}

                              <div>
                                <div style={{ fontSize: '0.95rem', fontWeight: isSelected || isWinner ? 'bold' : 'normal', color: 'var(--text-main)' }}>
                                  {option.label}
                                </div>
                                {option.description && (
                                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                                    {option.description}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div style={{ zIndex: 1, display: 'flex', alignItems: 'center', gap: '1rem' }}>
                              <div className="tabular-nums" style={{ textAlign: 'right', minWidth: '64px' }}>
                                <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: isWinner ? 'var(--status-ok)' : 'var(--text-main)' }}>
                                  {pct}%
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                  {option.votes_count} votos
                                </div>
                              </div>

                              {isOpen && (
                                <button
                                  type="button"
                                  className={isSelected ? 'btn-secondary' : 'btn-primary'}
                                  style={{
                                    fontSize: '0.75rem',
                                    padding: '0.45rem 0.9rem',
                                    minWidth: '98px',
                                  }}
                                  disabled={votingPollId === poll.id || !canVoteByRank}
                                  onClick={() => void handleCastVote(poll.id, option.id)}
                                >
                                  {!canVoteByRank ? 'BLOQUEADO' : isSelected ? 'TU VOTO' : 'VOTAR'}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Footer bar of poll */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderTop: '1px solid rgba(255,255,255,0.06)',
                        paddingTop: '0.8rem',
                        marginTop: '0.5rem',
                        flexWrap: 'wrap',
                        gap: '0.8rem',
                      }}
                    >
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Quórum actual:{' '}
                        <strong className="tabular-nums" style={{ color: 'var(--text-main)' }}>
                          {poll.total_votes} hermanos
                        </strong>{' '}
                        han alzado su voz.
                        {hasVoted && <span style={{ color: 'var(--secondary)', marginLeft: '0.5rem' }}>✦ Has votado</span>}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                        {canCloseThisPoll && (
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{
                              fontSize: '0.75rem',
                              borderColor: 'var(--secondary)',
                              color: 'var(--secondary)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                            }}
                            onClick={() =>
                              setConfirmModal({
                                mode: 'close',
                                pollId: poll.id,
                                title: poll.title,
                              })
                            }
                          >
                            <Shield size={14} aria-hidden="true" />
                            SELLAR CÓNCLAVE Y EMITIR VEREDICTO
                          </button>
                        )}

                        {isCouncilOrAdmin && (
                          <button
                            type="button"
                            className="btn-secondary"
                            aria-label={`Eliminar deliberación ${poll.title}`}
                            style={{
                              fontSize: '0.75rem',
                              borderColor: 'rgba(239, 68, 68, 0.45)',
                              color: 'var(--status-danger)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.45rem 0.7rem',
                            }}
                            onClick={() =>
                              setConfirmModal({
                                mode: 'delete',
                                pollId: poll.id,
                                title: poll.title,
                              })
                            }
                          >
                            <Trash2 size={14} aria-hidden="true" />
                            ELIMINAR
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Conclave;

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import {
  Shield,
  CheckCircle2,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { Poll } from '../types';
import DragonIcon from '../components/DragonIcon';
import { formatAbyssalDate } from '../utils/abyssalDate';

export const Conclave: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [votingPollId, setVotingPollId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed'>('open');

  // Create Poll Modal State
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [pollTitle, setPollTitle] = useState('');
  const [pollDesc, setPollDesc] = useState('');
  const [pollType, setPollType] = useState<'cruzada' | 'convocatoria' | 'designio' | 'libre'>('cruzada');
  const [pollMinRank, setPollMinRank] = useState<number>(1);
  const [pollCloseDate, setPollCloseDate] = useState('');
  const [optionsInputs, setOptionsInputs] = useState<{ label: string; description: string }[]>([
    { label: '', description: '' },
    { label: '', description: '' },
  ]);

  const isApproved = user && user.status === 'approved';
  const isOfficerOrCouncil = user && ['oficial', 'consejo', 'admin'].includes(user.role);

  // Check query param for prefilled cruzada proposal
  useEffect(() => {
    const prefill = searchParams.get('propose_cruzada');
    if (prefill) {
      setPollTitle(`Deliberación de Cruzada: ${decodeURIComponent(prefill)}`);
      setPollType('cruzada');
      setOptionsInputs([
        { label: `Aprobar Cruzada: ${decodeURIComponent(prefill)}`, description: 'Despliegue inmediato en este ciclo' },
        { label: 'Aplazar Operación para el próximo ciclo', description: 'Priorizar acopio logístico previo' },
        { label: 'Descartar Mandato', description: 'Rechazar encargo por bajo valor estratégico' },
      ]);
      setShowCreatePoll(true);
    }
  }, [searchParams]);

  const fetchPolls = async () => {
    if (!isApproved) return;
    setLoading(true);
    try {
      const res = await axios.get('/polls');
      setPolls(res.data);
    } catch (err) {
      console.error('Error fetching polls:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolls();
  }, [isApproved]);

  const handleCastVote = async (pollId: string, optionId: string) => {
    setVotingPollId(pollId);
    try {
      await axios.post(`/polls/${pollId}/vote`, { option_id: optionId });
      await fetchPolls();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al sellar el voto');
    } finally {
      setVotingPollId(null);
    }
  };

  const handleClosePoll = async (pollId: string) => {
    if (!confirm('¿Deseas sellar este Cónclave y emitir el Veredicto final para la página principal?')) return;

    try {
      const res = await axios.post(`/polls/${pollId}/close`);
      alert(res.data.message || 'Veredicto emitido');
      await fetchPolls();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al sellar la deliberación');
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

    if (!pollTitle || !pollCloseDate || validOptions.length < 2) {
      alert('Debes indicar título, fecha de cierre y al menos 2 opciones válidas.');
      return;
    }

    try {
      await axios.post('/polls', {
        title: pollTitle,
        description: pollDesc,
        poll_type: pollType,
        closes_at: pollCloseDate,
        min_rank_level: pollMinRank,
        options: validOptions,
      });
      setShowCreatePoll(false);
      setPollTitle('');
      setPollDesc('');
      setPollMinRank(1);
      setOptionsInputs([
        { label: '', description: '' },
        { label: '', description: '' },
      ]);
      fetchPolls();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al convocar el Cónclave');
    }
  };

  const filteredPolls = polls.filter((p) => {
    if (statusFilter === 'all') return true;
    return p.status === statusFilter;
  });

  return (
    <div style={{ padding: '0 2rem 5rem', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', marginBottom: '0.5rem' }}>
          <DragonIcon size={36} />
          <h1
            style={{
              fontFamily: 'var(--cinzel-font)',
              color: 'var(--secondary)',
              fontSize: '2.4rem',
              letterSpacing: '5px',
              margin: 0,
            }}
          >
            EL CÓNCLAVE DEL CONCILIO DEL VACÍO
          </h1>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', margin: 0, fontFamily: 'var(--body-font)' }}>
          Cámara sagrada de deliberación soberana del Ciclo 2956. Solo los hermanos consagrados en La Escala del Abismo
          tienen voz y voto.
        </p>
      </div>

      {/* Restricted screen if visitor/pending */}
      {!isApproved && (
        <div
          className="glass-card"
          style={{
            textAlign: 'center',
            padding: '3.5rem 2rem',
            borderTop: '3px solid var(--secondary)',
            maxWidth: '650px',
            margin: '0 auto',
            boxShadow: '0 0 40px rgba(212, 175, 55, 0.15)',
          }}
        >
          <Shield size={48} style={{ color: 'var(--secondary)', marginBottom: '1.2rem' }} />
          <h2 style={{ fontFamily: 'var(--cinzel-font)', color: 'var(--secondary)', fontSize: '1.5rem', margin: '0 0 0.8rem' }}>
            SELLADO POR EL CONCILIO DEL VACÍO
          </h2>
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, margin: '0 0 1.5rem', fontSize: '0.95rem' }}>
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
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {(['open', 'closed', 'all'] as const).map((st) => (
                <button
                  key={st}
                  className={`filter-btn ${statusFilter === st ? 'active' : ''}`}
                  onClick={() => setStatusFilter(st)}
                  style={{ fontSize: '0.8rem', padding: '0.5rem 1.2rem' }}
                >
                  {st === 'open' ? 'DELIBERACIONES ACTIVAS' : st === 'closed' ? 'SELLADAS (VEREDICTOS)' : 'TODAS'}
                </button>
              ))}
            </div>

            {isOfficerOrCouncil && (
              <button
                onClick={() => setShowCreatePoll(!showCreatePoll)}
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', padding: '0.6rem 1.3rem' }}
              >
                <Plus size={16} />
                CONVOCAR VOTACIÓN
              </button>
            )}
          </div>

          {/* Create Poll Modal Form */}
          <AnimatePresence>
            {showCreatePoll && (
              <motion.form
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                onSubmit={handleCreatePoll}
                className="glass-card"
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
                    <h3
                      style={{
                        fontFamily: 'var(--cinzel-font)',
                        color: 'var(--secondary)',
                        margin: '0 0 0.3rem',
                        fontSize: '1.25rem',
                        letterSpacing: '2px',
                      }}
                    >
                      ☩ CONVOCAR NUEVA DELIBERACIÓN EN EL CÓNCLAVE
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                      Toda deliberación sellada emitirá un Veredicto en la portada y ejecutará su mandato en Edictos Sagrados.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCreatePoll(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '0.2rem',
                    }}
                    title="Cerrar formulario"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Fila 1: Título a ancho completo */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label
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
                    type="text"
                    className="search-input"
                    placeholder="Ej. Deliberación del Concilio: Próximo Edicto de Sangre en Pyro"
                    value={pollTitle}
                    onChange={(e) => setPollTitle(e.target.value)}
                    required
                  />
                </div>

                {/* Fila 2: 3 Columnas balanceadas (Naturaleza, Rango Mínimo, Fecha de Cierre) */}
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
                      className="select-filter"
                      value={pollType}
                      onChange={(e: any) => setPollType(e.target.value)}
                    >
                      <option value="cruzada">Cruzada (Misión u Operación de la Flota)</option>
                      <option value="convocatoria">Convocatoria (Fecha y Hora de Operación)</option>
                      <option value="designio">Designio (Objetivo Estratégico de la Flota)</option>
                      <option value="libre">Deliberación Doctrinal Libre</option>
                    </select>
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <label
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
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--secondary)',
                        display: 'block',
                        marginBottom: '0.4rem',
                        fontFamily: 'var(--cinzel-font)',
                        letterSpacing: '1.5px',
                      }}
                    >
                      CIERRE DE LA VOTACIÓN (FECHA Y HORA)
                    </label>
                    <input
                      type="datetime-local"
                      className="search-input"
                      value={pollCloseDate}
                      onChange={(e) => setPollCloseDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Fila 3: Contexto Estratégico a ancho completo */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label
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
                    rows={3}
                    className="search-input"
                    placeholder="Explica a los hermanos las implicaciones tácticas, riesgos y propósito de esta deliberación..."
                    value={pollDesc}
                    onChange={(e) => setPollDesc(e.target.value)}
                  />
                </div>

                {/* Fila 4: Opciones numeradas como Sendas */}
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
                    <label
                      style={{
                        fontSize: '0.78rem',
                        color: 'var(--secondary)',
                        fontFamily: 'var(--cinzel-font)',
                        letterSpacing: '1.5px',
                      }}
                    >
                      SENDAS / OPCIONES A DELIBERAR (MÍNIMO 2)
                    </label>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={handleAddOption}
                      style={{ fontSize: '0.72rem', padding: '0.4rem 0.9rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <Plus size={14} /> AGREGAR OTRA OPCIÓN
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
                            gridTemplateColumns: '38px 1fr 1fr auto',
                            gap: '0.75rem',
                            alignItems: 'center',
                            background: 'rgba(255, 255, 255, 0.02)',
                            padding: '0.65rem',
                            borderRadius: '6px',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                          }}
                        >
                          <div
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
                            type="text"
                            className="search-input"
                            placeholder={`Senda / Opción ${i + 1} (Obligatorio)`}
                            value={opt.label}
                            onChange={(e) => handleOptionChange(i, 'label', e.target.value)}
                            required
                          />

                          <input
                            type="text"
                            className="search-input"
                            placeholder="Detalle táctico o sector (Opcional)"
                            value={opt.description}
                            onChange={(e) => handleOptionChange(i, 'description', e.target.value)}
                          />

                          {optionsInputs.length > 2 ? (
                            <button
                              type="button"
                              onClick={() => handleRemoveOption(i)}
                              style={{
                                background: 'rgba(196, 30, 58, 0.15)',
                                border: '1px solid rgba(196, 30, 58, 0.4)',
                                color: '#ff6666',
                                borderRadius: '4px',
                                padding: '0.55rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                              title="Eliminar opción"
                            >
                              <Trash2 size={15} />
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
          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--secondary)', fontFamily: 'var(--cinzel-font)' }}>
              ABRIENDO LOS ROLLOS DEL CÓNCLAVE...
            </div>
          ) : filteredPolls.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>
              No hay deliberaciones en este estado en el Cónclave.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {filteredPolls.map((poll) => {
                const isOpen = poll.status === 'open';
                const hasVoted = Boolean(poll.user_voted_option_id);

                return (
                  <div
                    key={poll.id}
                    className="glass-card"
                    style={{
                      padding: '2rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1.2rem',
                      borderTop: `4px solid ${isOpen ? 'var(--secondary)' : '#6b7280'}`,
                      position: 'relative',
                    }}
                  >
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                          <span
                            style={{
                              fontSize: '0.65rem',
                              fontFamily: 'var(--cinzel-font)',
                              padding: '0.2rem 0.6rem',
                              borderRadius: '3px',
                              background: isOpen ? 'rgba(212,175,55,0.15)' : 'rgba(100,100,100,0.2)',
                              color: isOpen ? 'var(--secondary)' : '#aaa',
                              border: `1px solid ${isOpen ? 'rgba(212,175,55,0.3)' : '#555'}`,
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
                        <div style={{ fontSize: '0.95rem', color: isOpen ? 'var(--secondary)' : 'var(--text-muted)', fontWeight: 'bold' }}>
                          {formatAbyssalDate(poll.closes_at, { includeTime: true, prefixCycle: true })}
                        </div>
                      </div>
                    </div>

                    {poll.description && (
                      <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                        {poll.description}
                      </p>
                    )}

                    {/* Options List with Interactive Voting */}
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
                                ? 'rgba(34,197,94,0.08)'
                                : 'rgba(0,0,0,0.3)',
                              borderRadius: '6px',
                              border: `1px solid ${
                                isWinner
                                  ? '#22c55e'
                                  : isSelected
                                  ? 'var(--secondary)'
                                  : 'rgba(255,255,255,0.06)'
                              }`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '1rem',
                              transition: 'all 0.2s',
                            }}
                          >
                            {/* Vote percentage bar in background */}
                            <div
                              style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                bottom: 0,
                                width: `${pct}%`,
                                background: isWinner
                                  ? 'rgba(34,197,94,0.12)'
                                  : isSelected
                                  ? 'rgba(212,175,55,0.12)'
                                  : 'rgba(255,255,255,0.03)',
                                borderRadius: '6px',
                                pointerEvents: 'none',
                                transition: 'width 0.4s ease',
                              }}
                            />

                            <div style={{ zIndex: 1, display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                              {isWinner ? (
                                <CheckCircle2 size={18} color="#22c55e" />
                              ) : isSelected ? (
                                <Sparkles size={18} color="var(--secondary)" />
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
                              <div style={{ textAlign: 'right', minWidth: '60px' }}>
                                <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: isWinner ? '#22c55e' : 'var(--text-main)' }}>
                                  {pct}%
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                  {option.votes_count} votos
                                </div>
                              </div>

                              {isOpen && (
                                <button
                                  className={isSelected ? 'btn-secondary' : 'btn-primary'}
                                  style={{
                                    fontSize: '0.75rem',
                                    padding: '0.4rem 0.9rem',
                                    minWidth: '95px',
                                  }}
                                  disabled={votingPollId === poll.id}
                                  onClick={() => handleCastVote(poll.id, option.id)}
                                >
                                  {isSelected ? 'TU VOTO' : 'VOTAR'}
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
                        <strong style={{ color: 'var(--text-main)' }}>{poll.total_votes} hermanos</strong> han alzado su voz.
                        {hasVoted && <span style={{ color: 'var(--secondary)', marginLeft: '0.5rem' }}>✦ Has votado</span>}
                      </div>

                      {/* Close & publish verdict action for Council */}
                      {isOfficerOrCouncil && isOpen && (
                        <button
                          className="btn-secondary"
                          style={{
                            fontSize: '0.75rem',
                            borderColor: 'var(--secondary)',
                            color: 'var(--secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                          }}
                          onClick={() => handleClosePoll(poll.id)}
                        >
                          <Shield size={14} />
                          SELLAR CÓNCLAVE Y EMITIR VEREDICTO
                        </button>
                      )}
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

export default Conclave;

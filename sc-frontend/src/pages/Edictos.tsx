import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { Objective, Crusade } from '../types';
import DragonIcon from '../components/DragonIcon';
import { formatAbyssalDate, toAbyssalYear } from '../utils/abyssalDate';

export const Edictos: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'designios' | 'cruzadas' | 'calendario'>('designios');

  // Designios state
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [roster, setRoster] = useState<any[]>([]);
  const [loadingObjectives, setLoadingObjectives] = useState(true);
  const [scopeFilter, setScopeFilter] = useState<'all' | 'org' | 'mine'>('all');
  const [showCreateObjective, setShowCreateObjective] = useState(false);
  const [newObjTitle, setNewObjTitle] = useState('');
  const [newObjDesc, setNewObjDesc] = useState('');
  const [newObjScope, setNewObjScope] = useState<'org' | 'cargo' | 'individual'>('org');
  const [newObjAssignee, setNewObjAssignee] = useState<string>('');
  const [newObjCategory, setNewObjCategory] = useState<'recoleccion' | 'combate' | 'ascenso' | 'forja' | 'general'>('general');
  const [newObjDate, setNewObjDate] = useState('');

  // Cruzadas state
  const [crusades, setCrusades] = useState<Crusade[]>([]);
  const [loadingCrusades, setLoadingCrusades] = useState(true);
  const [selectedCrusade, setSelectedCrusade] = useState<any | null>(null);
  const [showCreateCrusade, setShowCreateCrusade] = useState(false);
  const [signupShip, setSignupShip] = useState('');
  const [signupRole, setSignupRole] = useState('Vanguardia de Ceniza');

  // New Crusade Form
  const [crusadeTitle, setCrusadeTitle] = useState('');
  const [crusadeDesc, setCrusadeDesc] = useState('');
  const [crusadeBriefing, setCrusadeBriefing] = useState('');
  const [crusadeLocation, setCrusadeLocation] = useState('Pyro VI — Ruin Station');
  const [crusadeDate, setCrusadeDate] = useState('');
  const [crusadeShips, setCrusadeShips] = useState('');

  // Calendar events
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);

  const isApproved = user && user.status === 'approved';
  const isOfficerOrCouncil = user && ['oficial', 'consejo', 'admin'].includes(user.role);

  const fetchObjectives = async () => {
    setLoadingObjectives(true);
    try {
      const res = await axios.get('/objectives');
      setObjectives(res.data);
    } catch (err) {
      console.error('Error fetching objectives:', err);
    } finally {
      setLoadingObjectives(false);
    }
  };

  const fetchRoster = async () => {
    try {
      const res = await axios.get('/auth/roster');
      setRoster(res.data || []);
    } catch (err) {
      console.error('Error fetching roster:', err);
    }
  };

  const fetchCrusades = async () => {
    setLoadingCrusades(true);
    try {
      const res = await axios.get('/crusades');
      setCrusades(res.data);
    } catch (err) {
      console.error('Error fetching crusades:', err);
    } finally {
      setLoadingCrusades(false);
    }
  };

  const fetchCalendar = async () => {
    try {
      const res = await axios.get('/crusades/calendar/all');
      setCalendarEvents(res.data.events || []);
    } catch (err) {
      console.error('Error fetching calendar:', err);
    }
  };

  useEffect(() => {
    if (isApproved) {
      fetchObjectives();
      fetchRoster();
      fetchCrusades();
      fetchCalendar();
    }
  }, [isApproved]);

  const handleCreateObjective = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newObjTitle) return;

    try {
      await axios.post('/objectives', {
        title: newObjTitle,
        description: newObjDesc,
        scope: newObjScope,
        category: newObjCategory,
        due_date: newObjDate || null,
        assigned_to: newObjAssignee || (newObjScope === 'individual' ? user?.id : null),
      });
      setShowCreateObjective(false);
      setNewObjTitle('');
      setNewObjDesc('');
      setNewObjAssignee('');
      fetchObjectives();
      fetchCalendar();
    } catch (err) {
      console.error('Error creating objective:', err);
    }
  };

  const handleUpdateProgress = async (id: string, newProgress: number) => {
    try {
      await axios.patch(`/objectives/${id}`, { progress: newProgress });
      fetchObjectives();
    } catch (err) {
      console.error('Error updating progress:', err);
    }
  };

  const handleVerifyObjective = async (id: string) => {
    try {
      await axios.post(`/objectives/${id}/verify`);
      fetchObjectives();
    } catch (err) {
      console.error('Error verifying objective:', err);
    }
  };

  const handleSignupCrusade = async (crusadeId: string) => {
    try {
      await axios.post(`/crusades/${crusadeId}/signup`, {
        ship_brought: signupShip || 'Nave Consagrada',
        role_assigned: signupRole,
      });
      fetchCrusades();
      if (selectedCrusade?.id === crusadeId) {
        const res = await axios.get(`/crusades/${crusadeId}`);
        setSelectedCrusade(res.data);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al responder al llamado');
    }
  };

  const handleLeaveCrusade = async (crusadeId: string) => {
    try {
      await axios.delete(`/crusades/${crusadeId}/signup`);
      fetchCrusades();
      if (selectedCrusade?.id === crusadeId) {
        const res = await axios.get(`/crusades/${crusadeId}`);
        setSelectedCrusade(res.data);
      }
    } catch (err) {
      console.error('Error leaving crusade:', err);
    }
  };

  const handleCreateCrusade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!crusadeTitle || !crusadeDate || !crusadeLocation) return;

    const shipsArray = crusadeShips
      ? crusadeShips
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : ['Contingente del Vacío'];

    const ritualBriefing =
      crusadeBriefing ||
      `Por decreto de ${user?.rank?.title || 'los Profetas de la Ruina'}, se ordena ${crusadeTitle} en ${crusadeLocation}. El incumplimiento es una ofensa contra el Abismo. La recompensa: la Marca del Abismo. El costo del fracaso: el silencio. IN NOMINI OBLIVIONIS.`;

    try {
      await axios.post('/crusades', {
        title: crusadeTitle,
        description: crusadeDesc,
        briefing: ritualBriefing,
        location: crusadeLocation,
        operation_date: crusadeDate,
        ships_required: shipsArray,
      });
      setShowCreateCrusade(false);
      setCrusadeTitle('');
      setCrusadeDesc('');
      setCrusadeBriefing('');
      fetchCrusades();
      fetchCalendar();
    } catch (err) {
      console.error('Error creating crusade:', err);
    }
  };

  const loadCrusadeDetails = async (id: string) => {
    try {
      const res = await axios.get(`/crusades/${id}`);
      setSelectedCrusade(res.data);
    } catch (err) {
      console.error('Error loading crusade details:', err);
    }
  };

  const filteredObjectives = objectives.filter((obj) => {
    if (scopeFilter === 'org') return obj.scope === 'org';
    if (scopeFilter === 'mine') return obj.assigned_to === user?.id || obj.creator_id === user?.id;
    return true;
  });

  return (
    <div style={{ padding: '0 2rem 5rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Hero Header */}
      <div style={{ textAlign: 'center', marginBottom: '2.2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', marginBottom: '0.5rem' }}>
          <DragonIcon size={32} />
          <h1
            style={{
              fontFamily: 'var(--cinzel-font)',
              color: 'var(--secondary)',
              fontSize: '2.4rem',
              letterSpacing: '5px',
              margin: 0,
            }}
          >
            EDICTOS SAGRADOS
          </h1>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.02rem', margin: '0 auto 1rem', maxWidth: '820px', fontFamily: 'var(--body-font)' }}>
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

      {/* Tabs navigation */}
      <div
        className="glass-card"
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '1rem',
          padding: '0.6rem',
          marginBottom: '2.5rem',
          borderBottom: '2px solid rgba(212, 175, 55, 0.2)',
          flexWrap: 'wrap',
        }}
      >
        <button
          className={`filter-btn ${activeTab === 'designios' ? 'active' : ''}`}
          onClick={() => setActiveTab('designios')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', padding: '0.7rem 1.6rem' }}
        >
          <Target size={16} />
          <span>DESIGNIOS DE LA FLOTA</span>
        </button>

        <button
          className={`filter-btn ${activeTab === 'cruzadas' ? 'active' : ''}`}
          onClick={() => setActiveTab('cruzadas')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', padding: '0.7rem 1.6rem' }}
        >
          <Rocket size={16} />
          <span>EDICTOS DE CRUZADA</span>
        </button>

        <button
          className={`filter-btn ${activeTab === 'calendario' ? 'active' : ''}`}
          onClick={() => setActiveTab('calendario')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', padding: '0.7rem 1.6rem' }}
        >
          <CalendarIcon size={16} />
          <span>CALENDARIO ABISAL (CICLO 2956)</span>
        </button>
      </div>

      {/* Restricted Warning if visitor/pending */}
      {!isApproved && (
        <div
          className="glass-card"
          style={{
            textAlign: 'center',
            padding: '3rem 2rem',
            borderTop: '3px solid var(--primary)',
            maxWidth: '650px',
            margin: '0 auto',
          }}
        >
          <AlertCircle size={44} style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
          <h2 style={{ fontFamily: 'var(--cinzel-font)', color: 'var(--secondary)', fontSize: '1.4rem', margin: '0 0 0.8rem' }}>
            SELLADO ANTE LOS NO INICIADOS
          </h2>
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, margin: '0 0 1.5rem' }}>
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
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {(['all', 'org', 'mine'] as const).map((sc) => (
                <button
                  key={sc}
                  className={`filter-btn ${scopeFilter === sc ? 'active' : ''}`}
                  onClick={() => setScopeFilter(sc)}
                  style={{ fontSize: '0.75rem', padding: '0.4rem 1rem' }}
                >
                  {sc === 'all' ? 'TODOS LOS DESIGNIOS' : sc === 'org' ? 'DE LA FLOTA' : 'MIS ENCOMIENDAS'}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowCreateObjective(!showCreateObjective)}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', padding: '0.6rem 1.2rem' }}
            >
              <Plus size={16} />
              PROCLAMAR NUEVO DESIGNIO
            </button>
          </div>

          {/* Modal / Inline form for creating objective */}
          <AnimatePresence>
            {showCreateObjective && (
              <motion.form
                initial={{ opacity: 0, y: -15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                onSubmit={handleCreateObjective}
                className="glass-card"
                style={{ padding: '1.5rem', marginBottom: '2rem', borderLeft: '4px solid var(--secondary)' }}
              >
                <h3 style={{ fontFamily: 'var(--cinzel-font)', color: 'var(--secondary)', margin: '0 0 1rem', fontSize: '1.1rem' }}>
                  PROCLAMAR UN DESIGNIO SAGRADO
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--secondary)', display: 'block', marginBottom: '0.3rem' }}>TÍTULO DEL DECRETO</label>
                    <input
                      type="text"
                      className="search-input"
                      placeholder="Ej. Acopio de RMC para la Polaris"
                      value={newObjTitle}
                      onChange={(e) => setNewObjTitle(e.target.value)}
                      required
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--secondary)', display: 'block', marginBottom: '0.3rem' }}>ALCANCE</label>
                    <select
                      className="select-filter"
                      value={newObjScope}
                      onChange={(e: any) => setNewObjScope(e.target.value)}
                      style={{ width: '100%', padding: '0.6rem', background: '#000', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      <option value="org">Designio de toda la Flota</option>
                      <option value="cargo">Designio de Escuadrón / Rango</option>
                      <option value="individual">Encomienda Individual</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--secondary)', display: 'block', marginBottom: '0.3rem' }}>
                      ENCOMENDAR A HERMANO (ROSTER)
                    </label>
                    <select
                      className="select-filter"
                      value={newObjAssignee}
                      onChange={(e) => setNewObjAssignee(e.target.value)}
                      style={{ width: '100%', padding: '0.6rem', background: '#000', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
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
                    <label style={{ fontSize: '0.75rem', color: 'var(--secondary)', display: 'block', marginBottom: '0.3rem' }}>DOCTRINA</label>
                    <select
                      className="select-filter"
                      value={newObjCategory}
                      onChange={(e: any) => setNewObjCategory(e.target.value)}
                      style={{ width: '100%', padding: '0.6rem', background: '#000', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      <option value="recoleccion">Acopio de Ofrendas</option>
                      <option value="combate">Purga de Los Custodios del Orden</option>
                      <option value="forja">Forja de Tecnomilagros</option>
                      <option value="ascenso">Ritual de Ascenso</option>
                      <option value="general">Campaña del Vacío</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--secondary)', display: 'block', marginBottom: '0.3rem' }}>LÍMITE DEL CICLO (OPCIONAL)</label>
                    <input
                      type="date"
                      className="search-input"
                      value={newObjDate}
                      onChange={(e) => setNewObjDate(e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--secondary)', display: 'block', marginBottom: '0.3rem' }}>MANDATO LITÚRGICO Y TÁCTICO</label>
                  <textarea
                    rows={2}
                    className="search-input"
                    placeholder="Por decreto del Concilio del Vacío, se ordena..."
                    value={newObjDesc}
                    onChange={(e) => setNewObjDesc(e.target.value)}
                    style={{ width: '100%' }}
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

          {/* Objectives Grid */}
          {loadingObjectives ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--secondary)', fontFamily: 'var(--cinzel-font)' }}>
              CONSULTANDO LOS DESIGNIOS DEL VACÍO...
            </div>
          ) : filteredObjectives.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
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
                    className="glass-card"
                    style={{
                      padding: '1.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.8rem',
                      borderTop: `3px solid ${isCompleted ? '#22c55e' : isAbandoned ? '#6b7280' : 'var(--secondary)'}`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#22c55e', fontSize: '0.72rem', fontWeight: 'bold', fontFamily: 'var(--cinzel-font)' }}>
                          <CheckCircle size={14} /> MARCA DEL ABISMO
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 'bold' }}>
                          {obj.progress}%
                        </span>
                      )}
                    </div>

                    <h3 style={{ margin: 0, fontFamily: 'var(--cinzel-font)', fontSize: '1.1rem', color: 'var(--text-main)' }}>
                      {obj.title}
                    </h3>

                    {obj.description && (
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, flex: 1 }}>
                        {obj.description}
                      </p>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', flexWrap: 'wrap', gap: '0.4rem' }}>
                      <span>
                        Encomendado a:{' '}
                        <strong style={{ color: 'var(--secondary)' }}>{obj.assignee_name || 'Toda la Flota'}</strong>
                      </span>
                      {obj.due_date && (
                        <span>Límite: {formatAbyssalDate(obj.due_date, { prefixCycle: true })}</span>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${obj.progress}%`,
                          height: '100%',
                          background: isCompleted ? '#22c55e' : 'linear-gradient(to right, var(--primary), var(--secondary))',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>

                    {/* Quick progress actions */}
                    {!isCompleted && (
                      <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem' }}>
                        {[25, 50, 75, 100].map((step) => (
                          <button
                            key={step}
                            className="btn-secondary"
                            style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem', flex: 1 }}
                            onClick={() => handleUpdateProgress(obj.id, step)}
                          >
                            {step}%
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Council Verification Button */}
                    {isOfficerOrCouncil && !isCompleted && obj.progress >= 100 && (
                      <button
                        className="btn-primary"
                        onClick={() => handleVerifyObjective(obj.id)}
                        style={{
                          fontSize: '0.72rem',
                          padding: '0.45rem',
                          marginTop: '0.4rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.4rem',
                        }}
                      >
                        <Shield size={14} /> OTORGAR LA MARCA DEL ABISMO (CONCILIO)
                      </button>
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
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 style={{ fontFamily: 'var(--cinzel-font)', color: 'var(--secondary)', fontSize: '1.3rem', margin: 0 }}>
              EDICTOS DE SANGRE Y OPERACIONES CONVOCADAS
            </h2>

            {isOfficerOrCouncil && (
              <button
                onClick={() => setShowCreateCrusade(!showCreateCrusade)}
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', padding: '0.6rem 1.2rem' }}
              >
                <Flame size={16} />
                PROCLAMAR EDICTO DE CRUZADA
              </button>
            )}
          </div>

          {/* New Crusade Form Modal */}
          <AnimatePresence>
            {showCreateCrusade && (
              <motion.form
                initial={{ opacity: 0, y: -15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                onSubmit={handleCreateCrusade}
                className="glass-card"
                style={{ padding: '1.5rem', marginBottom: '2rem', borderLeft: '4px solid var(--primary)' }}
              >
                <h3 style={{ fontFamily: 'var(--cinzel-font)', color: 'var(--primary)', margin: '0 0 1rem', fontSize: '1.1rem' }}>
                  PROCLAMACIÓN RITUAL DE EDICTO DE SANGRE
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--secondary)', display: 'block', marginBottom: '0.3rem' }}>NOMBRE DEL EDICTO</label>
                    <input
                      type="text"
                      className="search-input"
                      placeholder="Ej. Edicto de Sangre: Cenizas de Pyro"
                      value={crusadeTitle}
                      onChange={(e) => setCrusadeTitle(e.target.value)}
                      required
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--secondary)', display: 'block', marginBottom: '0.3rem' }}>TEATRO DEL VACÍO (UBICACIÓN)</label>
                    <input
                      type="text"
                      className="search-input"
                      placeholder="Ej. Pyro VI — Ruin Station"
                      value={crusadeLocation}
                      onChange={(e) => setCrusadeLocation(e.target.value)}
                      required
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--secondary)', display: 'block', marginBottom: '0.3rem' }}>CICLO Y HORA DE SALTO (UTC)</label>
                    <input
                      type="datetime-local"
                      className="search-input"
                      value={crusadeDate}
                      onChange={(e) => setCrusadeDate(e.target.value)}
                      required
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--secondary)', display: 'block', marginBottom: '0.3rem' }}>FLOTA REQUERIDA (SEPARADA POR COMAS)</label>
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Ej. Polaris, Hammerhead, Eclipse, Cutlass Red"
                    value={crusadeShips}
                    onChange={(e) => setCrusadeShips(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--secondary)', display: 'block', marginBottom: '0.3rem' }}>
                    DECRETO DEL CONCILIO DEL VACÍO (SI SE OMITE, SE GENERA CON LA FÓRMULA RITUAL)
                  </label>
                  <textarea
                    rows={3}
                    className="search-input"
                    placeholder="Por decreto de los Profetas de la Ruina, se ordena..."
                    value={crusadeBriefing}
                    onChange={(e) => setCrusadeBriefing(e.target.value)}
                    style={{ width: '100%' }}
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

          {/* Crusades Cards */}
          {loadingCrusades ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--secondary)', fontFamily: 'var(--cinzel-font)' }}>
              CONSULTANDO EXPEDIENTES DE GUERRA...
            </div>
          ) : crusades.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              No hay Edictos de Cruzada activos en este ciclo.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {crusades.map((c) => {
                return (
                  <div
                    key={c.id}
                    className="glass-card"
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
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
                            {c.status === 'victoriosa' ? 'MARCA DEL ABISMO' : c.status}
                          </span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <MapPin size={13} /> {c.location}
                          </span>
                        </div>

                        <h3 style={{ margin: 0, fontFamily: 'var(--cinzel-font)', fontSize: '1.3rem', color: 'var(--text-main)' }}>
                          {c.title}
                        </h3>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--cinzel-font)' }}>CICLO DE SALTO</div>
                        <div style={{ fontSize: '1.02rem', color: 'var(--secondary)', fontWeight: 'bold' }}>
                          {formatAbyssalDate(c.operation_date, { includeTime: true, prefixCycle: true })}
                        </div>
                      </div>
                    </div>

                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                      {c.briefing || c.description}
                    </p>

                    {/* Fleet requirements */}
                    {c.ships_required && c.ships_required.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.75rem' }}>
                        <span style={{ color: 'var(--secondary)', fontFamily: 'var(--cinzel-font)' }}>CONTINGENTE DE NAVES:</span>
                        {c.ships_required.map((ship, idx) => (
                          <span
                            key={idx}
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

                    {/* Participation bar */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderTop: '1px solid rgba(255,255,255,0.05)',
                        paddingTop: '1rem',
                        marginTop: '0.5rem',
                        flexWrap: 'wrap',
                        gap: '1rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <User size={16} color="var(--secondary)" />
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          Juramentados:{' '}
                          <strong style={{ color: 'var(--text-main)' }}>
                            {c.signups_count} / {c.max_brothers} hermanos
                          </strong>
                        </span>
                        <button
                          className="btn-secondary"
                          style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', marginLeft: '0.5rem' }}
                          onClick={() => loadCrusadeDetails(c.id)}
                        >
                          VER ESCUADRÓN
                        </button>
                      </div>

                      <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                        {c.user_is_signed ? (
                          <button
                            className="btn-secondary"
                            style={{ borderColor: 'rgba(255,68,68,0.4)', color: '#ff6666', fontSize: '0.75rem' }}
                            onClick={() => handleLeaveCrusade(c.id)}
                          >
                            APARTARSE (RIESGO DE LA CENIZA FRÍA)
                          </button>
                        ) : (
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            <input
                              type="text"
                              className="search-input"
                              placeholder="Tu nave (ej. Aegis Eclipse)"
                              value={signupShip}
                              onChange={(e) => setSignupShip(e.target.value)}
                              style={{ width: '165px', padding: '0.4rem 0.7rem', fontSize: '0.75rem' }}
                            />
                            <select
                              className="select-filter"
                              value={signupRole}
                              onChange={(e) => setSignupRole(e.target.value)}
                              style={{ padding: '0.4rem 0.5rem', fontSize: '0.75rem', background: '#000', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
                            >
                              <option value="Voz de Escuadrón">Voz de Escuadrón</option>
                              <option value="Vanguardia de Ceniza">Vanguardia de Ceniza</option>
                              <option value="Artillero Abisal">Artillero Abisal</option>
                              <option value="Asalto EVA">Asalto EVA</option>
                              <option value="Soporte Litúrgico">Soporte Litúrgico</option>
                            </select>
                            <button
                              className="btn-primary"
                              style={{ fontSize: '0.75rem', padding: '0.5rem 1rem' }}
                              onClick={() => handleSignupCrusade(c.id)}
                            >
                              JURAR SANGRE Y NAVE
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Roster detail if loaded */}
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
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.6rem' }}>
                            {selectedCrusade.roster.map((member: any) => (
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
                                  alt=""
                                  style={{ width: '28px', height: '28px', borderRadius: '50%' }}
                                />
                                <div>
                                  <div style={{ fontSize: '0.82rem', fontWeight: 'bold', color: 'var(--text-main)' }}>
                                    {member.display_name}
                                  </div>
                                  <div style={{ fontSize: '0.68rem', color: 'var(--secondary)' }}>
                                    {member.ship_brought || 'Nave Consagrada'} · {member.role_assigned}
                                  </div>
                                </div>
                              </div>
                            ))}
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
        <div className="glass-card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.5rem' }}>
            <CalendarIcon size={24} color="var(--secondary)" />
            <h2 style={{ fontFamily: 'var(--cinzel-font)', color: 'var(--secondary)', fontSize: '1.3rem', margin: 0 }}>
              CRONOGRAMA SAGRADO DE OPERACIONES — CICLO 2956
            </h2>
          </div>

          {calendarEvents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              No hay hitos registrados en el Calendario Abisal.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {calendarEvents.map((evt) => {
                const date = new Date(evt.start_date);
                const abyssalYear = toAbyssalYear(date.getFullYear());
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
                      borderLeft: `3px solid ${isCrusade ? 'var(--primary)' : isConclave ? '#9b59b6' : 'var(--secondary)'}`,
                    }}
                  >
                    <div style={{ textAlign: 'center', minWidth: '85px' }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--secondary)', fontFamily: 'var(--cinzel-font)' }}>
                        {date.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase()} {abyssalYear}
                      </div>
                      <div style={{ fontSize: '1.45rem', fontWeight: 900, color: 'var(--text-main)', lineHeight: 1.1 }}>
                        {date.getDate()}
                      </div>
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.2rem' }}>
                        <span
                          style={{
                            fontSize: '0.6rem',
                            padding: '0.1rem 0.4rem',
                            borderRadius: '2px',
                            background: isCrusade ? 'rgba(196,30,58,0.2)' : isConclave ? 'rgba(155,89,182,0.2)' : 'rgba(212,175,55,0.2)',
                            color: isCrusade ? 'var(--primary)' : isConclave ? '#c084fc' : 'var(--secondary)',
                            textTransform: 'uppercase',
                            fontFamily: 'var(--cinzel-font)',
                          }}
                        >
                          {isCrusade ? 'EDICTO DE SANGRE' : isConclave ? 'CONCILIO DEL VACÍO' : 'DESIGNIO'}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{evt.location}</span>
                      </div>
                      <h4 style={{ margin: 0, fontFamily: 'var(--cinzel-font)', fontSize: '1rem', color: 'var(--text-main)' }}>
                        {evt.title}
                      </h4>
                    </div>

                    <div style={{ fontSize: '0.82rem', color: 'var(--secondary)', fontFamily: 'var(--cinzel-font)' }}>
                      {formatAbyssalDate(evt.start_date, { includeTime: true })}
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

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Shield,
  Layers,
  Edit3,
  Save,
  Check,
  X,
  Target,
  Award,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAltar } from '../context/AltarContext';
import { Link } from 'react-router-dom';
import { formatAbyssalDate } from '../utils/abyssalDate';
import type { Objective } from '../types';

const CANONICAL_RANKS = [
  { id: 'sombras', name: 'Sombras del Umbral', archetype: 'El Neófito Hambriento', lvl: 1, color: '#6b7280' },
  { id: 'iniciados', name: 'Iniciados del Vacío', archetype: 'El Converso', lvl: 2, color: '#8b0000' },
  { id: 'portadores', name: 'Portadores de Ceniza', archetype: 'El Veterano Silencioso', lvl: 3, color: '#b8860b' },
  { id: 'voces', name: 'Voces del Abismo', archetype: 'El Filósofo-Guerrero', lvl: 4, color: '#c41e3a' },
  { id: 'profetas', name: 'Profetas de la Ruina', archetype: 'El Estratega Oscuro', lvl: 5, color: '#9b59b6' },
  { id: 'heraldo', name: 'Heraldo de Ancalagon', archetype: 'La Voz del Dragón', lvl: 6, color: '#d4af37' },
];

export const BrotherProfile: React.FC = () => {
  const { user, updateProfile, refreshUser } = useAuth();
  const { cart } = useAltar();

  const [isEditing, setIsEditing] = useState(false);
  const [rsiHandle, setRsiHandle] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [specialtyInput, setSpecialtyInput] = useState('');

  const [activeTab, setActiveTab] = useState<'expediente' | 'altar' | 'consejo'>('expediente');
  const [myObjectives, setMyObjectives] = useState<Objective[]>([]);
  const [allCouncilUsers, setAllCouncilUsers] = useState<any[]>([]);
  const [loadingCouncil, setLoadingCouncil] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editRankId, setEditRankId] = useState<string>('sombras');
  const [editCargo, setEditCargo] = useState<string>('');

  const isCouncil = user && ['consejo', 'admin'].includes(user.role);
  const isApproved = user && user.status === 'approved';

  useEffect(() => {
    if (user) {
      setRsiHandle(user.rsi_handle || '');
      setDisplayName(user.display_name || '');
      setBio(user.bio || '');
      setSpecialties(user.specialties || []);
    }
  }, [user]);

  const fetchMyObjectives = async () => {
    if (!user || !isApproved) return;
    try {
      const res = await axios.get(`/objectives?assigned_to=${user.id}`);
      setMyObjectives(res.data);
    } catch (err) {
      console.error('Error fetching personal objectives:', err);
    }
  };

  const fetchCouncilUsers = async () => {
    if (!isCouncil) return;
    setLoadingCouncil(true);
    try {
      const res = await axios.get('/council/users');
      setAllCouncilUsers(res.data);
    } catch (err) {
      console.error('Error fetching council users:', err);
    } finally {
      setLoadingCouncil(false);
    }
  };

  useEffect(() => {
    fetchMyObjectives();
    if (isCouncil) {
      fetchCouncilUsers();
    }
  }, [user?.id, isCouncil]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile({
        rsi_handle: rsiHandle,
        display_name: displayName,
        bio,
        specialties,
      });
      setIsEditing(false);
    } catch (err) {
      console.error('Error saving profile:', err);
    }
  };

  const handleAddSpecialty = () => {
    if (specialtyInput.trim() && !specialties.includes(specialtyInput.trim())) {
      setSpecialties([...specialties, specialtyInput.trim()]);
      setSpecialtyInput('');
    }
  };

  const handleRemoveSpecialty = (sp: string) => {
    setSpecialties(specialties.filter((s) => s !== sp));
  };

  const handleUpdateMyObjectiveProgress = async (objId: string, progress: number) => {
    try {
      await axios.patch(`/objectives/${objId}`, { progress });
      fetchMyObjectives();
    } catch (err) {
      console.error('Error updating objective progress:', err);
    }
  };

  const handleApproveBrother = async (userId: string) => {
    try {
      const res = await axios.post(`/council/users/${userId}/approve`);
      alert(res.data.message || 'Hermano consagrado en el Umbral');
      fetchCouncilUsers();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al consagrar candidato');
    }
  };

  const handleRejectBrother = async (userId: string) => {
    if (!confirm('¿Arrojar a este candidato a La Ceniza Fría?')) return;
    try {
      await axios.post(`/council/users/${userId}/reject`);
      fetchCouncilUsers();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al rechazar candidato');
    }
  };

  const handlePromoteMember = async (memberId: string) => {
    try {
      await axios.patch(`/council/users/${memberId}/promote`, {
        rank_id: editRankId,
        cargo: editCargo,
      });
      setEditingMemberId(null);
      await fetchCouncilUsers();
      if (memberId === user?.id) {
        await refreshUser();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al actualizar rango y cargo');
    }
  };

  if (!user) {
    return (
      <div style={{ padding: '5rem 2rem', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--cinzel-font)', color: 'var(--secondary)' }}>
          DEBES CRUZAR EL UMBRAL PARA ACCEDER A TU EXPEDIENTE SAGRADO
        </h2>
        <p style={{ color: 'var(--text-muted)' }}>Identifícate ante el Concilio del Vacío.</p>
      </div>
    );
  }

  const rankColor = user.rank?.color || 'var(--secondary)';
  const pendingUsers = allCouncilUsers.filter((u) => u.status === 'pending');
  const activeRoster = allCouncilUsers.filter((u) => u.status === 'approved');

  return (
    <div style={{ padding: '0 2rem 5rem', maxWidth: '1150px', margin: '0 auto' }}>
      {/* Top Banner with Rank */}
      <div
        className="glass-card"
        style={{
          padding: '2.5rem',
          marginBottom: '2rem',
          borderTop: `4px solid ${rankColor}`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <img
              src={user.discord_avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}
              alt={user.display_name}
              style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                border: `3px solid ${rankColor}`,
                boxShadow: `0 0 25px ${rankColor}40`,
              }}
            />
          </div>

          <div style={{ flex: 1, minWidth: '260px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.8rem',
                flexWrap: 'wrap',
                marginBottom: '0.4rem',
              }}
            >
              <h1 style={{ margin: 0, fontFamily: 'var(--cinzel-font)', fontSize: '2rem', color: 'var(--text-main)' }}>
                {user.display_name}
              </h1>

              <span
                style={{
                  padding: '0.2rem 0.8rem',
                  borderRadius: '4px',
                  background: `${rankColor}20`,
                  color: rankColor,
                  border: `1px solid ${rankColor}60`,
                  fontFamily: 'var(--cinzel-font)',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  letterSpacing: '1px',
                }}
              >
                {user.rank?.title || user.rank?.name || 'Sombras del Umbral'}
              </span>

              {user.status === 'pending' && (
                <span
                  style={{
                    padding: '0.2rem 0.6rem',
                    borderRadius: '4px',
                    background: 'rgba(255,165,0,0.15)',
                    color: '#ffa500',
                    border: '1px solid #ffa500',
                    fontSize: '0.7rem',
                  }}
                >
                  AGUARDANDO EL RITUAL DE INICIACIÓN
                </span>
              )}
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1.5rem',
                flexWrap: 'wrap',
                fontSize: '0.9rem',
                color: 'var(--text-muted)',
              }}
            >
              <div>
                Designación Litúrgica:{' '}
                <strong style={{ color: 'var(--secondary)' }}>{user.cargo || 'Hermano del Umbral'}</strong>
              </div>
              <div>
                Handle RSI: <strong style={{ color: 'var(--accent-cyan)' }}>{user.rsi_handle || 'Sin vincular'}</strong>
              </div>
              <div>
                Consagrado en: <strong>{formatAbyssalDate(user.created_at, { prefixCycle: true })}</strong>
              </div>
            </div>
          </div>

          <div>
            {!isEditing && (
              <button
                className="btn-secondary"
                onClick={() => setIsEditing(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}
              >
                <Edit3 size={15} />
                EDITAR EXPEDIENTE
              </button>
            )}
          </div>
        </div>

        {/* Edit Form */}
        {isEditing && (
          <form
            onSubmit={handleSaveProfile}
            style={{
              marginTop: '2rem',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              paddingTop: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--secondary)', display: 'block', marginBottom: '0.3rem' }}>
                  NOMBRE EN EL REGISTRO SAGRADO
                </label>
                <input
                  type="text"
                  className="search-input"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--secondary)', display: 'block', marginBottom: '0.3rem' }}>
                  HANDLE DE STAR CITIZEN (RSI)
                </label>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Ej. Quaker"
                  value={rsiHandle}
                  onChange={(e) => setRsiHandle(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--secondary)', display: 'block', marginBottom: '0.3rem' }}>
                CRÓNICA EN EL VACÍO (BIOGRAFÍA)
              </label>
              <textarea
                rows={2}
                className="search-input"
                placeholder="Deja testimonio de tu senda hacia el Quiebre..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--secondary)', display: 'block', marginBottom: '0.3rem' }}>
                DOCTRINAS DE GUERRA Y LOGÍSTICA
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Ej. Asedio Capital, Forja Abisal, Extracción en Fisuras"
                  value={specialtyInput}
                  onChange={(e) => setSpecialtyInput(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button type="button" className="btn-secondary" onClick={handleAddSpecialty} style={{ fontSize: '0.75rem' }}>
                  INSCRIBIR
                </button>
              </div>

              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {specialties.map((sp) => (
                  <span
                    key={sp}
                    style={{
                      padding: '0.2rem 0.6rem',
                      background: 'rgba(255,255,255,0.06)',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    {sp}
                    <X size={12} style={{ cursor: 'pointer' }} onClick={() => handleRemoveSpecialty(sp)} />
                  </span>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem', marginTop: '0.5rem' }}>
              <button type="button" className="btn-secondary" onClick={() => setIsEditing(false)} style={{ fontSize: '0.8rem' }}>
                CANCELAR
              </button>
              <button
                type="submit"
                className="btn-primary"
                style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Save size={14} /> SELLAR EXPEDIENTE
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Tabs */}
      <div
        className="glass-card"
        style={{
          display: 'flex',
          gap: '1rem',
          padding: '0.6rem',
          marginBottom: '2rem',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}
      >
        <button
          className={`filter-btn ${activeTab === 'expediente' ? 'active' : ''}`}
          onClick={() => setActiveTab('expediente')}
          style={{ fontSize: '0.85rem', padding: '0.6rem 1.4rem' }}
        >
          ESCALA DEL ABISMO & DESIGNIOS ({myObjectives.length})
        </button>

        <button
          className={`filter-btn ${activeTab === 'altar' ? 'active' : ''}`}
          onClick={() => setActiveTab('altar')}
          style={{ fontSize: '0.85rem', padding: '0.6rem 1.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <Layers size={15} />
          ALTAR CONSAGRADO ({cart.length})
        </button>

        {isCouncil && (
          <button
            className={`filter-btn ${activeTab === 'consejo' ? 'active' : ''}`}
            onClick={() => setActiveTab('consejo')}
            style={{
              fontSize: '0.85rem',
              padding: '0.6rem 1.4rem',
              borderColor: 'var(--secondary)',
              color: 'var(--secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <Shield size={15} />
            CONCILIO DEL VACÍO ({pendingUsers.length} en el Umbral · {activeRoster.length} Consagrados)
          </button>
        )}
      </div>

      {/* TAB 1: ESCALA DEL ABISMO & MIS DESIGNIOS */}
      {activeTab === 'expediente' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.8rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
            <div className="glass-card" style={{ padding: '2rem' }}>
              <h3 style={{ fontFamily: 'var(--cinzel-font)', color: 'var(--secondary)', fontSize: '1.2rem', margin: '0 0 0.8rem' }}>
                LA ESCALA DEL ABISMO
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: '1.4rem' }}>
                Los 6 peldaños sagrados del <em>Codex Oblivionis</em>. Cada ascenso exige la Marca del Abismo y el
                reconocimiento del Concilio del Vacío.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                {CANONICAL_RANKS.map((r) => {
                  const isCurrent = user.rank?.level === r.lvl;
                  const isPassed = (user.rank?.level ?? 0) >= r.lvl;

                  return (
                    <div
                      key={r.lvl}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem 1rem',
                        background: isCurrent ? `${r.color}20` : 'rgba(0,0,0,0.3)',
                        borderRadius: '4px',
                        borderLeft: `4px solid ${r.color}`,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: '0.88rem',
                            color: isPassed ? 'var(--text-main)' : 'var(--text-muted)',
                            fontWeight: isCurrent ? 'bold' : 'normal',
                          }}
                        >
                          {r.lvl}. {r.name}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          {r.archetype}
                        </div>
                      </div>
                      {isCurrent && (
                        <span
                          style={{
                            fontSize: '0.68rem',
                            color: r.color,
                            fontFamily: 'var(--cinzel-font)',
                            fontWeight: 'bold',
                            letterSpacing: '1px',
                          }}
                        >
                          PELDAÑO ACTUAL
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontFamily: 'var(--cinzel-font)', color: 'var(--secondary)', fontSize: '1.2rem', margin: '0 0 1rem' }}>
                  DOCTRINAS DE COMBATE Y LOGÍSTICA
                </h3>
                {user.specialties && user.specialties.length > 0 ? (
                  <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                    {user.specialties.map((s: string) => (
                      <span
                        key={s}
                        style={{
                          padding: '0.4rem 0.8rem',
                          borderRadius: '4px',
                          background: 'rgba(212,175,55,0.1)',
                          color: 'var(--secondary)',
                          border: '1px solid rgba(212,175,55,0.3)',
                          fontSize: '0.85rem',
                        }}
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    Sin doctrinas inscritas. Pulsa en Editar Expediente para registrar tus especialidades.
                  </p>
                )}

                <h3 style={{ fontFamily: 'var(--cinzel-font)', color: 'var(--secondary)', fontSize: '1.2rem', margin: '1.5rem 0 0.8rem' }}>
                  TESTIMONIO EN EL VACÍO
                </h3>
                <p
                  style={{
                    color: 'var(--text-muted)',
                    fontSize: '0.9rem',
                    lineHeight: 1.6,
                    margin: 0,
                    fontStyle: user.bio ? 'normal' : 'italic',
                  }}
                >
                  {user.bio || '«El hermano sirve en silencio mientras el Dragón Negro despierta.»'}
                </p>
              </div>

              <div
                style={{
                  marginTop: '2rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid rgba(212,175,55,0.15)',
                  textAlign: 'right',
                  fontFamily: 'var(--cinzel-font)',
                  fontSize: '0.72rem',
                  letterSpacing: '3px',
                  color: 'var(--secondary)',
                }}
              >
                IN NOMINI OBLIVIONIS
              </div>
            </div>
          </div>

          {/* Mis Designios Asignados */}
          <div className="glass-card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Target size={20} color="var(--secondary)" />
                <h3 style={{ fontFamily: 'var(--cinzel-font)', color: 'var(--secondary)', fontSize: '1.25rem', margin: 0 }}>
                  MIS DESIGNIOS SAGRADOS ENCOMENDADOS ({myObjectives.length})
                </h3>
              </div>
              <Link to="/edictos" className="btn-secondary" style={{ fontSize: '0.78rem', padding: '0.45rem 0.9rem' }}>
                IR A EDICTOS SAGRADOS
              </Link>
            </div>

            {myObjectives.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
                No tienes Designios individuales asignados directamente en este ciclo. Consulta los Designios generales de la
                flota en Edictos.
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                {myObjectives.map((obj) => {
                  const isCompleted = obj.status === 'marca_del_abismo' || obj.status === 'cumplido';
                  return (
                    <div
                      key={obj.id}
                      style={{
                        padding: '1.2rem',
                        background: 'rgba(0,0,0,0.35)',
                        borderRadius: '6px',
                        borderLeft: `3px solid ${isCompleted ? '#10b981' : 'var(--secondary)'}`,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--secondary)', fontFamily: 'var(--cinzel-font)' }}>
                          {obj.category.toUpperCase()}
                        </span>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            color: isCompleted ? '#10b981' : '#f59e0b',
                            fontFamily: 'var(--cinzel-font)',
                            fontWeight: 'bold',
                          }}
                        >
                          {isCompleted ? '☩ MARCA DEL ABISMO' : `${obj.progress}% COMPLETADO`}
                        </span>
                      </div>
                      <div style={{ fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '0.4rem' }}>{obj.title}</div>
                      {obj.description && (
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 0.8rem', lineHeight: 1.5 }}>
                          {obj.description}
                        </p>
                      )}
                      {obj.due_date && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.8rem' }}>
                          Límite del Ciclo: {formatAbyssalDate(obj.due_date, { prefixCycle: true })}
                        </div>
                      )}
                      {!isCompleted && (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            className="btn-secondary"
                            style={{ fontSize: '0.7rem', padding: '0.3rem 0.6rem' }}
                            onClick={() => handleUpdateMyObjectiveProgress(obj.id, Math.min(100, obj.progress + 25))}
                          >
                            +25% AVANCE
                          </button>
                          <button
                            className="btn-primary"
                            style={{ fontSize: '0.7rem', padding: '0.3rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                            onClick={() => handleUpdateMyObjectiveProgress(obj.id, 100)}
                          >
                            <Award size={13} /> RECLAMAR MARCA DEL ABISMO
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ALTAR */}
      {activeTab === 'altar' && (
        <div className="glass-card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontFamily: 'var(--cinzel-font)', color: 'var(--secondary)', fontSize: '1.3rem', margin: 0 }}>
              OFRENDAS Y TECNOMILAGROS PERSISTENTES EN EL ALTAR
            </h3>
            <Link to="/altar" className="btn-primary" style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}>
              ABRIR ALTAR DE FORJA
            </Link>
          </div>

          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              No tienes tecnomilagros consagrados en tu Altar de Forja personal.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {cart.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: '1rem',
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: '6px',
                    borderLeft: '3px solid var(--secondary)',
                  }}
                >
                  <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '0.3rem' }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--secondary)' }}>
                    Cantidad consagrada: {item.quantity}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CONCILIO DEL VACÍO (Aprobación de Candidatos + Gestión del Roster Oficial) */}
      {isCouncil && activeTab === 'consejo' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Sección 1: Candidatos en el Umbral */}
          <div className="glass-card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.2rem' }}>
              <Shield size={22} color="var(--secondary)" />
              <h3 style={{ fontFamily: 'var(--cinzel-font)', color: 'var(--secondary)', fontSize: '1.25rem', margin: 0 }}>
                RITUAL DE INICIACIÓN — CANDIDATOS EN EL UMBRAL ({pendingUsers.length})
              </h3>
            </div>

            {loadingCouncil ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--secondary)' }}>
                Consultando los registros del Umbral...
              </div>
            ) : pendingUsers.length === 0 ? (
              <div style={{ padding: '1.5rem', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.25)', borderRadius: '6px' }}>
                Ningún candidato aguarda el Ritual de Iniciación en este ciclo.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {pendingUsers.map((pending) => (
                  <div
                    key={pending.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '1.2rem',
                      background: 'rgba(0,0,0,0.35)',
                      borderRadius: '6px',
                      borderLeft: '3px solid #ffa500',
                      flexWrap: 'wrap',
                      gap: '1rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <img
                        src={pending.discord_avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}
                        alt=""
                        style={{ width: '42px', height: '42px', borderRadius: '50%' }}
                      />
                      <div>
                        <div style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--text-main)' }}>
                          {pending.display_name}{' '}
                          <span style={{ fontSize: '0.8rem', color: '#5865F2' }}>@{pending.discord_username}</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Llegada al Umbral: {formatAbyssalDate(pending.created_at, { includeTime: true, prefixCycle: true })}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.6rem' }}>
                      <button
                        className="btn-secondary"
                        style={{ borderColor: 'rgba(255,68,68,0.4)', color: '#ff6666', fontSize: '0.75rem' }}
                        onClick={() => handleRejectBrother(pending.id)}
                      >
                        LA CENIZA FRÍA (RECHAZAR)
                      </button>
                      <button
                        className="btn-primary"
                        style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                        onClick={() => handleApproveBrother(pending.id)}
                      >
                        <Check size={14} /> CONSAGRAR COMO SOMBRA DEL UMBRAL
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sección 2: Roster Activo y Gestión de La Escala del Abismo */}
          <div className="glass-card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.6rem' }}>
              <Users size={22} color="var(--secondary)" />
              <h3 style={{ fontFamily: 'var(--cinzel-font)', color: 'var(--secondary)', fontSize: '1.25rem', margin: 0 }}>
                REGISTRO OFICIAL DE MIEMBROS DE LA FLOTA ({activeRoster.length})
              </h3>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              El Concilio del Vacío puede ascender hermanos en La Escala del Abismo o reasignar su cargo litúrgico en la
              flota.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              {activeRoster.map((member) => {
                const isEditingMember = editingMemberId === member.id;
                const mColor = member.rank?.color || 'var(--secondary)';
                return (
                  <div
                    key={member.id}
                    style={{
                      padding: '1.1rem 1.3rem',
                      background: 'rgba(0,0,0,0.35)',
                      borderRadius: '6px',
                      borderLeft: `4px solid ${mColor}`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.8rem',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '1rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                            <strong style={{ fontSize: '1.05rem', color: 'var(--text-main)', fontFamily: 'var(--cinzel-font)' }}>
                              {member.display_name}
                            </strong>
                            <span
                              style={{
                                fontSize: '0.7rem',
                                padding: '0.15rem 0.6rem',
                                borderRadius: '4px',
                                background: `${mColor}20`,
                                color: mColor,
                                border: `1px solid ${mColor}50`,
                                fontFamily: 'var(--cinzel-font)',
                              }}
                            >
                              [Nivel {member.rank_level}] {member.rank?.title || member.rank?.name}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                            Cargo: <span style={{ color: 'var(--secondary)' }}>{member.cargo}</span> · RSI:{' '}
                            <span style={{ color: 'var(--accent-cyan)' }}>{member.rsi_handle || member.display_name}</span>
                          </div>
                        </div>
                      </div>

                      {!isEditingMember && (
                        <button
                          className="btn-secondary"
                          style={{ fontSize: '0.72rem', padding: '0.4rem 0.8rem' }}
                          onClick={() => {
                            setEditingMemberId(member.id);
                            setEditRankId(member.rank_id || 'sombras');
                            setEditCargo(member.cargo || '');
                          }}
                        >
                          MODIFICAR RANGO / CARGO
                        </button>
                      )}
                    </div>

                    {isEditingMember && (
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                          gap: '0.8rem',
                          paddingTop: '0.8rem',
                          borderTop: '1px solid rgba(255,255,255,0.08)',
                          alignItems: 'end',
                        }}
                      >
                        <div>
                          <label style={{ fontSize: '0.7rem', color: 'var(--secondary)', display: 'block', marginBottom: '0.3rem' }}>
                            PELDAÑO EN LA ESCALA DEL ABISMO
                          </label>
                          <select
                            className="search-input"
                            value={editRankId}
                            onChange={(e) => setEditRankId(e.target.value)}
                            style={{ width: '100%' }}
                          >
                            {CANONICAL_RANKS.map((cr) => (
                              <option key={cr.id} value={cr.id}>
                                [{cr.lvl}] {cr.name} — {cr.archetype}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label style={{ fontSize: '0.7rem', color: 'var(--secondary)', display: 'block', marginBottom: '0.3rem' }}>
                            DESIGNACIÓN / CARGO EN LA FLOTA
                          </label>
                          <input
                            type="text"
                            className="search-input"
                            value={editCargo}
                            onChange={(e) => setEditCargo(e.target.value)}
                            style={{ width: '100%' }}
                          />
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            type="button"
                            className="btn-primary"
                            style={{ fontSize: '0.75rem', padding: '0.55rem 1rem' }}
                            onClick={() => handlePromoteMember(member.id)}
                          >
                            SELLAR ASCENSO
                          </button>
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ fontSize: '0.75rem', padding: '0.55rem 0.8rem' }}
                            onClick={() => setEditingMemberId(null)}
                          >
                            CANCELAR
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BrotherProfile;

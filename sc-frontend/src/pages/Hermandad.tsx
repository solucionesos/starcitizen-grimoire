import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  Anchor,
  ArrowLeft,
  Compass,
  Crosshair,
  ExternalLink,
  Link2,
  Lock,
  Rocket,
  Search,
  Shield,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { getHermandad, getHermanoByHandle } from '../api/client';
import { DualLabel, TacticalTooltip } from '../components/DualLabel';
import { useToast } from '../components/AbyssalToast';
import DragonIcon from '../components/DragonIcon';
import {
  ESCALA_RANKS,
  HOME_SYSTEMS,
  SHIP_STATUS_META,
  TACTICAL_TOOLTIPS,
  TERMINOLOGY,
  getRankMeta,
} from '../constants/terminology';
import { formatAbyssalDate } from '../utils/abyssalDate';
import type {
  HermandadDirectoryResponse,
  HermandadMemberResponse,
  PublicBrother,
} from '../types';

function extractErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: unknown; message?: unknown } | undefined;
    if (typeof data?.error === 'string' && data.error.trim()) {
      return data.error;
    }
    if (typeof data?.message === 'string' && data.message.trim()) {
      return data.message;
    }
  }
  if (err instanceof Error && err.message.trim()) {
    return err.message;
  }
  return fallback;
}

function getMemberRouteKey(member: PublicBrother): string {
  return encodeURIComponent(member.rsi_handle || member.display_name || member.id);
}

function resolveMemberPyramidRankId(member: PublicBrother): string {
  const resolvedRank = getRankMeta(member.rank_id || member.rank_level);
  return resolvedRank.level === 0 ? 'sombras' : resolvedRank.id;
}

const PYRAMID_RANKS = [...ESCALA_RANKS].reverse();

export const Hermandad: React.FC = () => {
  const { handle } = useParams<{ handle?: string }>();
  const { user, loginWithDiscord } = useAuth();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [directoryData, setDirectoryData] = useState<HermandadDirectoryResponse | null>(null);
  const [dossierData, setDossierData] = useState<HermandadMemberResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadedKey, setLoadedKey] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const userId = user?.id ?? 'anon';
  const userStatus = user?.status ?? 'none';
  const currentKey = `${handle ?? '__dir__'}:${userId}:${userStatus}`;
  const isFetching = loading || loadedKey !== currentKey;

  const queryFilter = searchParams.get('q') ?? '';
  const rawSystemFilter = searchParams.get('system') ?? 'all';
  const systemFilter = (HOME_SYSTEMS as readonly string[]).includes(rawSystemFilter)
    ? rawSystemFilter
    : 'all';
  const rawRankFilter = searchParams.get('rank') ?? 'all';
  const rankFilter = PYRAMID_RANKS.some((r) => r.id === rawRankFilter)
    ? rawRankFilter
    : 'all';

  const updateDirectoryParam = (key: 'q' | 'system' | 'rank', value: string) => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === 'all') {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    setSearchParams(next, { replace: true });
  };

  const clearFilters = () => {
    setSearchParams({}, { replace: true });
  };

  useEffect(() => {
    let cancelled = false;
    const fetchKey = `${handle ?? '__dir__'}:${userId}:${userStatus}`;

    void Promise.resolve().then(async () => {
      if (cancelled) return;
      setLoading(true);
      setNotFound(false);
      setErrorMsg(null);
      setDirectoryData(null);
      setDossierData(null);

      try {
        if (handle) {
          const res = await getHermanoByHandle(handle);
          if (!cancelled) {
            setDossierData(res);
            setDirectoryData(null);
            document.title = `Star Grimoire | ${res.member.display_name} — La Hermandad`;
          }
        } else {
          const res = await getHermandad();
          if (!cancelled) {
            setDirectoryData(res);
            setDossierData(null);
            document.title = 'Star Grimoire | La Hermandad — Ancalagon Oblivion Fleet';
          }
        }
      } catch (err) {
        if (cancelled) return;
        if (handle && axios.isAxiosError(err) && err.response?.status === 404) {
          setNotFound(true);
          setDossierData(null);
          document.title = 'Star Grimoire | Hermano no hallado';
        } else {
          const msg = extractErrorMessage(err, 'No se pudo consultar el registro de La Hermandad.');
          setErrorMsg(msg);
          showToast(msg, 'error');
        }
      } finally {
        if (!cancelled) {
          setLoadedKey(fetchKey);
          setLoading(false);
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [handle, userId, userStatus, showToast]);

  const filteredMembers = useMemo(() => {
    if (!directoryData) return [];
    const q = queryFilter.trim().toLowerCase();

    return directoryData.members.filter((m) => {
      if (systemFilter !== 'all' && (m.home_system || 'Pyro') !== systemFilter) {
        return false;
      }
      if (rankFilter !== 'all' && resolveMemberPyramidRankId(m) !== rankFilter) {
        return false;
      }
      if (!q) return true;

      const haystack = [
        m.display_name,
        m.rsi_handle ?? '',
        m.cargo ?? '',
        m.combat_role ?? '',
        m.home_system ?? '',
        ...(m.specialties ?? []),
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [directoryData, queryFilter, systemFilter, rankFilter]);

  const hasActiveFilters = Boolean(
    queryFilter.trim() || systemFilter !== 'all' || rankFilter !== 'all',
  );

  // ── LOADING STATE ──
  if (isFetching) {
    return (
      <div style={{ padding: '3.5rem 1.5rem', maxWidth: '1150px', margin: '0 auto' }}>
        <div className="surface-monolith" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <p style={{ color: 'var(--secondary)', fontFamily: 'var(--cinzel-font)', margin: 0 }}>
            {handle
              ? 'Descifrando el Dossier del Hermano…'
              : 'Convocando la Escala del Abismo y el Poder Naval…'}
          </p>
        </div>
      </div>
    );
  }

  // ── DOSSIER VIEW (/hermano/:handle) ──
  if (handle) {
    if (notFound || !dossierData) {
      return (
        <div style={{ padding: '2.5rem 1.5rem 5rem', maxWidth: '920px', margin: '0 auto' }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <Link to="/hermandad" className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
              <ArrowLeft size={15} aria-hidden="true" />
              Volver a La Hermandad
            </Link>
          </div>

          <section className="surface-monolith" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
              <DragonIcon size={48} />
            </div>
            <h1 style={{ fontSize: 'clamp(1.35rem, 3vw, 1.9rem)', margin: '0 0 0.75rem', color: 'var(--secondary)' }}>
              {notFound ? 'Hermano no hallado en el Registro Consagrado' : 'Error al consultar Dossier'}
            </h1>
            <h2 className="sr-only">Navegación del Registro</h2>
            <p className="prose-grimoire" style={{ color: 'var(--text-muted)', margin: '0 auto 1.5rem' }}>
              {notFound
                ? `El identificador «${handle}» no corresponde a ningún hermano consagrado actualmente en La Escala del Abismo.`
                : errorMsg || 'No fue posible recuperar la ficha solicitada.'}
            </p>
            <Link to="/hermandad" className="btn-primary">
              Regresar al Directorio de la Flota
            </Link>
          </section>
        </div>
      );
    }

    const { member, is_authenticated_brother } = dossierData;
    const rankMeta = getRankMeta(member.rank_id || member.rank_level);
    const marks = member.abyssal_marks ?? [];
    const showPrivateOpsec =
      is_authenticated_brother &&
      (member.discord_username !== undefined || member.ships !== undefined);
    const memberShips = member.ships ?? [];

    return (
      <div style={{ padding: '1rem 1.5rem 5rem', maxWidth: '1100px', margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
            marginBottom: '1.5rem',
          }}
        >
          <Link to="/hermandad" className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
            <ArrowLeft size={15} aria-hidden="true" />
            Volver a La Hermandad
          </Link>

          <DualLabel
            sacred="Dossier del Hermano"
            tactical="Ficha Pública & Registro OPSEC"
            size="sm"
            inline
          />
        </div>

        {/* Identity Banner */}
        <section
          aria-label={`Expediente de ${member.display_name}`}
          className="surface-monolith"
          style={{
            padding: '2rem',
            marginBottom: '1.5rem',
            borderTop: `4px solid ${rankMeta.cssVar}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.75rem', flexWrap: 'wrap' }}>
            <img
              src={member.discord_avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}
              alt={`Avatar de ${member.display_name}`}
              width={100}
              height={100}
              style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: `3px solid ${rankMeta.cssVar}`,
                boxShadow: `0 0 24px ${rankMeta.color}40`,
                flexShrink: 0,
              }}
            />

            <div style={{ flex: 1, minWidth: '250px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                <h1
                  style={{
                    margin: 0,
                    fontFamily: 'var(--cinzel-font)',
                    fontSize: 'clamp(1.5rem, 3vw, 2.15rem)',
                    letterSpacing: '2px',
                    color: 'var(--text-main)',
                  }}
                >
                  {member.display_name}
                </h1>

                <span
                  className="tabular-nums"
                  style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '4px',
                    background: `${rankMeta.color}22`,
                    color: rankMeta.cssVar,
                    border: `1px solid ${rankMeta.color}70`,
                    fontFamily: 'var(--cinzel-font)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    letterSpacing: '1px',
                  }}
                >
                  [{rankMeta.roman}] {rankMeta.title}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1.25rem',
                  flexWrap: 'wrap',
                  fontSize: '0.92rem',
                  color: 'var(--text-muted)',
                }}
              >
                <div>
                  Cargo Litúrgico: <strong style={{ color: 'var(--secondary)' }}>{member.cargo}</strong>
                </div>

                <div>
                  Handle RSI:{' '}
                  {member.rsi_handle ? (
                    <a
                      href={`https://robertsspaceindustries.com/citizens/${encodeURIComponent(member.rsi_handle)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="accent-rsi hover-underline"
                      translate="no"
                      style={{
                        fontWeight: 700,
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                      }}
                    >
                      {member.rsi_handle}
                      <ExternalLink size={13} aria-hidden="true" />
                    </a>
                  ) : (
                    <span>Sin enlace RSI</span>
                  )}
                </div>

                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Compass size={14} aria-hidden="true" style={{ color: 'var(--secondary)' }} />
                  Sistema: <strong style={{ color: 'var(--text-main)' }}>{member.home_system || 'Pyro'}</strong>
                </div>

                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Crosshair size={14} aria-hidden="true" style={{ color: 'var(--primary)' }} />
                  Rol Táctico: <strong style={{ color: 'var(--text-main)' }}>{member.combat_role || 'Vanguardia'}</strong>
                </div>

                <div>
                  Consagrado en:{' '}
                  <strong className="tabular-nums" style={{ color: 'var(--text-main)' }}>
                    {formatAbyssalDate(member.created_at, { prefixCycle: true })}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Doctrines, Bio & Abyssal Marks */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <section className="surface-monolith" style={{ padding: '1.75rem' }}>
            <div style={{ marginBottom: '1rem' }}>
              <DualLabel
                sacred="Doctrinas y Testimonio"
                tactical="Especialidades & Crónica Personal"
                size="md"
              />
            </div>

            {member.specialties && member.specialties.length > 0 ? (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                {member.specialties.map((sp) => (
                  <span
                    key={sp}
                    style={{
                      padding: '0.3rem 0.7rem',
                      borderRadius: '4px',
                      background: 'rgba(212, 175, 55, 0.1)',
                      color: 'var(--secondary)',
                      border: '1px solid rgba(212, 175, 55, 0.3)',
                      fontSize: '0.84rem',
                    }}
                  >
                    {sp}
                  </span>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                Sin doctrinas tácticas públicas registradas.
              </p>
            )}

            <h2 style={{ fontFamily: 'var(--cinzel-font)', color: 'var(--secondary)', fontSize: '0.95rem', margin: '0 0 0.6rem' }}>
              Testimonio en el Vacío
            </h2>
            <p
              className="prose-grimoire"
              style={{
                color: 'var(--text-muted)',
                fontSize: '0.95rem',
                margin: 0,
                fontStyle: member.bio ? 'normal' : 'italic',
              }}
            >
              {member.bio || '«El hermano sirve en silencio mientras el Dragón Negro despierta.»'}
            </p>
          </section>

          <section className="surface-monolith" style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
              <Sparkles size={19} aria-hidden="true" style={{ color: 'var(--secondary)' }} />
              <TacticalTooltip text={TACTICAL_TOOLTIPS.marca_del_abismo.explanation}>
                <DualLabel
                  sacred={TERMINOLOGY.marcaDelAbismo.sacred}
                  tactical={`${TERMINOLOGY.marcaDelAbismo.tactical} (${marks.length})`}
                  size="md"
                />
              </TacticalTooltip>
            </div>

            {marks.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
                Sin Marcas del Abismo registradas públicamente en este ciclo.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {marks.map((mark) => (
                  <article
                    key={mark.id}
                    style={{
                      padding: '0.95rem 1rem',
                      background: 'rgba(0, 0, 0, 0.32)',
                      borderRadius: '4px',
                      borderLeft: '3px solid var(--secondary)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.35rem' }}>
                      <strong style={{ color: 'var(--secondary)', fontFamily: 'var(--cinzel-font)', fontSize: '0.9rem' }}>
                        ☩ {mark.title}
                      </strong>
                      <span className="tabular-nums" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {formatAbyssalDate(mark.created_at, { prefixCycle: true })}
                      </span>
                    </div>
                    <p className="prose-grimoire" style={{ margin: '0 0 0.4rem', fontSize: '0.86rem', color: 'var(--text-main)' }}>
                      {mark.reason}
                    </p>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                      Sello de: <strong style={{ color: 'var(--accent-silver)' }}>{mark.awarded_by_name || 'Concilio del Vacío'}</strong>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* OPSEC-Gated Discord & Personal Hangar Section */}
        <section className="surface-monolith" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.15rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <Rocket size={20} aria-hidden="true" style={{ color: 'var(--secondary)' }} />
              <DualLabel
                sacred="Hangar Personal & Enlace Discord"
                tactical="Asignación de Naves & Contacto Directo"
                size="md"
              />
            </div>

            <TacticalTooltip text={TACTICAL_TOOLTIPS.opsec_naval.explanation}>
              <span
                style={{
                  padding: '0.22rem 0.65rem',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  border: '1px solid rgba(212, 175, 55, 0.35)',
                  color: showPrivateOpsec ? 'var(--status-ok)' : 'var(--status-warn)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <Lock size={13} aria-hidden="true" />
                {showPrivateOpsec ? 'Velo OPSEC Desbloqueado' : 'Velo Naval (OPSEC) Activo'}
              </span>
            </TacticalTooltip>
          </div>

          {!showPrivateOpsec ? (
            <div
              style={{
                padding: '1.5rem',
                background: 'rgba(0, 0, 0, 0.32)',
                borderRadius: '4px',
                borderLeft: '3px solid var(--status-warn)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1.25rem',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <p style={{ margin: '0 0 0.35rem', color: 'var(--text-main)', fontWeight: 700 }}>
                  Inteligencia de Hangar Individual sellada por OPSEC — Inicia sesión como Hermano Consagrado para ver
                  asignaciones y contacto Discord.
                </p>
                <p className="prose-grimoire" style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-muted)' }}>
                  El inventario consolidado de la flota es público en La Hermandad, pero la relación propietario ↔ nave
                  y las comunicaciones privadas permanecen protegidas.
                </p>
              </div>
              {!user ? (
                <button type="button" className="btn-primary" onClick={loginWithDiscord}>
                  {TERMINOLOGY.cruzarUmbral.sacred}
                </button>
              ) : (
                <Link to="/hermano" className="btn-secondary">
                  Ver Mi Expediente
                </Link>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div
                style={{
                  padding: '0.9rem 1.1rem',
                  background: 'rgba(0, 0, 0, 0.3)',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  flexWrap: 'wrap',
                }}
              >
                <Link2 size={16} aria-hidden="true" style={{ color: 'var(--secondary)' }} />
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Contacto Discord:</span>
                {member.is_discord_linked && member.discord_username ? (
                  <strong className="status-ok" translate="no">
                    @{member.discord_username}
                  </strong>
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>Sin cuenta de Discord vinculada</span>
                )}
              </div>

              {memberShips.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.92rem' }}>
                  Este Hermano aún no ha consagrado Arcas Estelares en su Hangar Personal.
                </p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.9rem' }}>
                  {memberShips.map((ship) => {
                    const statusMeta = SHIP_STATUS_META[ship.status] || SHIP_STATUS_META.operativa;
                    return (
                      <article
                        key={ship.id}
                        style={{
                          padding: '1rem 1.1rem',
                          background: 'rgba(0, 0, 0, 0.32)',
                          borderRadius: '4px',
                          borderLeft: `3px solid ${statusMeta.color}`,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.3rem' }}>
                          <strong style={{ fontFamily: 'var(--cinzel-font)', color: 'var(--text-main)' }}>
                            {ship.ship_name}
                          </strong>
                          <TacticalTooltip text={statusMeta.description}>
                            <span
                              style={{
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                color: statusMeta.color,
                                border: `1px solid ${statusMeta.color}`,
                                borderRadius: '4px',
                                padding: '0.12rem 0.45rem',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {statusMeta.sacred}
                            </span>
                          </TacticalTooltip>
                        </div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          {ship.manufacturer} · {ship.ship_class}
                        </div>
                        {ship.callsign && (
                          <div style={{ fontSize: '0.84rem', color: 'var(--secondary)', fontStyle: 'italic', marginTop: '0.25rem' }}>
                            «{ship.callsign}»
                          </div>
                        )}
                        <div className="tabular-nums" style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                          Registrada: {formatAbyssalDate(ship.created_at, { prefixCycle: true })}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    );
  }

  // ── DIRECTORY VIEW (/hermandad) ──
  const members = directoryData?.members ?? [];
  const fleetSummary = directoryData?.fleet_summary ?? {
    total_operational: 0,
    by_model: [],
    by_class: [],
  };
  const isAuthenticatedBrother = directoryData?.is_authenticated_brother ?? false;

  return (
    <div style={{ padding: '1rem 1.5rem 5rem', maxWidth: '1220px', margin: '0 auto' }}>
      {/* Header */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: '1.25rem',
          flexWrap: 'wrap',
          marginBottom: '1.75rem',
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 'inherit',
              fontWeight: 'inherit',
              fontFamily: 'inherit',
              letterSpacing: 'normal',
              textShadow: 'none',
            }}
          >
            <DualLabel
              sacred={TERMINOLOGY.hermandad.sacred}
              tactical={TERMINOLOGY.hermandad.tactical}
              size="lg"
            />
          </h1>
          <p className="prose-grimoire" style={{ color: 'var(--text-muted)', margin: '0.6rem 0 0', fontSize: '0.96rem' }}>
            La Escala del Abismo y el poder naval consolidado de la Ancalagon Oblivion Fleet en el Ciclo 2956.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          {user ? (
            <Link to="/hermano" className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <Shield size={14} aria-hidden="true" />
              Mi Expediente & Hangar
            </Link>
          ) : (
            <button type="button" className="btn-primary" onClick={loginWithDiscord}>
              {TERMINOLOGY.cruzarUmbral.sacred}
            </button>
          )}
        </div>
      </header>

      {errorMsg && (
        <div className="surface-monolith" style={{ padding: '1.25rem', marginBottom: '1.5rem', borderLeft: '3px solid var(--status-danger)' }}>
          <p className="status-danger" style={{ margin: 0 }}>{errorMsg}</p>
        </div>
      )}

      {/* OPSEC Public Notice */}
      {!isAuthenticatedBrother && (
        <section
          aria-label="Aviso de OPSEC Naval"
          className="surface-monolith"
          style={{
            padding: '1.25rem 1.5rem',
            marginBottom: '1.5rem',
            borderLeft: '3px solid var(--status-warn)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', flex: 1, minWidth: '250px' }}>
            <Lock size={20} aria-hidden="true" style={{ color: 'var(--status-warn)', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <TacticalTooltip text={TACTICAL_TOOLTIPS.opsec_naval.explanation}>
                  <DualLabel
                    sacred={TACTICAL_TOOLTIPS.opsec_naval.sacred}
                    tactical={TACTICAL_TOOLTIPS.opsec_naval.tactical}
                    size="sm"
                    inline
                  />
                </TacticalTooltip>
              </div>
              <p className="prose-grimoire" style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                Inteligencia de Hangar Individual sellada por OPSEC — Inicia sesión como Hermano Consagrado para ver
                asignaciones y contacto Discord.
              </p>
            </div>
          </div>

          {!user ? (
            <button type="button" className="btn-secondary" onClick={loginWithDiscord}>
              {TERMINOLOGY.cruzarUmbral.sacred}
            </button>
          ) : (
            <Link to="/hermano" className="btn-secondary">
              Estado en el Umbral
            </Link>
          )}
        </section>
      )}

      {/* Resumen Global de Poder Naval de la ORG */}
      <section
        aria-label="Resumen Global de Poder Naval de la ORG"
        className="surface-monolith"
        style={{ padding: '1.75rem', marginBottom: '1.75rem' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Anchor size={22} aria-hidden="true" style={{ color: 'var(--secondary)' }} />
            <h2 style={{ margin: 0 }}>
              <DualLabel
                sacred="Resumen Global de Poder Naval de la ORG"
                tactical="Inventario Agregado de Arcas Estelares Operativas"
                size="md"
              />
            </h2>
          </div>

          <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Arcas Operativas
              </div>
              <div className="tabular-nums" style={{ fontFamily: 'var(--space-font)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--secondary)' }}>
                {fleetSummary.total_operational}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Hermanos Consagrados
              </div>
              <div className="tabular-nums" style={{ fontFamily: 'var(--space-font)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {members.length}
              </div>
            </div>
          </div>
        </div>

        {/* Breakdown by Class */}
        {fleetSummary.by_class.length > 0 && (
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--secondary)', fontWeight: 700, marginBottom: '0.55rem' }}>
              Distribución por Clase Táctica
            </div>
            <div style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap' }}>
              {fleetSummary.by_class.map((cls) => (
                <span
                  key={cls.ship_class}
                  className="tabular-nums"
                  style={{
                    padding: '0.32rem 0.75rem',
                    borderRadius: '4px',
                    background: 'rgba(196, 30, 58, 0.12)',
                    border: '1px solid rgba(196, 30, 58, 0.35)',
                    fontSize: '0.84rem',
                    color: 'var(--text-main)',
                  }}
                >
                  {cls.ship_class}: <strong style={{ color: 'var(--secondary)' }}>{cls.count}</strong>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Breakdown by Model */}
        {fleetSummary.by_model.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
            Aún no hay Arcas Estelares operativas registradas en la Flota durante este ciclo.
          </p>
        ) : (
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--secondary)', fontWeight: 700, marginBottom: '0.55rem' }}>
              Desglose Consolidado por Modelo
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
              {fleetSummary.by_model.map((model) => (
                <div
                  key={`${model.ship_name}-${model.manufacturer}-${model.ship_class}`}
                  style={{
                    padding: '0.75rem 0.9rem',
                    background: 'rgba(0, 0, 0, 0.32)',
                    borderRadius: '4px',
                    borderLeft: '2px solid var(--secondary)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '0.6rem',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.92rem' }}>
                      {model.ship_name}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                      {model.manufacturer} · {model.ship_class}
                    </div>
                  </div>
                  <span
                    className="tabular-nums"
                    style={{
                      fontFamily: 'var(--space-font)',
                      fontWeight: 700,
                      fontSize: '1.05rem',
                      color: 'var(--secondary)',
                      flexShrink: 0,
                    }}
                  >
                    ×{model.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Search & Filter Bar */}
      <section
        aria-label="Filtros de La Hermandad"
        className="surface-monolith"
        style={{ padding: '1.25rem 1.5rem', marginBottom: '2rem' }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem', alignItems: 'end' }}>
          <div>
            <label
              htmlFor="hermandad-search"
              style={{ fontSize: '0.78rem', color: 'var(--secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 700 }}
            >
              Buscar Hermano, RSI o Doctrina
            </label>
            <div style={{ position: 'relative' }}>
              <Search
                size={15}
                aria-hidden="true"
                style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
              />
              <input
                id="hermandad-search"
                name="q"
                type="search"
                className="search-input"
                value={queryFilter}
                onChange={(e) => updateDirectoryParam('q', e.target.value)}
                placeholder="Ej. Quaker, Nyx, Asedio…"
                spellCheck={false}
                autoComplete="off"
                style={{ paddingLeft: '2.3rem' }}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="hermandad-system"
              style={{ fontSize: '0.78rem', color: 'var(--secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 700 }}
            >
              Sistema Habitual
            </label>
            <select
              id="hermandad-system"
              name="system"
              className="select-filter"
              value={systemFilter}
              onChange={(e) => updateDirectoryParam('system', e.target.value)}
            >
              <option value="all">Todos los Sistemas</option>
              {HOME_SYSTEMS.map((sys) => (
                <option key={sys} value={sys}>
                  {sys}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="hermandad-rank"
              style={{ fontSize: '0.78rem', color: 'var(--secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 700 }}
            >
              Peldaño en La Escala
            </label>
            <select
              id="hermandad-rank"
              name="rank"
              className="select-filter"
              value={rankFilter}
              onChange={(e) => updateDirectoryParam('rank', e.target.value)}
            >
              <option value="all">Todos los Peldaños</option>
              {PYRAMID_RANKS.map((rank) => (
                <option key={rank.id} value={rank.id}>
                  [{rank.roman}] {rank.name}
                </option>
              ))}
            </select>
          </div>

          {hasActiveFilters && (
            <div>
              <button
                type="button"
                className="btn-secondary"
                onClick={clearFilters}
                style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
              >
                <X size={14} aria-hidden="true" />
                Limpiar Filtros
              </button>
            </div>
          )}
        </div>
      </section>

      {/* La Escala del Abismo Pyramid */}
      {filteredMembers.length === 0 ? (
        <section className="surface-monolith" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <Users size={28} aria-hidden="true" style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
          <p style={{ color: 'var(--text-muted)', margin: '0 0 1rem' }}>
            Ningún hermano coincide con los filtros actuales.
          </p>
          {hasActiveFilters && (
            <button type="button" className="btn-secondary" onClick={clearFilters}>
              Mostrar toda La Hermandad
            </button>
          )}
        </section>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {PYRAMID_RANKS.map((rank) => {
            const tierMembers = filteredMembers.filter(
              (m) => resolveMemberPyramidRankId(m) === rank.id,
            );
            if (tierMembers.length === 0 && hasActiveFilters) {
              return null;
            }

            return (
              <section
                key={rank.id}
                aria-label={`Peldaño ${rank.roman}: ${rank.name}`}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    flexWrap: 'wrap',
                    paddingBottom: '0.65rem',
                    marginBottom: '1rem',
                    borderBottom: `2px solid ${rank.color}65`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <span
                      className="tabular-nums"
                      style={{
                        padding: '0.2rem 0.6rem',
                        borderRadius: '4px',
                        background: `${rank.color}25`,
                        border: `1px solid ${rank.color}70`,
                        color: rank.cssVar,
                        fontFamily: 'var(--cinzel-font)',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                      }}
                    >
                      {rank.roman}
                    </span>
                    <DualLabel
                      sacred={rank.name}
                      tactical={`${rank.archetype} · ${rank.tacticalRole}`}
                      size="md"
                      sacredColor={rank.cssVar}
                    />
                  </div>

                  <span className="tabular-nums" style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                    {tierMembers.length} {tierMembers.length === 1 ? 'Hermano' : 'Hermanos'}
                  </span>
                </div>

                {tierMembers.length === 0 ? (
                  <div
                    className="surface-monolith"
                    style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)', fontSize: '0.88rem' }}
                  >
                    Sin hermanos consagrados en este peldaño durante el ciclo actual.
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns:
                        rank.level >= 6
                          ? 'minmax(280px, 560px)'
                          : 'repeat(auto-fill, minmax(290px, 1fr))',
                      justifyContent: rank.level >= 6 ? 'center' : 'stretch',
                      gap: '1.1rem',
                    }}
                  >
                    {tierMembers.map((member) => {
                      const marksCount = member.abyssal_marks?.length ?? 0;
                      const memberShipCount = member.ships?.length ?? 0;
                      const hasOpsecPrivate =
                        isAuthenticatedBrother &&
                        (member.discord_username !== undefined || member.ships !== undefined);

                      return (
                        <Link
                          key={member.id}
                          to={`/hermano/${getMemberRouteKey(member)}`}
                          className="surface-interactive"
                          style={{
                            padding: '1.35rem',
                            textDecoration: 'none',
                            color: 'inherit',
                            borderTop: `3px solid ${rank.cssVar}`,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            gap: '0.9rem',
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', marginBottom: '0.75rem' }}>
                              <img
                                src={member.discord_avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}
                                alt={`Avatar de ${member.display_name}`}
                                width={52}
                                height={52}
                                loading="lazy"
                                style={{
                                  width: '52px',
                                  height: '52px',
                                  borderRadius: '50%',
                                  objectFit: 'cover',
                                  border: `2px solid ${rank.cssVar}`,
                                  flexShrink: 0,
                                }}
                              />
                              <div style={{ minWidth: 0 }}>
                                <div
                                  style={{
                                    fontFamily: 'var(--cinzel-font)',
                                    fontWeight: 700,
                                    fontSize: '1.05rem',
                                    color: 'var(--text-main)',
                                    overflowWrap: 'anywhere',
                                  }}
                                >
                                  {member.display_name}
                                </div>
                                {member.rsi_handle && (
                                  <div
                                    className="accent-rsi"
                                    translate="no"
                                    style={{ fontSize: '0.82rem', fontWeight: 700 }}
                                  >
                                    RSI: {member.rsi_handle}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div style={{ fontSize: '0.86rem', color: 'var(--secondary)', fontWeight: 600, marginBottom: '0.45rem' }}>
                              {member.cargo}
                            </div>

                            <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
                              <span>{member.combat_role || 'Vanguardia'}</span>
                              <span>·</span>
                              <span>{member.home_system || 'Pyro'}</span>
                            </div>

                            {member.specialties && member.specialties.length > 0 && (
                              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                                {member.specialties.slice(0, 3).map((sp) => (
                                  <span
                                    key={sp}
                                    style={{
                                      fontSize: '0.74rem',
                                      padding: '0.15rem 0.5rem',
                                      borderRadius: '3px',
                                      background: 'rgba(212, 175, 55, 0.08)',
                                      border: '1px solid rgba(212, 175, 55, 0.22)',
                                      color: 'var(--accent-silver)',
                                    }}
                                  >
                                    {sp}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <div
                            style={{
                              paddingTop: '0.7rem',
                              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: '0.5rem',
                              flexWrap: 'wrap',
                              fontSize: '0.78rem',
                              color: 'var(--text-muted)',
                            }}
                          >
                            <span className="tabular-nums" style={{ color: marksCount > 0 ? 'var(--secondary)' : 'var(--text-muted)' }}>
                              ☩ {marksCount} {marksCount === 1 ? 'Marca' : 'Marcas'}
                            </span>

                            {hasOpsecPrivate ? (
                              <span className="tabular-nums" style={{ color: 'var(--status-ok)' }}>
                                {member.is_discord_linked && member.discord_username
                                  ? `@${member.discord_username} · `
                                  : ''}
                                {memberShipCount} {memberShipCount === 1 ? 'Arca' : 'Arcas'}
                              </span>
                            ) : (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-muted)' }}>
                                <Lock size={12} aria-hidden="true" />
                                OPSEC
                              </span>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Hermandad;

import axios from 'axios';
import type {
  BrotherProfile,
  ChronicleBlock,
  CrusadeStatus,
  ObjectiveStatus,
  SaveChroniclePayload,
  UserRole,
  UserStatus,
} from '../../types';
import {
  CANDIDATO_RANK_META,
  ESCALA_RANKS,
  ROLE_META,
  type RankMeta,
  type TechnicalRoleKey,
  type TechnicalRoleMeta,
} from '../../constants/terminology';
import { toAbyssalYear } from '../../utils/abyssalDate';

export const DIALOG_FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export type ConcilioTab = 'personal' | 'operativo' | 'cronicas' | 'actas';

export const VALID_CONCILIO_TABS: readonly ConcilioTab[] = [
  'personal',
  'operativo',
  'cronicas',
  'actas',
] as const;

export function parseConcilioTab(raw: string | null): ConcilioTab {
  if (raw && (VALID_CONCILIO_TABS as readonly string[]).includes(raw)) {
    return raw as ConcilioTab;
  }
  return 'personal';
}

export const HERALDO_SUPREMO_ID = 'usr-quaker-heraldo';

export const ASSIGNABLE_ROLE_KEYS: readonly TechnicalRoleKey[] = [
  'neofito',
  'hermano',
  'oficial',
  'consejo',
  'admin',
] as const;

export const USER_STATUS_META: Record<
  UserStatus,
  { sacred: string; tactical: string; color: string }
> = {
  pending: {
    sacred: 'En el Umbral',
    tactical: 'Pendiente de Aprobación',
    color: 'var(--status-warn)',
  },
  approved: {
    sacred: 'Consagrado',
    tactical: 'Miembro Aprobado',
    color: 'var(--status-ok)',
  },
  suspended: {
    sacred: 'Velo Suspendido',
    tactical: 'Acceso Suspendido',
    color: 'var(--accent-silver)',
  },
  rejected: {
    sacred: 'La Ceniza Fría',
    tactical: 'Rechazado / Exiliado',
    color: 'var(--primary)',
  },
};

export const CRUSADE_STATUS_META: Record<
  CrusadeStatus,
  { label: string; color: string }
> = {
  convocada: { label: 'Convocada', color: 'var(--secondary)' },
  abierta: { label: 'Abierta', color: 'var(--status-ok)' },
  en_curso: { label: 'En Curso', color: 'var(--accent-rsi)' },
  victoriosa: { label: 'Victoriosa', color: 'var(--status-ok)' },
  completada: { label: 'Completada', color: 'var(--accent-silver)' },
  archivada: { label: 'Archivada', color: 'var(--text-muted)' },
  cancelada: { label: 'Cancelada', color: 'var(--primary)' },
};

export const CRUSADE_TRANSITIONS: Record<CrusadeStatus, readonly CrusadeStatus[]> = {
  convocada: [
    'convocada',
    'abierta',
    'en_curso',
    'victoriosa',
    'completada',
    'archivada',
    'cancelada',
  ],
  abierta: [
    'convocada',
    'abierta',
    'en_curso',
    'victoriosa',
    'completada',
    'archivada',
    'cancelada',
  ],
  en_curso: [
    'en_curso',
    'convocada',
    'victoriosa',
    'completada',
    'archivada',
    'cancelada',
  ],
  victoriosa: ['victoriosa', 'completada', 'archivada'],
  completada: ['victoriosa', 'completada', 'archivada'],
  archivada: ['archivada', 'cancelada', 'convocada'],
  cancelada: ['archivada', 'cancelada', 'convocada'],
};

export const OBJECTIVE_STATUS_META: Record<
  ObjectiveStatus,
  { label: string; color: string }
> = {
  propuesto: { label: 'Propuesto', color: 'var(--text-muted)' },
  activo: { label: 'Activo', color: 'var(--secondary)' },
  en_progreso: { label: 'En Progreso', color: 'var(--accent-rsi)' },
  cumplido: { label: 'Cumplido', color: 'var(--status-ok)' },
  marca_del_abismo: { label: 'Marca del Abismo', color: 'var(--secondary)' },
  abandonado: { label: 'Abandonado', color: 'var(--text-muted)' },
  ceniza_fria: { label: 'La Ceniza Fría', color: 'var(--primary)' },
};

export const OBJECTIVE_STATUS_OPTIONS: readonly ObjectiveStatus[] = [
  'propuesto',
  'activo',
  'en_progreso',
  'cumplido',
  'marca_del_abismo',
  'abandonado',
  'ceniza_fria',
] as const;

export const CHRONICLE_CLASSIFICATIONS: readonly string[] = [
  'Registro Fundacional',
  'Edicto Sagrado',
  'Crónica de Guerra',
  'Profecía del Vacío',
  'Evento de Quiebre',
  'Edicto de Sangre',
  'Elegía del Vacío',
  'Crónica Sagrada',
] as const;

export const CHRONICLE_SIGILS: readonly { value: string; label: string }[] = [
  { value: 'dragon', label: 'Dragón de Ancalagon' },
  { value: '☩', label: '☩ Cruz Litúrgica' },
  { value: '⚔', label: '⚔ Espadas Cruzadas' },
  { value: '✦', label: '✦ Estrella del Abismo' },
  { value: '◈', label: '◈ Sello Romboidal' },
  { value: '❖', label: '❖ Emblema Imperial' },
  { value: '⌖', label: '⌖ Mira Estelar' },
  { value: '☽', label: '☽ Eclipse del Vacío' },
] as const;

export const CHRONICLE_COLORS: readonly { value: string; label: string }[] = [
  { value: 'var(--secondary)', label: 'Oro Imperial' },
  { value: 'var(--primary)', label: 'Sangre Carmesí' },
  { value: 'var(--accent-rsi)', label: 'Azul Estelar' },
  { value: 'var(--accent-conclave)', label: 'Púrpura del Cónclave' },
  { value: 'var(--status-ok)', label: 'Esmeralda del Vacío' },
] as const;

export const AUDIT_ACTION_META: Record<
  string,
  { label: string; tone: 'gold' | 'crimson' | 'ok' | 'rsi' | 'conclave' | 'muted' }
> = {
  USER_PREREGISTERED: { label: 'Expediente Pre-registrado', tone: 'rsi' },
  USER_MERGED: { label: 'Fusión Discord ↔ ORG', tone: 'ok' },
  DISCORD_AUTO_LINKED: { label: 'Auto-vínculo OAuth2', tone: 'ok' },
  DISCORD_UNLINKED: { label: 'Discord Desvinculado', tone: 'crimson' },
  USER_APPROVED: { label: 'Consagrado en Umbral', tone: 'ok' },
  USER_REJECTED: { label: 'Arrojado a Ceniza Fría', tone: 'crimson' },
  USER_UPDATED: { label: 'Expediente Actualizado', tone: 'gold' },
  USER_PROMOTED: { label: 'Ascenso / Rango Grabado', tone: 'gold' },
  USER_ROLE_CHANGED: { label: 'Rol Técnico Modificado', tone: 'conclave' },
  MARK_GRANTED: { label: 'Marca del Abismo Otorgada', tone: 'gold' },
  MARK_REVOKED: { label: 'Marca del Abismo Revocada', tone: 'crimson' },
  VERDICT_UPDATED: { label: 'Veredicto Actualizado', tone: 'conclave' },
  VERDICT_DELETED: { label: 'Veredicto Eliminado', tone: 'crimson' },
  CHRONICLE_CREATED: { label: 'Crónica Escrita', tone: 'gold' },
  CHRONICLE_UPDATED: { label: 'Crónica Editada', tone: 'gold' },
  CHRONICLE_DELETED: { label: 'Crónica Removida', tone: 'crimson' },
  CRUSADE_UPDATED: { label: 'Edicto de Cruzada Editado', tone: 'rsi' },
  CRUSADE_DELETED: { label: 'Edicto de Cruzada Eliminado', tone: 'crimson' },
  OBJECTIVE_VERIFIED: { label: 'Designio Verificado (Marca)', tone: 'ok' },
  OBJECTIVE_UPDATED: { label: 'Designio Actualizado', tone: 'rsi' },
  OBJECTIVE_DELETED: { label: 'Designio Eliminado', tone: 'crimson' },
  POLL_CLOSED: { label: 'Cónclave Sellado', tone: 'conclave' },
  POLL_DELETED: { label: 'Cónclave Eliminado', tone: 'crimson' },
};

// --- 3-Tier RBAC Guards (Mirroring backend assertCouncilAuthority) ---

export function isCouncilActor(user: BrotherProfile | null | undefined): boolean {
  return Boolean(
    user &&
      user.status === 'approved' &&
      (user.role === 'admin' || user.role === 'consejo'),
  );
}

export function isTargetProtectedFromConsejo(target: BrotherProfile): boolean {
  const rankLevel = target.rank_level ?? 0;
  return (
    target.id === HERALDO_SUPREMO_ID ||
    target.role === 'admin' ||
    target.role === 'consejo' ||
    rankLevel >= 5
  );
}

export function canManageCouncilTarget(
  actor: BrotherProfile,
  target: BrotherProfile,
): boolean {
  if (actor.role === 'admin') return true;
  if (actor.role === 'consejo') {
    return !isTargetProtectedFromConsejo(target);
  }
  return false;
}

export function canUnlinkCouncilTarget(
  actor: BrotherProfile,
  target: BrotherProfile,
): boolean {
  if (!target.is_discord_linked) return false;
  if (target.id === actor.id) return false;
  return canManageCouncilTarget(actor, target);
}

export function canRejectCouncilTarget(
  actor: BrotherProfile,
  target: BrotherProfile,
): boolean {
  if (target.id === actor.id) return false;
  if (target.id === HERALDO_SUPREMO_ID) return false;
  return canManageCouncilTarget(actor, target);
}

export function canBeMergeSource(
  actor: BrotherProfile,
  candidate: BrotherProfile,
): boolean {
  if (!candidate.is_discord_linked) return false;
  if (candidate.id === actor.id) return false;
  if (candidate.id === HERALDO_SUPREMO_ID) return false;
  return canManageCouncilTarget(actor, candidate);
}

export function canBeMergeTarget(
  actor: BrotherProfile,
  candidate: BrotherProfile,
): boolean {
  if (candidate.is_discord_linked) return false;
  return canManageCouncilTarget(actor, candidate);
}

export function getAssignableRanks(
  actorRole: UserRole,
  includeCandidato = false,
): RankMeta[] {
  const ranks =
    actorRole === 'admin'
      ? [...ESCALA_RANKS]
      : ESCALA_RANKS.filter((r) => r.level <= 4);
  return includeCandidato ? [CANDIDATO_RANK_META, ...ranks] : ranks;
}

export function getAssignableRoles(actorRole: UserRole): TechnicalRoleMeta[] {
  const allowed: readonly TechnicalRoleKey[] =
    actorRole === 'admin'
      ? ['neofito', 'hermano', 'oficial', 'consejo', 'admin']
      : ['neofito', 'hermano', 'oficial'];
  return allowed.map((key) => ROLE_META[key]);
}

export function suggestDefaultRoleForRank(
  rankId: string,
  actorRole: UserRole,
): TechnicalRoleKey {
  const found = ESCALA_RANKS.find((r) => r.id === rankId);
  if (!found) return 'hermano';
  if (actorRole !== 'admin' && found.level >= 5) {
    return 'oficial';
  }
  if (found.level === 6) {
    return actorRole === 'admin' ? 'admin' : 'oficial';
  }
  return found.defaultRole;
}

// --- API Error Extraction ---

export function extractApiError(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: unknown; message?: unknown } | undefined;
    if (data && typeof data.error === 'string' && data.error.trim()) {
      return data.error;
    }
    if (data && typeof data.message === 'string' && data.message.trim()) {
      return data.message;
    }
    if (err.message && err.message.trim()) {
      return err.message;
    }
  } else if (err instanceof Error && err.message.trim()) {
    return err.message;
  }
  return fallback;
}

// --- Timestamp & Audit Helpers ---

const MONTHS_ES = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
] as const;

export interface AbyssalTimestampOptions {
  includeTime?: boolean;
  prefixCycle?: boolean;
}

export function formatSqliteAbyssalTimestamp(
  raw: string | null | undefined,
  options: AbyssalTimestampOptions = {},
): string {
  if (!raw) return 'Ciclo Indeterminado';
  const trimmed = raw.trim();
  if (!trimmed) return 'Ciclo Indeterminado';

  const dateOnlyRe = /^\d{4}-\d{2}-\d{2}$/;
  // SQLite CURRENT_TIMESTAMP produces 'YYYY-MM-DD HH:MM:SS' in UTC without 'T'/'Z'
  const sqliteUtcRe = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/;
  const isoNaiveRe = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/;

  const isDateOnly = dateOnlyRe.test(trimmed);
  let normalized = trimmed;
  if (isDateOnly) {
    normalized = `${trimmed}T00:00:00Z`;
  } else if (sqliteUtcRe.test(trimmed)) {
    normalized = `${trimmed.replace(' ', 'T')}Z`;
  } else if (isoNaiveRe.test(trimmed)) {
    normalized = `${trimmed}Z`;
  }

  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) {
    return trimmed.replace(/\b(202\d)\b/g, (_, y: string) => String(Number(y) + 930));
  }

  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = MONTHS_ES[d.getUTCMonth()] ?? 'Ene';
  const abyssalYear = toAbyssalYear(d.getUTCFullYear());
  const prefixCycle = options.prefixCycle ?? true;
  const cycleText = prefixCycle ? `Ciclo ${abyssalYear}` : `${abyssalYear}`;
  const includeTime = options.includeTime ?? !isDateOnly;

  if (includeTime) {
    const hours = String(d.getUTCHours()).padStart(2, '0');
    const mins = String(d.getUTCMinutes()).padStart(2, '0');
    return `${day} ${month} ${cycleText} · ${hours}:${mins} UTC`;
  }

  return `${day} ${month} ${cycleText}`;
}

export function parseAuditDetails(raw: string): Record<string, unknown> | string {
  if (!raw || !raw.trim()) return '';
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return String(parsed);
  } catch {
    return raw;
  }
}

export function summarizeAuditDetails(raw: string): string {
  const parsed = parseAuditDetails(raw);
  if (typeof parsed === 'string') return parsed;
  const entries = Object.entries(parsed).filter(
    ([, val]) => val !== null && val !== undefined && val !== '',
  );
  if (entries.length === 0) return 'Sin parámetros adicionales';
  return entries
    .map(([key, val]) => {
      const formattedVal = Array.isArray(val) ? val.join(', ') : String(val);
      return `${key}: ${formattedVal}`;
    })
    .join(' · ');
}

// --- Chronicle Validation & Preview Sanitization ---

const FORBIDDEN_YEAR_RE = /\b202\d\b/;

export interface ChronicleValidationResult {
  valid: boolean;
  hasForbiddenYear: boolean;
  forbiddenFields: string[];
  hasSacredClosing: boolean;
  emptyBlockIndices: number[];
  errors: string[];
}

function collectBlockVisibleStrings(block: ChronicleBlock): string[] {
  if (block.type === 'p' || block.type === 'quote') {
    return typeof block.text === 'string' && block.text.trim() ? [block.text] : [];
  }
  if (block.type === 'header') {
    return typeof block.title === 'string' && block.title.trim() ? [block.title] : [];
  }
  if (block.type === 'grid' && Array.isArray(block.items)) {
    const parts: string[] = [];
    for (const item of block.items) {
      if (typeof item.title === 'string' && item.title.trim()) parts.push(item.title);
      if (typeof item.text === 'string' && item.text.trim()) parts.push(item.text);
    }
    return parts;
  }
  return [];
}

function collectBlockAllStrings(block: ChronicleBlock): string[] {
  const parts: string[] = [];
  if (typeof block.text === 'string') parts.push(block.text);
  if (typeof block.title === 'string') parts.push(block.title);
  if (typeof block.icon === 'string') parts.push(block.icon);
  if (Array.isArray(block.items)) {
    for (const item of block.items) {
      if (typeof item.icon === 'string') parts.push(item.icon);
      if (typeof item.title === 'string') parts.push(item.title);
      if (typeof item.text === 'string') parts.push(item.text);
    }
  }
  return parts;
}

export function validateChronicleClient(
  payload: SaveChroniclePayload,
): ChronicleValidationResult {
  const errors: string[] = [];
  const forbiddenFields: string[] = [];
  const emptyBlockIndices: number[] = [];

  if (!payload.title || !payload.title.trim()) {
    errors.push('El título de la Crónica es obligatorio.');
  }

  if (FORBIDDEN_YEAR_RE.test(payload.title || '')) forbiddenFields.push('Título');
  if (FORBIDDEN_YEAR_RE.test(payload.subtitle || '')) forbiddenFields.push('Subtítulo');
  if (FORBIDDEN_YEAR_RE.test(payload.date || '')) forbiddenFields.push('Fecha In-Game');
  if (FORBIDDEN_YEAR_RE.test(payload.classification || '')) {
    forbiddenFields.push('Clasificación');
  }
  if (FORBIDDEN_YEAR_RE.test(payload.icon || '')) forbiddenFields.push('Emblema / Sigilo');
  if (FORBIDDEN_YEAR_RE.test(payload.color || '')) forbiddenFields.push('Color Litúrgico');

  const blocks = Array.isArray(payload.blocks) ? payload.blocks : [];
  if (blocks.length === 0) {
    errors.push('La Crónica debe contener al menos un bloque litúrgico.');
  } else {
    blocks.forEach((block, idx) => {
      const num = idx + 1;
      if (block.type === 'p' || block.type === 'quote') {
        if (!block.text || !block.text.trim()) {
          emptyBlockIndices.push(idx);
          errors.push(`El bloque #${num} (${block.type}) no puede estar vacío.`);
        }
      } else if (block.type === 'header') {
        if (typeof block.title !== 'string' || !block.title.trim()) {
          emptyBlockIndices.push(idx);
          errors.push(`El encabezado #${num} requiere un título no vacío.`);
        }
      } else if (block.type === 'grid') {
        if (!Array.isArray(block.items) || block.items.length === 0) {
          emptyBlockIndices.push(idx);
          errors.push(`La cuadrícula #${num} requiere al menos un elemento.`);
        } else {
          const invalidItem = block.items.some(
            (item) => !item.title?.trim() && !item.text?.trim(),
          );
          if (invalidItem) {
            emptyBlockIndices.push(idx);
            errors.push(`Cada tarjeta de la cuadrícula #${num} necesita título o texto.`);
          }
        }
      }

      const blockTexts = collectBlockAllStrings(block);
      if (blockTexts.some((t) => FORBIDDEN_YEAR_RE.test(t))) {
        forbiddenFields.push(`Bloque #${num}`);
      }
    });
  }

  const hasForbiddenYear = forbiddenFields.length > 0;
  if (hasForbiddenYear) {
    errors.push(
      `Regla temporal +930 infringida en: ${forbiddenFields.join(', ')}. Usa años del Ciclo 2956 (+930) y elimina cualquier año 202x.`,
    );
  }

  const allVisible = blocks.flatMap((b) => collectBlockVisibleStrings(b)).join('\n');
  const hasSacredClosing = allVisible.toUpperCase().includes('IN NOMINI OBLIVIONIS');
  if (!hasSacredClosing) {
    errors.push(
      "Cierre sagrado ausente: la Crónica debe incluir 'IN NOMINI OBLIVIONIS' en su contenido visible.",
    );
  }

  return {
    valid: errors.length === 0,
    hasForbiddenYear,
    forbiddenFields,
    hasSacredClosing,
    emptyBlockIndices,
    errors,
  };
}

const ALLOWED_CHRONICLE_TAGS = new Set([
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'br',
  'p',
  'span',
  'code',
  'sub',
  'sup',
  'ul',
  'ol',
  'li',
  'a',
]);

const DISCARDED_CHRONICLE_TAGS = new Set([
  'script',
  'iframe',
  'style',
  'svg',
  'object',
  'embed',
  'math',
  'meta',
  'img',
  'form',
  'link',
  'template',
  'noscript',
  'textarea',
  'title',
  'audio',
  'video',
  'source',
  'track',
  'canvas',
  'frame',
  'frameset',
  'base',
  'applet',
  'input',
  'button',
  'select',
  'option',
]);

const ALLOWED_STYLE_PROPS = new Set([
  'color',
  'font-size',
  'font-weight',
  'font-style',
  'letter-spacing',
  'text-decoration',
  'text-align',
]);

const SAFE_STYLE_VALUE_RE = /^[a-zA-Z0-9#(),.\s%-]+$/;
const SAFE_CLASS_NAME_RE = /^[a-zA-Z0-9 _-]+$/;

function escapeHtmlFallback(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeInlineStyle(rawStyle: string): string {
  if (!rawStyle) return '';
  const lower = rawStyle.toLowerCase();
  if (
    lower.includes('url(') ||
    lower.includes('expression(') ||
    lower.includes('@import') ||
    lower.includes('javascript:') ||
    lower.includes('vbscript:') ||
    lower.includes('data:') ||
    lower.includes('-moz-binding') ||
    lower.includes('behavior') ||
    rawStyle.includes('\\')
  ) {
    return '';
  }

  const safeDeclarations: string[] = [];
  for (const decl of rawStyle.split(';')) {
    const colonIdx = decl.indexOf(':');
    if (colonIdx === -1) continue;
    const prop = decl.slice(0, colonIdx).trim().toLowerCase();
    const val = decl.slice(colonIdx + 1).trim();
    if (!ALLOWED_STYLE_PROPS.has(prop)) continue;
    if (!val || !SAFE_STYLE_VALUE_RE.test(val)) continue;
    safeDeclarations.push(`${prop}: ${val}`);
  }
  return safeDeclarations.join('; ');
}

function sanitizeAnchorHref(rawHref: string): string | null {
  let clean = '';
  for (let i = 0; i < rawHref.length; i += 1) {
    const code = rawHref.charCodeAt(i);
    if (code <= 31 || code === 127) continue;
    clean += rawHref[i];
  }
  const trimmed = clean.trim();
  if (!trimmed || trimmed.startsWith('//')) return null;

  const compact = trimmed.replace(/\s+/g, '');
  let decodedCompact = compact;
  try {
    decodedCompact = decodeURIComponent(compact);
  } catch {
    // Keep compact if malformed percent-encoding
  }

  const isSafe =
    (/^https?:\/\//i.test(compact) && /^https?:\/\//i.test(decodedCompact)) ||
    (/^mailto:/i.test(compact) && /^mailto:/i.test(decodedCompact)) ||
    (compact.startsWith('/') && !compact.startsWith('//')) ||
    compact.startsWith('#');

  return isSafe ? trimmed : null;
}

function sanitizeDomNode(node: Node, targetDoc: Document): Node | null {
  if (node.nodeType === 3) {
    return targetDoc.createTextNode(node.textContent ?? '');
  }
  if (node.nodeType !== 1) {
    return null;
  }

  const el = node as Element;
  const tag = el.tagName.toLowerCase();

  if (DISCARDED_CHRONICLE_TAGS.has(tag)) {
    return null;
  }

  if (!ALLOWED_CHRONICLE_TAGS.has(tag)) {
    const fragment = targetDoc.createDocumentFragment();
    el.childNodes.forEach((child) => {
      const sanitizedChild = sanitizeDomNode(child, targetDoc);
      if (sanitizedChild) fragment.appendChild(sanitizedChild);
    });
    return fragment;
  }

  const outEl = targetDoc.createElement(tag);

  const rawClass = el.getAttribute('class');
  if (rawClass && SAFE_CLASS_NAME_RE.test(rawClass)) {
    const trimmedClass = rawClass.trim();
    if (trimmedClass) outEl.setAttribute('class', trimmedClass);
  }

  const rawStyle = el.getAttribute('style');
  if (rawStyle) {
    const safeStyle = sanitizeInlineStyle(rawStyle);
    if (safeStyle) outEl.setAttribute('style', safeStyle);
  }

  if (tag === 'a') {
    const rawHref = el.getAttribute('href');
    if (rawHref) {
      const safeHref = sanitizeAnchorHref(rawHref);
      if (safeHref) {
        outEl.setAttribute('href', safeHref);
        outEl.setAttribute('target', '_blank');
        outEl.setAttribute('rel', 'noopener noreferrer');
      }
    }
  }

  el.childNodes.forEach((child) => {
    const sanitizedChild = sanitizeDomNode(child, targetDoc);
    if (sanitizedChild) outEl.appendChild(sanitizedChild);
  });

  return outEl;
}

export function sanitizeChronicleHtml(rawHtml: string): string {
  if (!rawHtml) return '';
  if (typeof DOMParser === 'undefined') {
    return escapeHtmlFallback(rawHtml);
  }

  const parsed = new DOMParser().parseFromString(rawHtml, 'text/html');
  const container = parsed.createElement('div');
  parsed.body.childNodes.forEach((child) => {
    const sanitized = sanitizeDomNode(child, parsed);
    if (sanitized) container.appendChild(sanitized);
  });
  return container.innerHTML;
}

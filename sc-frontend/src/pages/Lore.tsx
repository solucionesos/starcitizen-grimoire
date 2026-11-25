import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowUpDown,
  Calendar,
  ChevronDown,
  Compass,
  Cpu,
  Download,
  ExternalLink,
  Eye,
  Flame,
  FlaskConical,
  Landmark,
  Loader2,
  Moon,
  Orbit,
  Radio,
  RefreshCw,
  Rocket,
  Scale,
  Scroll,
  ScrollText,
  Search,
  Shield,
  Skull,
  Sparkles,
  Swords,
  Tag,
} from 'lucide-react';
import html2pdf from 'html2pdf.js';
import DragonIcon from '../components/DragonIcon';
import DualLabel from '../components/DualLabel';
import { getChronicles } from '../api/client';
import { TERMINOLOGY } from '../constants/terminology';
import type { Chronicle, ChronicleBlock } from '../types';
import { toAbyssalYear } from '../utils/abyssalDate';

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  tags: string[];
  date_published: string | null;
}

type LoreTab = 'cronicas' | 'transmisiones';

const NEWS_API_URL = '/api/news';
const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'] as const;

function sanitizeAbyssalText(text: string | null | undefined): string {
  if (typeof text !== 'string' || !text) return '';
  return text
    .replace(/\b(202\d)\b/g, (_, y: string) => String(Number(y) + 930))
    .replace(/🐉/g, '☩');
}

function formatAbyssalUtcDate(iso: string | null): string {
  if (!iso) return '';
  const trimmed = iso.trim();
  if (!trimmed) return '';
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) {
    return sanitizeAbyssalText(trimmed);
  }
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = MONTHS_ES[d.getUTCMonth()] ?? 'Ene';
  const year = toAbyssalYear(d.getUTCFullYear());
  return `${day} ${month} Ciclo ${year}`;
}

// ─── DOMParser HTML Sanitizer (Allowlist matching concilioHelpers) ──────────
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
    // keep compact
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
    return targetDoc.createTextNode(sanitizeAbyssalText(node.textContent ?? ''));
  }
  if (node.nodeType !== 1) return null;

  const el = node as Element;
  const tag = el.tagName.toLowerCase();

  if (DISCARDED_CHRONICLE_TAGS.has(tag)) return null;

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

function sanitizeChronicleHtml(rawHtml: string): string {
  if (!rawHtml) return '';
  if (typeof DOMParser === 'undefined') {
    return escapeHtmlFallback(sanitizeAbyssalText(rawHtml));
  }
  const parsed = new DOMParser().parseFromString(rawHtml, 'text/html');
  const container = parsed.createElement('div');
  parsed.body.childNodes.forEach((child) => {
    const sanitized = sanitizeDomNode(child, parsed);
    if (sanitized) container.appendChild(sanitized);
  });
  return container.innerHTML;
}

// ─── Vector Glyph Mapper (Zero Native Emojis) ────────────────────────────────
function renderLoreGlyph(icon: string | undefined, size = 22): React.ReactNode {
  const key = (icon || '').trim();
  const lower = key.toLowerCase();

  if (!key || key === 'dragon' || key === '🐉') {
    return <DragonIcon size={size} />;
  }
  if (key === '☩' || key === '✦' || key === '◈' || key === '❖' || key === '⌖' || key === '☽') {
    return (
      <span
        aria-hidden="true"
        style={{
          fontSize: `${size}px`,
          lineHeight: 1,
          color: 'var(--secondary)',
          fontFamily: 'var(--cinzel-font)',
          display: 'inline-block',
        }}
      >
        {key}
      </span>
    );
  }
  if (key === '⚔' || key === '⚔️' || lower.includes('sword') || lower.includes('war')) {
    return <Swords size={size} aria-hidden="true" style={{ color: 'var(--primary)' }} />;
  }
  if (key === '🌑' || key === '🌘' || key === '🌙') {
    return <Moon size={size} aria-hidden="true" style={{ color: 'var(--accent-silver)' }} />;
  }
  if (key === '🌌' || key === '🪐' || key === '🌠') {
    return <Orbit size={size} aria-hidden="true" style={{ color: 'var(--accent-rsi)' }} />;
  }
  if (key === '🔥' || key === '💥' || key === '🩸') {
    return <Flame size={size} aria-hidden="true" style={{ color: 'var(--primary)' }} />;
  }
  if (key === '🕯' || key === '🕯️' || key === '✨') {
    return <Sparkles size={size} aria-hidden="true" style={{ color: 'var(--secondary)' }} />;
  }
  if (key === '🚀') {
    return <Rocket size={size} aria-hidden="true" style={{ color: 'var(--secondary)' }} />;
  }
  if (key === '🛡' || key === '🛡️') {
    return <Shield size={size} aria-hidden="true" style={{ color: 'var(--secondary)' }} />;
  }
  if (key === '⚖' || key === '⚖️') {
    return <Scale size={size} aria-hidden="true" style={{ color: 'var(--accent-conclave)' }} />;
  }
  if (key === '📜' || key === '📖' || key === '🎭') {
    return <ScrollText size={size} aria-hidden="true" style={{ color: 'var(--secondary)' }} />;
  }
  if (key === '📡') {
    return <Radio size={size} aria-hidden="true" style={{ color: 'var(--accent-rsi)' }} />;
  }
  if (key === '🔍') {
    return <Search size={size} aria-hidden="true" style={{ color: 'var(--secondary)' }} />;
  }
  if (key === '🧪' || key === '⚗' || key === '⚗️') {
    return <FlaskConical size={size} aria-hidden="true" style={{ color: 'var(--accent-rsi)' }} />;
  }
  if (key === '⚠' || key === '⚠️') {
    return <AlertTriangle size={size} aria-hidden="true" style={{ color: 'var(--status-warn)' }} />;
  }
  if (key === '🏛' || key === '🏛️') {
    return <Landmark size={size} aria-hidden="true" style={{ color: 'var(--secondary)' }} />;
  }
  if (key === '👁' || key === '👁️') {
    return <Eye size={size} aria-hidden="true" style={{ color: 'var(--secondary)' }} />;
  }
  if (key === '💀' || key === '☠' || key === '☠️') {
    return <Skull size={size} aria-hidden="true" style={{ color: 'var(--primary)' }} />;
  }
  if (key === '🧭') {
    return <Compass size={size} aria-hidden="true" style={{ color: 'var(--accent-rsi)' }} />;
  }
  if (key === '⚙' || key === '⚙️' || key === '🖥' || key === '🖥️') {
    return <Cpu size={size} aria-hidden="true" style={{ color: 'var(--accent-silver)' }} />;
  }
  return <Scroll size={size} aria-hidden="true" style={{ color: 'var(--secondary)' }} />;
}

// ─── Helper Components ────────────────────────────────────────────────────────
const FragmentBlock: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>{children}</div>
);

const Quote: React.FC<{ html: string }> = ({ html }) => (
  <div
    style={{
      margin: '1.5rem auto',
      maxWidth: '72ch',
      padding: '1.2rem 1.8rem',
      background: 'rgba(196,30,58,0.06)',
      border: '1px solid rgba(212,175,55,0.25)',
      borderLeft: '3px solid var(--secondary)',
      borderRadius: '2px',
      fontFamily: 'var(--cinzel-font)',
      fontSize: '0.95rem',
      fontStyle: 'italic',
      color: 'var(--secondary)',
      letterSpacing: '1.5px',
      lineHeight: 1.9,
      textAlign: 'center',
    }}
  >
    <div dangerouslySetInnerHTML={{ __html: sanitizeChronicleHtml(html) }} />
  </div>
);

const FragmentHeader: React.FC<{ icon: string; title: string }> = ({ icon, title }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.7rem',
      margin: '2rem 0 1rem',
      paddingBottom: '0.5rem',
      borderBottom: '1px solid rgba(212,175,55,0.15)',
    }}
  >
    <span style={{ display: 'inline-flex', alignItems: 'center' }}>{renderLoreGlyph(icon, 18)}</span>
    <h3
      style={{
        margin: 0,
        fontFamily: 'var(--cinzel-font)',
        fontSize: '0.82rem',
        letterSpacing: '3px',
        color: 'var(--secondary)',
      }}
    >
      {sanitizeAbyssalText(title)}
    </h3>
  </div>
);

const ParagraphBlock: React.FC<{ html: string; muted?: boolean }> = ({ html, muted }) => (
  <p
    className="prose-grimoire"
    style={{
      color: muted ? 'var(--text-muted)' : 'var(--text-main)',
      fontSize: '1rem',
      lineHeight: 1.9,
      margin: '0.8rem 0',
    }}
  >
    <span dangerouslySetInnerHTML={{ __html: sanitizeChronicleHtml(html) }} />
  </p>
);

const RenderBlock: React.FC<{ block: ChronicleBlock }> = ({ block }) => {
  switch (block.type) {
    case 'p':
      return <ParagraphBlock html={block.text || ''} muted={block.muted} />;
    case 'quote':
      return <Quote html={block.text || ''} />;
    case 'header':
      return <FragmentHeader icon={block.icon || ''} title={block.title || ''} />;
    case 'grid':
      return (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1rem',
            margin: '1.5rem 0',
          }}
        >
          {block.items?.map((d, i) => (
            <div
              key={i}
              className="surface-monolith"
              style={{
                textAlign: 'center',
                borderTop: '2px solid rgba(212,175,55,0.3)',
                padding: '1.2rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.7rem' }}>
                {renderLoreGlyph(d.icon, 28)}
              </div>
              <h3 style={{ color: 'var(--secondary)', fontSize: '0.75rem', letterSpacing: '3px', marginBottom: '0.7rem' }}>
                {sanitizeAbyssalText(d?.title ?? '')}
              </h3>
              <p className="prose-grimoire" style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.7, margin: '0 auto' }}>
                {sanitizeAbyssalText(d?.text ?? '')}
              </p>
            </div>
          ))}
        </div>
      );
    default:
      return null;
  }
};

// ─── Accordion Item ───────────────────────────────────────────────────────────
const ChronicleCard: React.FC<{ chronicle: Chronicle; index: number }> = ({ chronicle, index }) => {
  const [open, setOpen] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const panelId = `chronicle-panel-${chronicle.id}`;

  const downloadPDF = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const element = document.getElementById(`chronicle-export-${chronicle.id}`);
    if (!element) return;

    setIsGeneratingPdf(true);
    try {
      const opt = {
        margin: [10, 0, 10, 0],
        filename: `Ancalagon_Cronica_${chronicle.id}.pdf`,
        image: { type: 'jpeg', quality: 1 },
        html2canvas: {
          backgroundColor: '#0a0505',
          scale: 2,
          useCORS: true,
          logging: false,
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] },
      };
      // @ts-expect-error html2pdf.js ships untyped chain API
      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('Error generando PDF:', error);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const displayDate = sanitizeAbyssalText(chronicle.date);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 8) * 0.05, duration: 0.4, ease: 'easeOut' }}
      style={{
        borderRadius: '4px',
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.06)',
        borderLeft: `4px solid ${chronicle.color}`,
        background: open ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.015)',
        transition: 'background-color 0.25s ease',
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '1.4rem 1.6rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          textAlign: 'left',
        }}
      >
        <div
          style={{
            minWidth: '2rem',
            display: 'flex',
            justifyContent: 'center',
            filter: open ? 'drop-shadow(0 0 8px rgba(212,175,55,0.5))' : 'none',
            transition: 'filter 0.25s ease',
          }}
        >
          {renderLoreGlyph(chronicle.icon, 24)}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
            <span
              style={{
                fontFamily: 'var(--cinzel-font)',
                fontSize: '0.65rem',
                letterSpacing: '3px',
                color: chronicle.color,
                fontWeight: 700,
              }}
            >
              {sanitizeAbyssalText(chronicle.title)}
            </span>
            <span
              style={{
                background: 'rgba(212,175,55,0.08)',
                border: '1px solid rgba(212,175,55,0.2)',
                color: 'var(--secondary)',
                fontSize: '0.6rem',
                padding: '0.15rem 0.5rem',
                borderRadius: '2px',
                fontFamily: 'var(--cinzel-font)',
                letterSpacing: '1px',
              }}
            >
              {chronicle.classification}
            </span>
          </div>
          <div
            style={{
              fontFamily: 'var(--cinzel-font)',
              fontSize: '1rem',
              fontWeight: 700,
              color: 'var(--text-main)',
              letterSpacing: '2px',
              marginBottom: '0.4rem',
            }}
          >
            {sanitizeAbyssalText(chronicle.subtitle)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            <Calendar size={12} aria-hidden="true" />
            <span className="tabular-nums" style={{ fontFamily: 'var(--cinzel-font)', letterSpacing: '1px' }}>
              {displayDate}
            </span>
          </div>
        </div>

        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          style={{ color: 'var(--secondary)', flexShrink: 0 }}
        >
          <ChevronDown size={20} aria-hidden="true" />
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id={panelId}
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div
              id={`chronicle-export-${chronicle.id}`}
              style={{
                padding: '2rem 2.5rem',
                borderTop: '1px solid rgba(255,255,255,0.05)',
                background: '#0a0505',
              }}
            >
              <div
                style={{
                  textAlign: 'center',
                  marginBottom: '2.5rem',
                  paddingBottom: '1.5rem',
                  borderBottom: '1px solid rgba(212,175,55,0.1)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'center', filter: 'drop-shadow(0 0 10px rgba(212,175,55,0.3))' }}>
                  {renderLoreGlyph(chronicle.icon, 40)}
                </div>
                <h3
                  style={{
                    fontFamily: 'var(--cinzel-font)',
                    fontSize: '1.2rem',
                    color: chronicle.color,
                    letterSpacing: '5px',
                    marginTop: '1rem',
                    marginBottom: '0.5rem',
                  }}
                >
                  {sanitizeAbyssalText(chronicle.title)}
                </h3>
                <p
                  style={{
                    fontFamily: 'var(--cinzel-font)',
                    fontSize: '1.4rem',
                    color: 'var(--text-main)',
                    letterSpacing: '3px',
                    margin: 0,
                    fontWeight: 700,
                  }}
                >
                  {sanitizeAbyssalText(chronicle.subtitle)}
                </p>
                <div
                  className="tabular-nums"
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '0.6rem',
                    color: 'var(--text-muted)',
                    fontSize: '0.8rem',
                    marginTop: '1rem',
                  }}
                >
                  <Calendar size={14} aria-hidden="true" style={{ color: 'var(--secondary)' }} />
                  <span style={{ fontFamily: 'var(--cinzel-font)', letterSpacing: '2px' }}>
                    {displayDate} | RESTRICCIÓN: NULA
                  </span>
                </div>
              </div>

              <div style={{ padding: '0 0.5rem' }}>
                {(chronicle.blocks ?? []).map((block, idx) => (
                  <FragmentBlock key={idx}>
                    <RenderBlock block={block} />
                  </FragmentBlock>
                ))}
              </div>
            </div>

            <div style={{ padding: '1.5rem', textAlign: 'center', background: 'rgba(255,255,255,0.015)' }}>
              <button
                type="button"
                onClick={(e) => void downloadPDF(e)}
                disabled={isGeneratingPdf}
                className="filter-btn"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.7rem',
                  padding: '0.7rem 1.8rem',
                  borderColor: 'rgba(212,175,55,0.3)',
                  background: isGeneratingPdf ? 'rgba(212,175,55,0.05)' : 'rgba(10,5,5,0.6)',
                  color: 'var(--secondary)',
                  cursor: isGeneratingPdf ? 'not-allowed' : 'pointer',
                  transition: 'border-color 0.25s ease, background-color 0.25s ease, color 0.25s ease',
                }}
              >
                {isGeneratingPdf ? (
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                ) : (
                  <Download size={16} aria-hidden="true" />
                )}
                <span style={{ fontFamily: 'var(--cinzel-font)', letterSpacing: '3px', fontSize: '0.75rem', fontWeight: 600 }}>
                  {isGeneratingPdf ? 'EXTRAYENDO DATOS…' : 'DESCARGAR ARCHIVO PDF'}
                </span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const TAG_COLOR: Record<string, string> = {
  Post: 'rgba(212,175,55,0.15)',
  Video: 'rgba(196,30,58,0.15)',
  default: 'rgba(148,163,184,0.1)',
};

// ─── Main page ────────────────────────────────────────────────────────────────
const Lore: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const tabIdPrefix = useId();
  const [searchParams, setSearchParams] = useSearchParams();
  const [chronicles, setChronicles] = useState<Chronicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortDesc, setSortDesc] = useState(false);

  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsError, setNewsError] = useState<string | null>(null);

  const rawParam = embedded
    ? (searchParams.get('subtab') ?? searchParams.get('tab'))
    : searchParams.get('tab');
  const activeTab: LoreTab = rawParam === 'transmisiones' ? 'transmisiones' : 'cronicas';

  const setActiveTab = (tab: LoreTab) => {
    const next = new URLSearchParams(searchParams);
    if (embedded) {
      next.set('subtab', tab);
    } else {
      next.set('tab', tab);
    }
    setSearchParams(next, { replace: true });
  };

  const fetchNews = useCallback(async () => {
    setNewsLoading(true);
    setNewsError(null);
    try {
      const res = await fetch(NEWS_API_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: NewsItem[] | { error: string } = await res.json();
      if (data && typeof data === 'object' && 'error' in data) throw new Error(data.error);
      setNewsItems(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      setNewsError(`No fue posible contactar el nexo de transmisiones. ${msg}`);
    } finally {
      setNewsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!embedded) {
      document.title = 'Star Grimoire | Crónicas de Ancalagon Oblivion Fleet';
    }
    let cancelled = false;
    getChronicles()
      .then((data) => {
        if (!cancelled) {
          setChronicles(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Error loading chronicles:', err);
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [embedded]);

  useEffect(() => {
    if (activeTab === 'transmisiones' && newsItems.length === 0 && !newsLoading && !newsError) {
      let cancelled = false;
      void Promise.resolve().then(async () => {
        if (!cancelled) {
          await fetchNews();
        }
      });
      return () => {
        cancelled = true;
      };
    }
    return undefined;
  }, [activeTab, newsItems.length, newsLoading, newsError, fetchNews]);

  const sorted = useMemo(
    () => [...chronicles].sort((a, b) => (sortDesc ? b.dateSort - a.dateSort : a.dateSort - b.dateSort)),
    [chronicles, sortDesc],
  );

  const currentCycleYear = toAbyssalYear(new Date().getFullYear());

  return (
    <div style={{ padding: '0 2rem 4rem', maxWidth: '900px', margin: '0 auto' }}>
      {!embedded ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            marginBottom: '3rem',
            background: 'linear-gradient(180deg, rgba(196,30,58,0.08) 0%, transparent 100%)',
            border: '1px solid rgba(212,175,55,0.15)',
            borderRadius: '4px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(196,30,58,0.15) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />
          <div style={{ marginBottom: '1rem', filter: 'drop-shadow(0 0 20px rgba(196,30,58,0.6))' }}>
            <DragonIcon size={80} />
          </div>
          <h1 style={{ margin: '0 0 1.2rem' }}>
            <DualLabel
              sacred={TERMINOLOGY.cronicas.sacred.toUpperCase()}
              tactical={TERMINOLOGY.cronicas.tactical}
              size="lg"
              align="center"
              sacredColor="var(--secondary)"
            />
          </h1>
          <p
            style={{
              fontFamily: 'var(--cinzel-font)',
              fontSize: '1rem',
              fontStyle: 'italic',
              color: 'var(--text-muted)',
              letterSpacing: '2px',
              borderTop: '1px solid rgba(212,175,55,0.2)',
              borderBottom: '1px solid rgba(212,175,55,0.2)',
              padding: '1rem 2rem',
              display: 'inline-block',
              marginTop: '0.5rem',
            }}
          >
            “Donde termina el orden… comenzamos nosotros.”
          </p>
        </motion.div>
      ) : (
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0 }}>
            <DualLabel
              sacred={TERMINOLOGY.cronicas.sacred.toUpperCase()}
              tactical="Archivo Histórico y Transmisiones RSI (+930 años)"
              size="md"
              align="center"
              sacredColor="var(--secondary)"
            />
          </h2>
        </div>
      )}

      {loading ? (
        <div style={{ height: '50vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
          {!embedded && (
            <h2 style={{ margin: 0, fontFamily: 'var(--cinzel-font)', fontSize: '0.85rem', fontWeight: 400, letterSpacing: '3px', color: 'var(--secondary)' }}>
              ABRIENDO LOS ARCHIVOS DEL GRIMOIRE…
            </h2>
          )}
          <Loader2 size={40} className="animate-spin" aria-label="Cargando crónicas…" style={{ color: 'var(--secondary)' }} />
        </div>
      ) : (
        <>

      {/* ── TABS ── */}
      <div
        role="tablist"
        aria-label="Archivo de Crónicas y Transmisiones"
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '0.5rem',
          flexWrap: 'wrap',
          marginBottom: '2rem',
          position: 'sticky',
          top: '5rem',
          zIndex: 40,
          padding: '0.5rem',
          background: 'rgba(10,5,5,0.9)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <button
          id={`${tabIdPrefix}-tab-cronicas`}
          type="button"
          role="tab"
          aria-selected={activeTab === 'cronicas'}
          aria-controls={activeTab === 'cronicas' ? `${tabIdPrefix}-panel-cronicas` : undefined}
          onClick={() => setActiveTab('cronicas')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0.8rem 1.5rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.8rem',
            transition: 'border-color 0.2s ease, color 0.2s ease',
            borderBottom: activeTab === 'cronicas' ? '2px solid var(--secondary)' : '2px solid transparent',
          }}
        >
          <Scroll size={18} aria-hidden="true" style={{ color: activeTab === 'cronicas' ? 'var(--secondary)' : 'var(--text-muted)' }} />
          <DualLabel
            sacred="CRÓNICAS SAGRADAS"
            tactical="Archivo de la Flota"
            size="sm"
            sacredColor={activeTab === 'cronicas' ? 'var(--text-main)' : 'var(--text-muted)'}
          />
        </button>

        <button
          id={`${tabIdPrefix}-tab-transmisiones`}
          type="button"
          role="tab"
          aria-selected={activeTab === 'transmisiones'}
          aria-controls={activeTab === 'transmisiones' ? `${tabIdPrefix}-panel-transmisiones` : undefined}
          onClick={() => setActiveTab('transmisiones')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0.8rem 1.5rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.8rem',
            transition: 'border-color 0.2s ease, color 0.2s ease',
            borderBottom: activeTab === 'transmisiones' ? '2px solid var(--primary)' : '2px solid transparent',
          }}
        >
          <Radio size={18} aria-hidden="true" style={{ color: activeTab === 'transmisiones' ? 'var(--primary)' : 'var(--text-muted)' }} />
          <DualLabel
            sacred="TRANSMISIONES"
            tactical="Comm-Link RSI (+930 años)"
            size="sm"
            sacredColor={activeTab === 'transmisiones' ? 'var(--text-main)' : 'var(--text-muted)'}
          />
        </button>
      </div>

      {activeTab === 'cronicas' ? (
        <motion.div
          key="cronicas"
          id={`${tabIdPrefix}-panel-cronicas`}
          role="tabpanel"
          aria-labelledby={`${tabIdPrefix}-tab-cronicas`}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Scroll size={14} aria-hidden="true" style={{ color: 'var(--secondary)' }} />
                <h2 className="tabular-nums" style={{ margin: 0, fontFamily: 'var(--cinzel-font)', fontSize: '0.72rem', fontWeight: 400, letterSpacing: '3px', color: 'var(--secondary)' }}>
                  {chronicles.length} CRÓNICAS EN EL GRIMOIRE
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSortDesc((v) => !v)}
                className="filter-btn active"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.7rem' }}
              >
                <ArrowUpDown size={13} aria-hidden="true" />
                {sortDesc ? 'MÁS RECIENTES PRIMERO' : 'MÁS ANTIGUAS PRIMERO'}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {sorted.map((chronicle, idx) => (
                <ChronicleCard key={chronicle.id} chronicle={chronicle} index={idx} />
              ))}
            </div>
        </motion.div>
      ) : (
        <motion.div
          key="transmisiones"
          id={`${tabIdPrefix}-panel-transmisiones`}
          role="tabpanel"
          aria-labelledby={`${tabIdPrefix}-tab-transmisiones`}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
            {/* Stats bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.8rem',
                flexWrap: 'wrap',
                padding: '0.75rem 1.2rem',
                margin: '0 0 1.5rem',
                background: 'rgba(212,175,55,0.04)',
                border: '1px solid rgba(212,175,55,0.12)',
                borderRadius: '4px',
              }}
            >
              <span aria-hidden="true" style={{ color: 'var(--secondary)' }}>☩</span>
              <h2 className="tabular-nums" style={{ margin: 0, fontFamily: 'var(--cinzel-font)', fontSize: '0.65rem', fontWeight: 400, letterSpacing: '2px', color: 'var(--text-muted)' }}>
                {newsItems.length} TRANSMISIONES · FUENTE: RSI COMM-LINK · CICLO {currentCycleYear}
              </h2>
              <button
                id="btn-resync-news"
                type="button"
                onClick={() => void fetchNews()}
                disabled={newsLoading}
                className="btn-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.65rem',
                  padding: '0.45rem 0.9rem',
                  borderColor: 'rgba(196,30,58,0.45)',
                  color: 'var(--primary)',
                }}
              >
                <RefreshCw size={13} className={newsLoading ? 'spin' : ''} aria-hidden="true" />
                {newsLoading ? 'SINCRONIZANDO SEÑAL…' : 'RESINCRONIZAR'}
              </button>
            </div>

            {newsLoading && (
              <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                <Radio size={36} aria-hidden="true" style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
                <p style={{ fontFamily: 'var(--cinzel-font)', fontSize: '0.72rem', letterSpacing: '4px', color: 'var(--text-muted)' }}>
                  INTERCEPTANDO FRECUENCIAS RSI…
                </p>
              </div>
            )}

            {newsError && (
              <div
                className="surface-monolith"
                style={{ borderLeft: '3px solid var(--primary)', padding: '2rem', textAlign: 'center' }}
              >
                <p style={{ fontFamily: 'var(--cinzel-font)', fontSize: '0.72rem', letterSpacing: '3px', color: 'var(--primary)', marginBottom: '0.5rem' }}>
                  SEÑAL CORROMPIDA
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.87rem', margin: 0 }}>{newsError}</p>
              </div>
            )}

            {!newsLoading && !newsError && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {newsItems.map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i, 8) * 0.04, duration: 0.35, ease: 'easeOut' }}
                    className="surface-monolith"
                    style={{
                      borderLeft: '3px solid var(--primary)',
                      padding: '1.2rem 1.5rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                      <span
                        className="tabular-nums"
                        style={{
                          fontFamily: 'var(--cinzel-font)',
                          fontSize: '0.68rem',
                          color: 'rgba(196,30,58,0.65)',
                          letterSpacing: '1px',
                          minWidth: '28px',
                        }}
                      >
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.45rem', flexWrap: 'wrap' }}>
                          {(item.tags ?? []).map((tag) => (
                            <span
                              key={tag}
                              style={{
                                fontFamily: 'var(--cinzel-font)',
                                fontSize: '0.55rem',
                                letterSpacing: '2px',
                                color: tag === 'Post' ? 'var(--secondary)' : tag === 'Video' ? 'var(--primary)' : 'var(--text-muted)',
                                background: TAG_COLOR[tag] ?? TAG_COLOR.default,
                                border: `1px solid ${tag === 'Post' ? 'rgba(212,175,55,0.25)' : tag === 'Video' ? 'rgba(196,30,58,0.25)' : 'rgba(148,163,184,0.15)'}`,
                                padding: '2px 7px',
                                borderRadius: '2px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                              }}
                            >
                              <Tag size={8} aria-hidden="true" />
                              {tag.toUpperCase()}
                            </span>
                          ))}
                          {item.date_published && (
                            <span
                              className="tabular-nums"
                              style={{
                                fontSize: '0.65rem',
                                color: 'var(--text-muted)',
                                letterSpacing: '1px',
                                fontFamily: 'var(--cinzel-font)',
                                opacity: 0.8,
                              }}
                            >
                              {formatAbyssalUtcDate(item.date_published)}
                            </span>
                          )}
                        </div>
                        <h3
                          style={{
                            margin: '0 0 0.8rem',
                            fontFamily: 'var(--cinzel-font)',
                            fontSize: 'clamp(0.85rem, 2vw, 1rem)',
                            color: 'var(--text-main)',
                            letterSpacing: '2px',
                            lineHeight: 1.4,
                          }}
                        >
                          {sanitizeAbyssalText(item.title)}
                        </h3>
                        <p
                          className="prose-grimoire"
                          style={{
                            margin: '0 0 1rem',
                            color: 'var(--text-muted)',
                            fontSize: '0.9rem',
                            lineHeight: 1.8,
                          }}
                        >
                          {item.summary
                            ? sanitizeAbyssalText(item.summary)
                            : 'Sin resumen disponible para esta transmisión.'}
                        </p>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-secondary"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.45rem',
                            fontSize: '0.64rem',
                            padding: '0.45rem 1rem',
                            borderColor: 'rgba(196,30,58,0.4)',
                            color: 'var(--primary)',
                          }}
                        >
                          <ExternalLink size={12} aria-hidden="true" />
                          LEER TRANSMISIÓN COMPLETA EN RSI
                        </a>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        style={{ textAlign: 'center', marginTop: '3rem', opacity: 0.45 }}
      >
        <div style={{ height: '1px', background: 'linear-gradient(to right, transparent, var(--secondary), transparent)', marginBottom: '1.5rem' }} />
        <span style={{ fontFamily: 'var(--cinzel-font)', fontSize: '0.75rem', letterSpacing: '5px', color: 'var(--secondary)', display: 'inline-flex', alignItems: 'center', gap: '0.6rem' }}>
          ☩ IN NOMINI OBLIVIONIS <DragonIcon size={20} /> IN NOMINI OBLIVIONIS ☩
        </span>
      </motion.div>
        </>
      )}
    </div>
  );
};

export default Lore;

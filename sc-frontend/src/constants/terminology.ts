export interface TermEntry {
  readonly sacred: string;
  readonly tactical: string;
  readonly description?: string;
  readonly path?: string;
}

export const TERMINOLOGY = {
  inicio: {
    sacred: 'EL UMBRAL / INICIO',
    tactical: 'Portada & Resumen de la Org',
    path: '/',
  },
  hermandad: {
    sacred: 'LA HERMANDAD',
    tactical: 'Miembros, Rangos & Flota de la Org',
    path: '/hermandad',
  },
  edictos: {
    sacred: 'EDICTOS SAGRADOS',
    tactical: 'Operaciones, Objetivos & Calendario',
    path: '/edictos',
  },
  designios: {
    sacred: 'Designios de la Flota',
    tactical: 'Objetivos y Tareas Asignables',
    path: '/edictos?tab=designios',
  },
  cruzadas: {
    sacred: 'Edictos de Cruzada',
    tactical: 'Misiones / Eventos de Escuadra',
    path: '/edictos?tab=cruzadas',
  },
  calendario: {
    sacred: 'Calendario Abisal',
    tactical: 'Agenda de Eventos (+930 años / Hora Local)',
    path: '/edictos?tab=calendario',
  },
  conclave: {
    sacred: 'EL CÓNCLAVE',
    tactical: 'Votaciones de la Org',
    path: '/conclave',
  },
  veredictos: {
    sacred: 'Veredictos',
    tactical: 'Resultados Oficiales de Votación',
    path: '/conclave?status=closed',
  },
  divinitatus: {
    sacred: 'LECTITIO DIVINITATUS',
    tactical: 'Historia (Lore) & Requisitos de Rango',
    path: '/divinitatus',
  },
  cronicas: {
    sacred: 'Crónicas Sagradas',
    tactical: 'Historia & Transmisiones RSI (+930 años)',
    path: '/divinitatus?tab=cronicas',
  },
  rituales: {
    sacred: 'Rituales de Ascenso',
    tactical: 'Requisitos & Progreso de Rangos',
    path: '/divinitatus?tab=rituales',
  },
  codice: {
    sacred: 'EL CÓDICE',
    tactical: 'Base de Datos del Juego',
    path: '/codice',
  },
  mandatos: {
    sacred: 'Mandatos Profanos',
    tactical: 'Misiones y Contratos In-Game',
    path: '/codice/mandatos',
  },
  ofrendas: {
    sacred: 'Ofrendas al Vacío',
    tactical: 'Recursos, Minería y Materiales',
    path: '/codice/ofrendas',
  },
  tecnomilagros: {
    sacred: 'Tecnomilagros',
    tactical: 'Blueprints y Recetas de Crafting',
    path: '/codice/tecnomilagros',
  },
  arcasEstelares: {
    sacred: 'Arcas Estelares',
    tactical: 'Naves, Precios aUEC y Blindaje',
    path: '/codice/arcas-estelares',
  },
  armamentos: {
    sacred: 'Armamentos',
    tactical: 'Armas de Nave y Penetración',
    path: '/codice/armamentos',
  },
  modulos: {
    sacred: 'Módulos',
    tactical: 'Componentes, Escudos y Motores Quantum',
    path: '/codice/modulos',
  },
  nexo: {
    sacred: 'NEXO ESTELAR',
    tactical: 'Mapa Interactivo de Sistemas',
    path: '/nexo',
  },
  datavelo: {
    sacred: 'DATAVELO',
    tactical: 'Hangar Ejecutivo, Wikelo, Alertas & Comercio',
    path: '/datavelo',
  },
  bovedas: {
    sacred: 'Bóvedas del Vacío',
    tactical: 'Ciclos & Mapas de Hangar Ejecutivo',
    path: '/datavelo?tab=bovedas',
  },
  wikelo: {
    sacred: 'El Estafador (Banu)',
    tactical: 'Mercado Negro & Trueque Wikelo',
    path: '/datavelo?tab=wikelo',
  },
  comunicaciones: {
    sacred: 'Ecos del Vacío',
    tactical: 'Estado de Servidores & Feed Comunitario',
    path: '/datavelo?tab=comunicaciones',
  },
  comercio: {
    sacred: 'Vías de Suministro',
    tactical: 'Calculadora de Rutas Comerciales SCU',
    path: '/datavelo?tab=comercio',
  },
  altar: {
    sacred: 'ALTAR DE FORJA',
    tactical: 'Calculadora de Materiales de Crafting',
    path: '/altar',
  },
  hermano: {
    sacred: 'EXPEDIENTE DEL HERMANO',
    tactical: 'Mi Perfil, Hangar de Naves & Progreso',
    path: '/hermano',
  },
  concilio: {
    sacred: 'CÁMARA DEL CONCILIO',
    tactical: 'Panel de Administración de la Org',
    path: '/concilio',
  },
  cruzarUmbral: {
    sacred: 'Cruzar el Umbral',
    tactical: 'Iniciar Sesión con Discord',
  },
  marcaDelAbismo: {
    sacred: 'Marca del Abismo',
    tactical: 'Logro / Condecoración Verificada',
    description: 'Distinción oficial verificada y grabada por el Concilio del Vacío.',
  },
  cenizaFria: {
    sacred: 'La Ceniza Fría',
    tactical: 'Solicitud Rechazada / Exilio de la Org',
    description: 'Estado de rechazo o expulsión de la Hermandad.',
  },
} as const satisfies Record<string, TermEntry>;

export type TerminologyKey = keyof typeof TERMINOLOGY;

export interface TacticalTooltipEntry {
  readonly id: string;
  readonly sacred: string;
  readonly tactical: string;
  readonly explanation: string;
}

export const TACTICAL_TOOLTIPS = {
  marca_del_abismo: {
    id: 'marca_del_abismo',
    sacred: 'Marca del Abismo',
    tactical: 'Logro / Condecoración Verificada',
    explanation:
      'Distinción oficial otorgada por el Concilio del Vacío o tras completar un Designio verificado.',
  },
  la_ceniza_fria: {
    id: 'la_ceniza_fria',
    sacred: 'La Ceniza Fría',
    tactical: 'Solicitud Rechazada / Exilio de la Org',
    explanation:
      'Rechazo de candidatura en el Umbral o expulsión/suspensión disciplinaria de la Hermandad.',
  },
  cruzar_el_umbral: {
    id: 'cruzar_el_umbral',
    sacred: 'Cruzar el Umbral',
    tactical: 'Iniciar Sesión con Discord',
    explanation:
      'Autenticación OAuth2 con Discord para solicitar ingreso o acceder a tu expediente.',
  },
  disolucion_en_el_vacio: {
    id: 'disolucion_en_el_vacio',
    sacred: 'Disolución en el Vacío',
    tactical: 'Baja en Combate / Operación Fallida',
    explanation:
      'Registro táctico de pérdida total o baja en combate durante una operación de escuadra.',
  },
  opsec_naval: {
    id: 'opsec_naval',
    sacred: 'Velo Naval (OPSEC)',
    tactical: 'Privacidad de Flota Individual',
    explanation:
      'Los visitantes públicos ven el resumen agregado de naves de la ORG; los propietarios y Discord solo son visibles para hermanos aprobados.',
  },
} as const satisfies Record<string, TacticalTooltipEntry>;

export type TacticalTooltipKey = keyof typeof TACTICAL_TOOLTIPS;

export type RankId =
  | 'candidato'
  | 'sombras'
  | 'iniciados'
  | 'portadores'
  | 'voces'
  | 'profetas'
  | 'heraldo';

export type TechnicalRoleKey = 'visitante' | 'neofito' | 'hermano' | 'oficial' | 'consejo' | 'admin';

export interface RankMeta {
  readonly id: RankId;
  readonly level: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  readonly roman: string;
  readonly name: string;
  readonly title: string;
  readonly archetype: string;
  readonly tacticalRole: string;
  readonly description: string;
  readonly color: string;
  readonly cssVar: string;
  readonly defaultRole: TechnicalRoleKey;
}

export const CANDIDATO_RANK_META: RankMeta = {
  id: 'candidato',
  level: 0,
  roman: '0',
  name: 'Candidato al Ritual de Iniciación',
  title: 'Candidato al Ritual de Iniciación',
  archetype: 'Alma en el Umbral',
  tacticalRole: 'Aspirante Pendiente de Aprobación',
  description: 'Aún no consagrado por el Concilio del Vacío. Observa desde el Umbral.',
  color: '#4b5563',
  cssVar: 'var(--rank-0)',
  defaultRole: 'neofito',
};

export const RANK_META: Record<RankId, RankMeta> = {
  candidato: CANDIDATO_RANK_META,
  sombras: {
    id: 'sombras',
    level: 1,
    roman: 'I',
    name: 'Sombras del Umbral',
    title: 'Sombras del Umbral',
    archetype: 'El Neófito Hambriento',
    tacticalRole: 'Miembro Nuevo (Rango I)',
    description: 'Observan más de lo que hablan. Sus primeras palabras nacen del asombro y la vigilia.',
    color: '#6b7280',
    cssVar: 'var(--rank-1)',
    defaultRole: 'hermano',
  },
  iniciados: {
    id: 'iniciados',
    level: 2,
    roman: 'II',
    name: 'Iniciados del Vacío',
    title: 'Iniciados del Vacío',
    archetype: 'El Converso',
    tacticalRole: 'Miembro Verificado (Rango II)',
    description: 'Han visto suficiente para creer, aunque todavía forjan su temple en la oscuridad.',
    color: '#8b0000',
    cssVar: 'var(--rank-2)',
    defaultRole: 'hermano',
  },
  portadores: {
    id: 'portadores',
    level: 3,
    roman: 'III',
    name: 'Portadores de Ceniza',
    title: 'Portadores de Ceniza',
    archetype: 'El Veterano Silencioso',
    tacticalRole: 'Veterano de Flota (Rango III)',
    description: 'Palabras escasas y precisas. Cada sentencia porta el peso de la ceniza de Pyro.',
    color: '#b8860b',
    cssVar: 'var(--rank-3)',
    defaultRole: 'hermano',
  },
  voces: {
    id: 'voces',
    level: 4,
    roman: 'IV',
    name: 'Voces del Abismo',
    title: 'Voces del Abismo',
    archetype: 'El Filósofo-Guerrero',
    tacticalRole: 'Oficial / Comandante de Escuadra (Rango IV)',
    description: 'Unen táctica y doctrina; comandan escuadras y proclaman edictos operativos.',
    color: '#c41e3a',
    cssVar: 'var(--rank-4)',
    defaultRole: 'oficial',
  },
  profetas: {
    id: 'profetas',
    level: 5,
    roman: 'V',
    name: 'Profetas de la Ruina',
    title: 'Profetas de la Ruina',
    archetype: 'El Estratega Oscuro',
    tacticalRole: 'Consejo / Moderador Org (Rango V)',
    description: 'Orquestan los hilos del Concilio y custodian el equilibrio interno de la Hermandad.',
    color: '#9b59b6',
    cssVar: 'var(--rank-5)',
    defaultRole: 'consejo',
  },
  heraldo: {
    id: 'heraldo',
    level: 6,
    roman: 'VI',
    name: 'Heraldo de Ancalagon',
    title: 'Heraldo de Ancalagon',
    archetype: 'La Voz del Dragón',
    tacticalRole: 'Líder Supremo / Admin Total (Rango VI)',
    description: 'La cúspide absoluta de la flota. Su voluntad define la doctrina y el destino del Grimoire.',
    color: '#d4af37',
    cssVar: 'var(--rank-6)',
    defaultRole: 'admin',
  },
};

export const ESCALA_RANKS: readonly RankMeta[] = [
  RANK_META.sombras,
  RANK_META.iniciados,
  RANK_META.portadores,
  RANK_META.voces,
  RANK_META.profetas,
  RANK_META.heraldo,
];

export function getRankMeta(rankIdOrLevel?: string | number | null): RankMeta {
  if (typeof rankIdOrLevel === 'number') {
    const byLevel = ESCALA_RANKS.find((r) => r.level === rankIdOrLevel);
    return byLevel ?? CANDIDATO_RANK_META;
  }
  if (!rankIdOrLevel || rankIdOrLevel === 'neofito' || rankIdOrLevel === 'candidato') {
    return CANDIDATO_RANK_META;
  }
  if (Object.prototype.hasOwnProperty.call(RANK_META, rankIdOrLevel)) {
    return RANK_META[rankIdOrLevel as RankId];
  }
  return CANDIDATO_RANK_META;
}

export interface TechnicalRoleMeta {
  readonly id: TechnicalRoleKey;
  readonly sacred: string;
  readonly tactical: string;
  readonly level: number;
  readonly color: string;
}

export const ROLE_META: Record<TechnicalRoleKey, TechnicalRoleMeta> = {
  visitante: {
    id: 'visitante',
    sacred: 'Ojo Profano',
    tactical: 'Visitante Público (Solo Lectura)',
    level: 0,
    color: '#64748b',
  },
  neofito: {
    id: 'neofito',
    sacred: 'Alma en el Umbral',
    tactical: 'Pendiente de Aprobación',
    level: 1,
    color: '#6b7280',
  },
  hermano: {
    id: 'hermano',
    sacred: 'Hermano Consagrado',
    tactical: 'Miembro Activo (Hangar, Votos, Cruzadas)',
    level: 2,
    color: '#b8860b',
  },
  oficial: {
    id: 'oficial',
    sacred: 'Voz Operativa',
    tactical: 'Oficial (Crea Cruzadas, Designios y Cónclaves)',
    level: 3,
    color: '#c41e3a',
  },
  consejo: {
    id: 'consejo',
    sacred: 'Profeta del Concilio',
    tactical: 'Consejo (Modera Org y Rangos I–IV)',
    level: 4,
    color: '#a855f7',
  },
  admin: {
    id: 'admin',
    sacred: 'Heraldo Soberano',
    tactical: 'Administrador Total (Todos los Rangos y Roles)',
    level: 5,
    color: '#d4af37',
  },
};

export const TECHNICAL_ROLES = ROLE_META;

export type ShipStatusKey = 'operativa' | 'en_forja' | 'reserva';

export interface ShipStatusMeta {
  readonly id: ShipStatusKey;
  readonly sacred: string;
  readonly tactical: string;
  readonly description: string;
  readonly color: string;
}

export const SHIP_STATUS_META: Record<ShipStatusKey, ShipStatusMeta> = {
  operativa: {
    id: 'operativa',
    sacred: 'Consagrada en Servicio',
    tactical: 'Operativa (Lista para Cruzadas)',
    description: 'Nave adquirida y lista para ser desplegada en Edictos de Cruzada.',
    color: 'var(--status-ok)',
  },
  en_forja: {
    id: 'en_forja',
    sacred: 'En Forja del Vacío',
    tactical: 'En Forja / Meta In-Game',
    description: 'Objetivo de adquisición en aUEC o Wikelo; aún no disponible para despliegue.',
    color: 'var(--status-warn)',
  },
  reserva: {
    id: 'reserva',
    sacred: 'En Bóveda Silente',
    tactical: 'En Reserva / Hangar Secundario',
    description: 'Nave retenida en reserva fuera de la rotación táctica activa.',
    color: 'var(--accent-silver)',
  },
};

export interface CrusadeCrewRole {
  readonly id: string;
  readonly label: string;
  readonly sacred: string;
  readonly tactical: string;
}

export const CRUSADE_CREW_ROLES: readonly CrusadeCrewRole[] = [
  {
    id: 'capitan_nave',
    label: 'Comandante / Piloto de Nave',
    sacred: 'Timonel del Abismo',
    tactical: 'Piloto principal al mando de un Arca Estelar',
  },
  {
    id: 'escolta_caza',
    label: 'Vanguardia de Ceniza (Escolta)',
    sacred: 'Vanguardia de Ceniza',
    tactical: 'Caza ligero/medio o escolta de superioridad espacial',
  },
  {
    id: 'artillero',
    label: 'Tripulante / Artillero de Torreta',
    sacred: 'Portador de Trueno',
    tactical: 'Artillero de torreta o estación de armas sin nave propia',
  },
  {
    id: 'infanteria',
    label: 'Infantería / Asalto y Abordaje',
    sacred: 'Filo del Vacío',
    tactical: 'Combate terrestre, FPS y abordaje de naves',
  },
  {
    id: 'ingeniero',
    label: 'Ingeniero / Reparación y Energía',
    sacred: 'Artífice de Forja',
    tactical: 'Control de daños, ingeniería y soporte de sistemas',
  },
  {
    id: 'medico',
    label: 'Médico de Combate / Rescate',
    sacred: 'Custodio de Sangre',
    tactical: 'Evacuación médica y reanimación en combate',
  },
  {
    id: 'logistica',
    label: 'Logística / Carga y Suministro',
    sacred: 'Portador de Ofrendas',
    tactical: 'Transporte de carga SCU, reabastecimiento y extracción',
  },
] as const;

export const HOME_SYSTEMS = ['Pyro', 'Nyx', 'Stanton', 'El Vacío'] as const;
export type CanonicalHomeSystem = (typeof HOME_SYSTEMS)[number];

export const PATH_LABELS: Record<string, TermEntry> = {
  '/': TERMINOLOGY.inicio,
  '/hermandad': TERMINOLOGY.hermandad,
  '/edictos': TERMINOLOGY.edictos,
  '/conclave': TERMINOLOGY.conclave,
  '/divinitatus': TERMINOLOGY.divinitatus,
  '/lore': TERMINOLOGY.cronicas,
  '/rituales': TERMINOLOGY.rituales,
  '/codice': TERMINOLOGY.codice,
  '/codice/mandatos': TERMINOLOGY.mandatos,
  '/missions': TERMINOLOGY.mandatos,
  '/codice/ofrendas': TERMINOLOGY.ofrendas,
  '/codice/tecnomilagros': TERMINOLOGY.tecnomilagros,
  '/codice/arcas-estelares': TERMINOLOGY.arcasEstelares,
  '/codice/armamentos': TERMINOLOGY.armamentos,
  '/codice/modulos': TERMINOLOGY.modulos,
  '/nexo': TERMINOLOGY.nexo,
  '/datavelo': TERMINOLOGY.datavelo,
  '/bovedas': TERMINOLOGY.bovedas,
  '/wikelo': TERMINOLOGY.wikelo,
  '/altar': TERMINOLOGY.altar,
  '/hermano': TERMINOLOGY.hermano,
  '/concilio': TERMINOLOGY.concilio,
};

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Calendar, ArrowUpDown, Scroll, Download, Loader2 } from 'lucide-react';
import html2pdf from 'html2pdf.js';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Chronicle {
    id: number;
    title: string;
    subtitle: string;
    date: string;           // "DD MMM YYYY" en formato SC (930a en el futuro)
    dateSort: number;       // timestamp para ordenamiento
    classification: string;
    icon: string;
    color: string;
    content: React.ReactNode;
}

// ─── Helper ───────────────────────────────────────────────────────────────────
const FragmentBlock: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
        {children}
    </div>
);

const Quote: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div style={{
        margin: '1.5rem 0',
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
    }}>
        {children}
    </div>
);

const FragmentHeader: React.FC<{ icon: string; title: string }> = ({ icon, title }) => (
    <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.7rem',
        margin: '2rem 0 1rem',
        paddingBottom: '0.5rem',
        borderBottom: '1px solid rgba(212,175,55,0.15)',
    }}>
        <span style={{ fontSize: '1.1rem' }}>{icon}</span>
        <h3 style={{
            margin: 0,
            fontFamily: 'var(--cinzel-font)',
            fontSize: '0.8rem',
            letterSpacing: '3px',
            color: 'var(--secondary)',
        }}>{title}</h3>
    </div>
);

const P: React.FC<{ children: React.ReactNode; muted?: boolean }> = ({ children, muted }) => (
    <p style={{
        color: muted ? 'var(--text-muted)' : 'var(--text-main)',
        fontSize: '1rem',
        lineHeight: 1.95,
        margin: '0.8rem 0',
    }}>{children}</p>
);

// ─── Chronicle data ───────────────────────────────────────────────────────────
const CHRONICLES: Chronicle[] = [
    {
        id: 1,
        title: 'CRÓNICA I',
        subtitle: 'LOS FRAGMENTOS DEL ORDEN',
        date: '14 Mar 2855',
        dateSort: new Date('2855-03-14').getTime(),
        classification: 'Registro Fundacional',
        icon: '☩',
        color: 'var(--primary)',
        content: (
            <>
                <P>
                    Mucho antes de que adoptaran el nombre de <strong style={{ color: 'var(--secondary)' }}>Ancalagon Oblivion Fleet</strong>, no eran más que fragmentos dispersos de la sociedad humana: ex empleados de megacorporaciones en el sistema Stanton, pilotos cuyos contratos habían sido cancelados sin explicación, y habitantes desplazados cuando el <em>United Empire of Earth (UEE)</em> decidió vender mundos enteros a los intereses privados, transformando cada planeta en un activo económico más que en un hogar.
                </P>
                <P muted>
                    En ese ambiente de mercantilización extrema, algunos no se resignaron a desaparecer. Mientras la mayoría aceptó su destino de trabajadores subcontratados o de sombras bajo el yugo corporativo, otros desaparecieron… y unos pocos <strong style={{ color: 'var(--primary)' }}>despertaron</strong>. Comenzaron a ver más allá de la ilusión de prosperidad que proyectaban las colonias corporativas: detectaron un patrón de explotación, de fragilidad en los cimientos del sistema, y una verdad que muchos preferían ignorar.
                </P>
                <P muted>
                    Se dieron cuenta de que Stanton, con sus cuatro mundos habitables y su aparente estabilidad, era solo una <strong style={{ color: 'var(--text-main)' }}>fachada</strong> —un microcosmos donde la ley existe solo en nombre, y la justicia depende de quién pague por ella. En las sombras de sus ciudades corporativas y en los límites de sus estaciones orbitales, esos individuos comenzaron a encontrarse, primero por necesidad de supervivencia y luego por <em style={{ color: 'var(--secondary)' }}>afinidad de pensamiento</em>.
                </P>
            </>
        ),
    },
    {
        id: 2,
        title: 'CRÓNICA II',
        subtitle: 'NACIMIENTO DE ANCALAGON',
        date: '01 Sep 2855',
        dateSort: new Date('2855-09-01').getTime(),
        classification: 'Registro Fundacional',
        icon: '🐉',
        color: 'var(--secondary)',
        content: (
            <>
                <P>
                    Dentro de la hermandad surgió un concepto, un principio que no podía ser ignorado: <strong style={{ color: 'var(--secondary)', fontSize: '1.1rem' }}>Ancalagon</strong>. No era un líder. No era un lugar. Era una <em>idea</em>. Una fuerza invisible que describe lo que ocurre cuando un sistema, una sociedad o una civilización alcanza su punto de quiebre.
                </P>
                <Quote>
                    "Ancalagon no fue fundado.<br />
                    <span style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}>Fue descubierto."</span>
                </Quote>
                <P muted>
                    No fue en Stanton donde Ancalagon fue "fundado", sino en las rutas que conectan mundos, en los pasajes olvidados entre sistemas, y en los vestigios de colonias fallidas dejadas atrás por la expansión humana. Fue en esas rutas profundas —entre mundos que nadie vigila— donde los primeros <strong style={{ color: 'var(--primary)' }}>Profetas del culto</strong> murmuraron la verdad.
                </P>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', margin: '1.5rem 0' }}>
                    {[
                        { icon: '🌑', title: 'El Quiebre', text: 'Todo sistema estable contiene las semillas de su propia destrucción. Ancalagon las estudia, las cultiva y las contempla.' },
                        { icon: '⚖', title: 'La Verdad Bajo la Grieta', text: 'La presión revela la naturaleza real de las estructuras. Lo que se muestra perfecto bajo la luz… se fractura en el vacío.' },
                        { icon: '🔭', title: 'El Despertar', text: 'No buscamos conquista ni dominio. Buscamos el momento en que las estructuras muestran sus grietas y exponen lo que realmente yace debajo.' },
                    ].map((d, i) => (
                        <div key={i} className="glass-card" style={{ textAlign: 'center', borderTop: '2px solid rgba(212,175,55,0.3)', padding: '1.2rem' }}>
                            <div style={{ fontSize: '2rem', marginBottom: '0.7rem' }}>{d.icon}</div>
                            <h3 style={{ color: 'var(--secondary)', fontSize: '0.75rem', letterSpacing: '3px', marginBottom: '0.7rem' }}>{d.title}</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.7, margin: 0 }}>{d.text}</p>
                        </div>
                    ))}
                </div>
            </>
        ),
    },
    {
        id: 3,
        title: 'CRÓNICA III',
        subtitle: 'LA FLOTA DEL OLVIDO',
        date: '19 Dec 2855',
        dateSort: new Date('2855-12-19').getTime(),
        classification: 'Registro Fundacional',
        icon: '⚙',
        color: '#60a5fa',
        content: (
            <>
                <P>
                    Esa verdad les enseñó que lo que ocurre en Stanton no es el fin de la historia, sino apenas el comienzo de un proceso universal: la <strong style={{ color: 'var(--secondary)' }}>transformación de sistemas</strong>, la erosión de estructuras de poder y la inevitable revelación de su verdadera naturaleza cuando se pone bajo suficiente presión.
                </P>
                <P muted>
                    Hoy, <strong style={{ color: 'var(--text-main)' }}>Ancalagon Oblivion Fleet</strong> opera entre los mundos industriales y corporativos de Stanton y los confines más caóticos del espacio civilizado. Sus miembros no buscan conquistar territorios ni reclamar dominio; su objetivo es entender y acelerar el momento en que las estructuras estables muestran sus grietas, exponiendo lo que realmente yace debajo.
                </P>
                <Quote>"El orden no colapsa cuando es atacado.<br /><span style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}>Colapsa cuando se ve obligado a revelar lo que teme."</span></Quote>
                <div style={{ textAlign: 'center', padding: '1rem 0 0' }}>
                    <span style={{ fontFamily: 'var(--cinzel-font)', fontSize: '0.8rem', letterSpacing: '4px', color: 'var(--secondary)', opacity: 0.7 }}>
                        🐉 IN NOMINI OBLIVIONIS 🐉
                    </span>
                </div>
            </>
        ),
    },
    {
        id: 4,
        title: 'CRÓNICA IV',
        subtitle: 'LOS ECOS BAJO ABERDEEN',
        date: '07 Apr 2956',
        dateSort: new Date('2956-04-07').getTime(),
        classification: 'Evento de Quiebre',
        icon: '🐉',
        color: 'var(--primary)',
        content: (
            <>
                <Quote>
                    "No toda verdad yace en los archivos.<br />
                    <span style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}>Algunas… deben ser arrancadas de donde el sistema esconde su vergüenza."</span>
                </Quote>

                <FragmentBlock>
                    <FragmentHeader icon="🌌" title="FRAGMENTO I — LA LLAMADA EN EL VACÍO" />
                    <P>
                        En las ruinas olvidadas de <strong style={{ color: 'var(--secondary)' }}>Morox</strong>, en el sistema Pyro —donde la civilización apenas logra fingir permanencia— un Heraldo de Ancalagon caminaba entre estructuras muertas, vestigios de intentos fallidos por imponer orden donde nunca debió existir.
                    </P>
                    <P muted>
                        Fue allí donde el silencio fue interrumpido. El <strong style={{ color: 'var(--primary)' }}>Profeta Denoxx</strong> habló. No con urgencia… sino con certeza incompleta. Rutas clandestinas. Intereses cruzados entre Crusader y Hurston. Movimiento en las sombras del comercio corporativo.
                    </P>
                    <P muted>El Heraldo no respondió con preguntas. Respondió con <em>movimiento</em>.</P>
                </FragmentBlock>

                <FragmentBlock>
                    <FragmentHeader icon="⚙️" title="FRAGMENTO II — LA FALLA DEL CONOCIMIENTO" />
                    <P muted>El operativo inició como tantos otros: observación, patrullaje, presión sobre rutas invisibles. Pero el Vacío no tardó en revelar la grieta.</P>
                    <P>
                        El <strong style={{ color: 'var(--primary)' }}>Profeta Denoxx</strong> y el <strong style={{ color: 'var(--primary)' }}>Vocero Afol</strong> lo comprendieron primero: la información estaba <em>incompleta</em>. Y en Ancalagon, operar sobre ilusiones… es condenarse a ceguera.
                    </P>
                    <P muted>El operativo fue cancelado. No como derrota. Sino como reconocimiento de una verdad mayor: el sistema había ocultado algo… deliberadamente.</P>
                </FragmentBlock>

                <FragmentBlock>
                    <FragmentHeader icon="🔭" title="FRAGMENTO III — EL SUSURRO DE VAUNGH" />
                    <P muted>El silencio posterior no fue vacío. Fue preparación.</P>
                    <P>
                        Desde <strong style={{ color: 'var(--secondary)' }}>Vaungh</strong>, en labores de espionaje profundo, el <strong style={{ color: 'var(--primary)' }}>Portador de la Ceniza Unknown</strong> observaba lo que otros ignoraban. Donde el sistema fragmenta la información, siempre quedan residuos. Y en esos residuos… encontró la grieta.
                    </P>
                    <P muted>Operativos paralelos. Datos retenidos. Agentes moviéndose fuera del espectro visible. La verdad no había desaparecido. Había sido <em>contenida</em>.</P>
                </FragmentBlock>

                <FragmentBlock>
                    <FragmentHeader icon="⚔️" title="FRAGMENTO IV — LA CAZA SIN ECO" />
                    <P>El <strong style={{ color: 'var(--primary)' }}>Profeta Denoxx</strong> y el Heraldo no reunieron flota. No convocaron fuerza. Eligieron <em>división</em>.</P>
                    <P muted>
                        Porque el sistema reacciona al ruido… pero es vulnerable al silencio fragmentado. Cada uno partió por su cuenta. Sin señal. Sin advertencia. Sin posibilidad de alerta.
                    </P>
                    <P muted>No era una persecución. Era una <strong style={{ color: 'var(--secondary)' }}>extracción de verdad</strong>. Y como todo sistema imperfecto… los agentes cayeron. No por fuerza. Sino por exposición.</P>
                </FragmentBlock>

                <FragmentBlock>
                    <FragmentHeader icon="🏛️" title="FRAGMENTO V — EL CORAZÓN DE LA CONTENCIÓN" />
                    <P muted>La información obtenida no conducía a rutas. Conducía a su <em>origen</em>.</P>
                    <Quote>
                        <strong style={{ fontSize: '1.2rem', letterSpacing: '4px' }}>ABERDEEN</strong><br />
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Una prisión de máxima seguridad. No diseñada para castigar… sino para ocultar.</span>
                    </Quote>
                    <P muted>Porque cuando el orden no puede eliminar una verdad… la <em>encierra</em>.</P>
                </FragmentBlock>

                <FragmentBlock>
                    <FragmentHeader icon="🕯️" title="FRAGMENTO VI — LA INFILTRACIÓN" />
                    <P>La decisión no fue debatida. Fue comprendida.</P>
                    <div className="responsive-grid-3" style={{ margin: '1rem 0' }}>
                        {['El Heraldo', 'El Profeta Denoxx', 'El Profeta Longhinus'].map((v, i) => (
                            <div key={i} style={{
                                textAlign: 'center',
                                padding: '0.8rem',
                                background: 'rgba(196,30,58,0.08)',
                                border: '1px solid rgba(196,30,58,0.25)',
                                borderRadius: '4px',
                                fontFamily: 'var(--cinzel-font)',
                                fontSize: '0.75rem',
                                color: 'var(--primary)',
                                letterSpacing: '1px',
                            }}>{v}</div>
                        ))}
                    </div>
                    <P muted>Tres vectores del Vacío entrando en el corazón del control. No como invasores. Sino como <em>anomalías</em>. La prisión no cayó. No era necesario. Porque Ancalagon no destruye estructuras… las obliga a revelarse.</P>
                </FragmentBlock>

                <FragmentBlock>
                    <FragmentHeader icon="🌑" title="FRAGMENTO VII — EL QUIEBRE" />
                    <P>Aberdeen no falló en su función. Falló en su <em>propósito</em>.</P>
                    <P muted>Porque en su intento de contener información… confirmó su existencia. Y en ese momento, la prisión dejó de ser un muro y se convirtió en <strong style={{ color: 'var(--secondary)' }}>evidencia</strong>.</P>
                    <P muted>El sistema mostró su grieta. No en la fuga. No en la violencia. Sino en la <em>necesidad de esconder</em>.</P>
                </FragmentBlock>

                <FragmentBlock>
                    <Quote>
                        "El orden no colapsa cuando es atacado.<br />
                        <span style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}>Colapsa cuando se ve obligado a revelar lo que teme."</span>
                    </Quote>
                    <div style={{ textAlign: 'center', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(212,175,55,0.15)' }}>
                        <span style={{ fontFamily: 'var(--cinzel-font)', fontSize: '0.75rem', letterSpacing: '4px', color: 'var(--secondary)', opacity: 0.8 }}>
                            IN NOMINI OBLIVIONIS 🐉
                        </span>
                    </div>
                </FragmentBlock>
            </>
        ),
    },
];

// ─── Accordion Item ───────────────────────────────────────────────────────────
const ChronicleCard: React.FC<{ chronicle: Chronicle; index: number }> = ({ chronicle, index }) => {
    const [open, setOpen] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    const downloadPDF = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const element = document.getElementById(`chronicle-export-${chronicle.id}`);
        if (!element) return;

        setIsGeneratingPdf(true);
        try {
            const opt = {
                margin: [10, 0, 10, 0], // top, left, bottom, right
                filename: `Ancalagon_Cronica_${chronicle.id}.pdf`,
                image: { type: 'jpeg', quality: 1 },
                html2canvas: { 
                    backgroundColor: '#0a0505',
                    scale: 2,
                    useCORS: true,
                    logging: false,
                },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                pagebreak: { mode: ['css', 'legacy'] }
            };

            // @ts-ignore - html2pdf no cuenta con tipos out of the box aquí, pero expone el default
            await html2pdf().set(opt).from(element).save();

        } catch (error) {
            console.error('Error generando PDF:', error);
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.07, duration: 0.5, ease: 'easeOut' }}
            style={{
                borderRadius: '4px',
                overflow: 'hidden',
                border: `1px solid rgba(255,255,255,0.06)`,
                borderLeft: `4px solid ${chronicle.color}`,
                background: open ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.015)',
                transition: 'background 0.3s ease',
            }}
        >
            {/* ── Header (click to toggle) ── */}
            <button
                onClick={() => setOpen(v => !v)}
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
                {/* Icon */}
                <span style={{ fontSize: '1.4rem', minWidth: '2rem', textAlign: 'center', filter: open ? 'drop-shadow(0 0 8px rgba(212,175,55,0.5))' : 'none', transition: 'filter 0.3s' }}>
                    {chronicle.icon}
                </span>

                {/* Title block */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
                        <span style={{
                            fontFamily: 'var(--cinzel-font)',
                            fontSize: '0.65rem',
                            letterSpacing: '3px',
                            color: chronicle.color,
                            fontWeight: 700,
                        }}>{chronicle.title}</span>
                        <span style={{
                            background: 'rgba(212,175,55,0.08)',
                            border: '1px solid rgba(212,175,55,0.2)',
                            color: 'var(--secondary)',
                            fontSize: '0.6rem',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '2px',
                            fontFamily: 'var(--cinzel-font)',
                            letterSpacing: '1px',
                        }}>{chronicle.classification}</span>
                    </div>
                    <div style={{
                        fontFamily: 'var(--cinzel-font)',
                        fontSize: '1rem',
                        fontWeight: 700,
                        color: 'var(--text-main)',
                        letterSpacing: '2px',
                        marginBottom: '0.4rem',
                    }}>{chronicle.subtitle}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        <Calendar size={12} />
                        <span style={{ fontFamily: 'var(--cinzel-font)', letterSpacing: '1px' }}>{chronicle.date}</span>
                    </div>
                </div>

                {/* Chevron */}
                <motion.div
                    animate={{ rotate: open ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                    style={{ color: 'var(--secondary)', flexShrink: 0 }}
                >
                    <ChevronDown size={20} />
                </motion.div>
            </button>

            {/* ── Content ── */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        key="content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.4, ease: 'easeInOut' }}
                        style={{ overflow: 'hidden' }}
                    >
                        {/* Área capturada por el PDF */}
                        <div id={`chronicle-export-${chronicle.id}`} style={{
                            padding: '2rem 2.5rem',
                            borderTop: '1px solid rgba(255,255,255,0.05)',
                            background: '#0a0505', // Fondo nativo
                        }}>
                            {/* Cabecera del PDF: Visible en la app también como introducción limpia */}
                            <div style={{ textAlign: 'center', marginBottom: '2.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(212,175,55,0.1)' }}>
                                <span style={{ fontSize: '2.5rem', filter: 'drop-shadow(0 0 10px rgba(212,175,55,0.3))' }}>{chronicle.icon}</span>
                                <h3 style={{ fontFamily: 'var(--cinzel-font)', fontSize: '1.2rem', color: chronicle.color, letterSpacing: '5px', marginTop: '1rem', marginBottom: '0.5rem' }}>{chronicle.title}</h3>
                                <p style={{ fontFamily: 'var(--cinzel-font)', fontSize: '1.4rem', color: 'var(--text-main)', letterSpacing: '3px', margin: 0, fontWeight: 700 }}>{chronicle.subtitle}</p>
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.6rem', color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '1rem' }}>
                                    <Calendar size={14} style={{ color: 'var(--secondary)' }}/>
                                    <span style={{ fontFamily: 'var(--cinzel-font)', letterSpacing: '2px' }}>{chronicle.date} | RESTRICCIÓN: NULA</span>
                                </div>
                            </div>

                            {/* Contenido Core */}
                            <div style={{ padding: '0 0.5rem' }}>
                                {chronicle.content}
                            </div>
                        </div>

                        {/* Botón de Extraer PDF (Excluido de la captura intencionalmente) */}
                        <div style={{ padding: '1.5rem', textAlign: 'center', background: 'rgba(255,255,255,0.015)' }}>
                            <button
                                onClick={downloadPDF}
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
                                    transition: 'all 0.3s'
                                }}
                            >
                                {isGeneratingPdf ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                                <span style={{ fontFamily: 'var(--cinzel-font)', letterSpacing: '3px', fontSize: '0.75rem', fontWeight: 600 }}>
                                    {isGeneratingPdf ? 'EXTRAYENDO DATOS...' : 'DESCARGAR ARCHIVO PDF'}
                                </span>
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

// ─── Main page ────────────────────────────────────────────────────────────────
const Lore: React.FC = () => {
    const [sortDesc, setSortDesc] = useState(false);   // false = cronológico (asc)

    useEffect(() => {
        document.title = 'Star Grimoire | Crónicas de Ancalagon Oblivion Fleet';
    }, []);

    const sorted = useMemo(() =>
        [...CHRONICLES].sort((a, b) =>
            sortDesc ? b.dateSort - a.dateSort : a.dateSort - b.dateSort
        ),
        [sortDesc]
    );

    return (
        <div style={{ padding: '0 2rem 4rem', maxWidth: '900px', margin: '0 auto' }}>

            {/* ── Hero ── */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
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
                <div style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(196,30,58,0.15) 0%, transparent 70%)',
                    pointerEvents: 'none'
                }} />
                <div style={{ fontSize: '4rem', marginBottom: '1rem', filter: 'drop-shadow(0 0 20px rgba(196,30,58,0.6))' }}>🐉</div>
                <h1 style={{
                    fontFamily: 'var(--cinzel-font)',
                    fontSize: 'clamp(1.8rem, 5vw, 3rem)',
                    fontWeight: 900,
                    letterSpacing: '8px',
                    color: 'var(--secondary)',
                    textShadow: '0 0 30px rgba(212,175,55,0.4), 2px 2px 10px rgba(0,0,0,0.9)',
                    marginBottom: '1.5rem',
                    lineHeight: 1.2,
                }}>
                    ANCALAGON<br />
                    <span style={{ fontSize: '60%', letterSpacing: '12px', color: 'var(--text-main)', opacity: 0.8 }}>OBLIVION FLEET</span>
                </h1>
                <p style={{
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
                }}>
                    "Donde termina el orden… comenzamos nosotros."
                </p>
            </motion.div>

            {/* ── Controls ── */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem',
                flexWrap: 'wrap',
                gap: '1rem',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <Scroll size={14} style={{ color: 'var(--secondary)' }} />
                    <span style={{ fontFamily: 'var(--cinzel-font)', fontSize: '0.7rem', letterSpacing: '3px', color: 'var(--secondary)' }}>
                        {CHRONICLES.length} CRÓNICAS EN EL GRIMOIRE
                    </span>
                </div>
                <button
                    onClick={() => setSortDesc(v => !v)}
                    className="filter-btn active"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.7rem' }}
                >
                    <ArrowUpDown size={13} />
                    {sortDesc ? 'MÁS RECIENTES PRIMERO' : 'MÁS ANTIGUAS PRIMERO'}
                </button>
            </div>

            {/* ── Chronicles list ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {sorted.map((chronicle, idx) => (
                    <ChronicleCard key={chronicle.id} chronicle={chronicle} index={idx} />
                ))}
            </div>

            {/* ── Footer seal ── */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                style={{ textAlign: 'center', marginTop: '3rem', opacity: 0.4 }}
            >
                <div style={{ height: '1px', background: 'linear-gradient(to right, transparent, var(--secondary), transparent)', marginBottom: '1.5rem' }} />
                <span style={{ fontFamily: 'var(--cinzel-font)', fontSize: '0.75rem', letterSpacing: '5px', color: 'var(--secondary)' }}>
                    ☩ IN NOMINI OBLIVIONIS ☩
                </span>
            </motion.div>

        </div>
    );
};

export default Lore;
